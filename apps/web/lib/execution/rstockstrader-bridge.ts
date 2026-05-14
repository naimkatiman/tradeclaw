/**
 * R StocksTrader (RoboForex) REST bridge — HTTP implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token in Authorization header on every request.
 * Venue: RSTOCKSTRADER_BASE_URL (set to the API base URL from the RoboForex
 *        operator dashboard — verify exact path and version before deploying).
 *
 * Dry-run guard: every WRITE method checks EXECUTION_MODE. Reads always hit
 * the network so account/instrument data is available even in disabled mode.
 *
 * Rate limiter: token bucket, default 10 req/sec (verify against API tab).
 * Instrument specs are cached in-process for 1 h to amortise round-trips.
 *
 * Endpoint assumptions (verify each against the live /instruments and /account
 * responses on the operator dashboard before running in demo mode):
 *   GET  {base}/accounts/{accountId}            → account info
 *   GET  {base}/instruments/{symbol}            → instrument spec
 *   POST {base}/orders                          → place order (bracket)
 *   DELETE {base}/orders/{orderId}              → cancel order
 *   GET  {base}/positions                       → open positions
 *   DELETE {base}/positions/{positionId}        → close position at market
 *
 * Field names on the wire are provisional — adjust constants at the top of
 * each helper when the live response differs from the assumption. The bridge
 * surfaces failures as non-throwing `status='rejected'` results so the
 * executor can log them without crashing the tick.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Re-export interfaces so executor.ts can import from one place ──────────

export type { RStocksTraderAssetClass };

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  contractSize: number;
  minStopDistance: number;
  digits: number;
}

export interface RStocksTraderAccountInfo {
  accountId: string;
  currency: string;
  balance: number;
  equity: number;
  marginUsed: number;
  marginFree: number;
}

export type RStocksTraderOrderType = 'MARKET' | 'LIMIT' | 'STOP_ENTRY';

export interface RStocksTraderPlaceInput {
  symbol: string;
  side: OrderSide;
  type: RStocksTraderOrderType;
  qty: number;
  triggerPrice?: number;
  stopLoss: number;
  takeProfit: number;
  clientRef: string;
  comment?: string;
}

export interface RStocksTraderPlaceResult {
  brokerOrderId: string;
  clientRef: string;
  status: 'pending' | 'filled' | 'partially_filled' | 'rejected';
  filledQty?: number;
  avgFillPrice?: number;
  rejectReason?: string;
}

export interface RStocksTraderPosition {
  positionId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  openPrice: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface RStocksTraderEnv {
  baseUrl: string;
  token: string;
  accountId: string;
}

// ─── Internal config ────────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;

// Token-bucket rate limiter: max N tokens, refills 1 token per interval.
// Default: 10 req/sec. Verify against the API tab on the operator dashboard.
const RATE_LIMIT_RPS = 10;
const RATE_INTERVAL_MS = 1000 / RATE_LIMIT_RPS;  // 100 ms between requests

// In-process instrument spec cache: symbol → {spec, expiresAt}
const specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
const SPEC_CACHE_TTL_MS = 60 * 60_000; // 1 h

// Simple serial request queue so we never exceed the rate limit regardless of
// concurrency. A more sophisticated bucket could allow bursting up to the
// token limit; for Phase 2 the serialised approach is safe enough.
let lastRequestAt = 0;

function getMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, symbol?: string): boolean {
  if (getMode() === 'disabled') {
    const safe = symbol ? { symbol } : {};
    console.log(`[rst] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(safe));
    return false;
  }
  return true;
}

// ─── HTTP plumbing ───────────────────────────────────────────────────────────

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = RATE_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function req<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  await throttle();
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(path, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`RST non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    const msg = err?.message ?? err?.error ?? text.slice(0, 200);
    throw new RStocksTraderApiError(res.status, msg, path);
  }

  return json as T;
}

export class RStocksTraderApiError extends Error {
  readonly statusCode: number;
  readonly path: string;
  constructor(statusCode: number, msg: string, path: string) {
    super(`[rst ${statusCode}] ${msg} (${path})`);
    this.statusCode = statusCode;
    this.path = path;
  }
}

// ─── Bridge implementation ───────────────────────────────────────────────────

/**
 * Reads account info from `GET /accounts/{accountId}`.
 *
 * Wire-field mapping (verify against live response):
 *   id          → accountId
 *   currency    → currency
 *   balance     → balance
 *   equity      → equity
 *   margin      → marginUsed
 *   freeMargin  → marginFree
 */
async function getAccountInfo(env: RStocksTraderEnv): Promise<RStocksTraderAccountInfo> {
  const url = `${env.baseUrl}/accounts/${env.accountId}`;
  const raw = await req<Record<string, unknown>>('GET', url, env.token);
  return {
    accountId: String(raw.id ?? raw.accountId ?? env.accountId),
    currency: String(raw.currency ?? 'USD'),
    balance: Number(raw.balance ?? 0),
    equity: Number(raw.equity ?? raw.balance ?? 0),
    marginUsed: Number(raw.margin ?? raw.marginUsed ?? raw.usedMargin ?? 0),
    marginFree: Number(raw.freeMargin ?? raw.marginFree ?? raw.availableMargin ?? 0),
  };
}

/**
 * Reads instrument spec from `GET /instruments/{symbol}`.
 * Cached for 1 h — a process restart clears the cache.
 *
 * Wire-field mapping (verify against live /instruments response):
 *   symbol              → symbol
 *   type / category     → assetClass (mapped via classifyAssetClass)
 *   minVolume / min_qty → minQty
 *   volumeStep / qty_step → qtyStep
 *   tickSize / tick_size  → tickSize
 *   contractSize / lot_size → contractSize
 *   stopsLevel / min_stop_distance → minStopDistance (in price units)
 *   digits              → digits
 */
async function getInstrumentSpec(env: RStocksTraderEnv, symbol: string): Promise<RStocksTraderInstrumentSpec> {
  const cached = specCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.spec;

  const url = `${env.baseUrl}/instruments/${encodeURIComponent(symbol)}`;
  const raw = await req<Record<string, unknown>>('GET', url, env.token);

  const spec: RStocksTraderInstrumentSpec = {
    symbol,
    assetClass: classifyAssetClass(raw),
    minQty: Number(raw.minVolume ?? raw.min_qty ?? raw.minQty ?? 0.01),
    qtyStep: Number(raw.volumeStep ?? raw.qty_step ?? raw.qtyStep ?? 0.01),
    tickSize: Number(raw.tickSize ?? raw.tick_size ?? 0.00001),
    contractSize: Number(raw.contractSize ?? raw.lot_size ?? raw.contract_size ?? 100_000),
    minStopDistance: Number(raw.stopsLevel ?? raw.min_stop_distance ?? raw.minStopDistance ?? 0),
    digits: Number(raw.digits ?? 5),
  };

  specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
  return spec;
}

function classifyAssetClass(raw: Record<string, unknown>): RStocksTraderAssetClass {
  const type = String(raw.type ?? raw.category ?? raw.assetClass ?? '').toLowerCase();
  if (type.includes('crypto')) return 'crypto-cfd';
  if (type.includes('fx') || type.includes('forex') || type.includes('currency')) return 'fx';
  if (type.includes('metal') || type.includes('gold') || type.includes('silver')) return 'metal';
  if (type.includes('energy') || type.includes('oil') || type.includes('gas')) return 'energy-cfd';
  if (type.includes('etf')) return 'us-etf';
  if (type.includes('stock') || type.includes('equity') || type.includes('share')) return 'us-stock';
  if (type.includes('index') || type.includes('indices')) return 'index-cfd';
  return 'us-stock';
}

/**
 * Place a bracket order (market entry + attached SL + TP) via `POST /orders`.
 *
 * Wire body (verify field names against API tab):
 *   {
 *     accountId, symbol, type: 'MARKET', side: 'BUY'|'SELL',
 *     volume, stopLoss, takeProfit, clientRef, comment
 *   }
 *
 * Expected response shape:
 *   { id, clientRef, status, filledVolume, avgPrice, rejectReason }
 *
 * Network/5xx errors propagate as thrown RStocksTraderApiError.
 * Broker-side rejections come back as status='rejected' with rejectReason.
 */
async function placeOrder(env: RStocksTraderEnv, input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
  if (!ensureWriteAllowed('placeOrder', input.symbol)) {
    return { brokerOrderId: 'dry-run', clientRef: input.clientRef, status: 'pending' };
  }

  const url = `${env.baseUrl}/orders`;
  const body: Record<string, unknown> = {
    accountId: env.accountId,
    symbol: input.symbol,
    // R StocksTrader order type names — verify against API tab:
    //   MARKET → 'MARKET' or 'market'
    //   STOP_ENTRY → 'STOP' or 'stop_entry' (for above/below trigger)
    type: input.type === 'STOP_ENTRY' ? 'STOP' : input.type,
    side: input.side,
    volume: input.qty,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    clientRef: input.clientRef,
  };
  if (input.triggerPrice !== undefined) body.price = input.triggerPrice;
  if (input.comment) body.comment = input.comment;

  let raw: Record<string, unknown>;
  try {
    raw = await req<Record<string, unknown>>('POST', url, env.token, body);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.statusCode >= 400 && err.statusCode < 500) {
      // 4xx = broker rejected — surface as non-throwing result
      return {
        brokerOrderId: '',
        clientRef: input.clientRef,
        status: 'rejected',
        rejectReason: err.message,
      };
    }
    throw err;
  }

  const status = mapBrokerStatus(String(raw.status ?? 'pending'));
  return {
    brokerOrderId: String(raw.id ?? raw.orderId ?? ''),
    clientRef: String(raw.clientRef ?? raw.client_ref ?? input.clientRef),
    status,
    filledQty: raw.filledVolume !== undefined ? Number(raw.filledVolume) : undefined,
    avgFillPrice: raw.avgPrice !== undefined ? Number(raw.avgPrice) : undefined,
    rejectReason: status === 'rejected' ? String(raw.rejectReason ?? raw.reject_reason ?? '') : undefined,
  };
}

function mapBrokerStatus(s: string): RStocksTraderPlaceResult['status'] {
  const lc = s.toLowerCase();
  if (lc === 'filled' || lc === 'executed') return 'filled';
  if (lc === 'partially_filled' || lc === 'partial') return 'partially_filled';
  if (lc === 'rejected' || lc === 'error') return 'rejected';
  return 'pending';
}

/**
 * Cancel a pending entry order via `DELETE /orders/{orderId}`.
 * Idempotent: 404 is swallowed.
 */
async function cancelOrder(env: RStocksTraderEnv, brokerOrderId: string): Promise<void> {
  if (!ensureWriteAllowed('cancelOrder')) return;
  try {
    await req('DELETE', `${env.baseUrl}/orders/${encodeURIComponent(brokerOrderId)}`, env.token);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.statusCode === 404) return;
    throw err;
  }
}

/**
 * List open positions via `GET /positions?accountId={accountId}`.
 *
 * Wire-field mapping (verify):
 *   id / positionId  → positionId
 *   symbol           → symbol
 *   side / type      → side ('BUY'|'SELL')
 *   volume           → qty
 *   openPrice        → openPrice
 *   pnl / profit     → unrealizedPnl
 *   sl / stopLoss    → stopLoss
 *   tp / takeProfit  → takeProfit
 */
async function listOpenPositions(env: RStocksTraderEnv): Promise<RStocksTraderPosition[]> {
  const url = `${env.baseUrl}/positions?accountId=${encodeURIComponent(env.accountId)}`;
  const raw = await req<unknown[]>('GET', url, env.token);
  return raw.map((p) => {
    const r = p as Record<string, unknown>;
    const rawSide = String(r.side ?? r.type ?? 'BUY').toUpperCase();
    return {
      positionId: String(r.id ?? r.positionId ?? ''),
      symbol: String(r.symbol ?? ''),
      side: (rawSide === 'BUY' || rawSide === 'LONG' ? 'BUY' : 'SELL') as OrderSide,
      qty: Number(r.volume ?? r.qty ?? 0),
      openPrice: Number(r.openPrice ?? r.open_price ?? 0),
      unrealizedPnl: Number(r.pnl ?? r.profit ?? r.unrealizedPnl ?? 0),
      stopLoss: r.sl !== undefined || r.stopLoss !== undefined
        ? Number(r.sl ?? r.stopLoss)
        : null,
      takeProfit: r.tp !== undefined || r.takeProfit !== undefined
        ? Number(r.tp ?? r.takeProfit)
        : null,
    };
  });
}

/**
 * Close an open position at market via `DELETE /positions/{positionId}`.
 * Idempotent: 404 is swallowed.
 */
async function closePosition(env: RStocksTraderEnv, positionId: string): Promise<void> {
  if (!ensureWriteAllowed('closePosition')) return;
  try {
    await req('DELETE', `${env.baseUrl}/positions/${encodeURIComponent(positionId)}`, env.token);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.statusCode === 404) return;
    throw err;
  }
}

// ─── Public factory ──────────────────────────────────────────────────────────

export interface RStocksTraderBridge {
  getAccountInfo(): Promise<RStocksTraderAccountInfo>;
  getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec>;
  placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult>;
  cancelOrder(brokerOrderId: string): Promise<void>;
  listOpenPositions(): Promise<RStocksTraderPosition[]>;
  closePosition(positionId: string): Promise<void>;
}

/**
 * Create a bridge instance bound to the given env.
 * Throws at call-time (not module-load) if env is missing required fields,
 * matching binance-futures.ts behaviour.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  if (!env.baseUrl) throw new Error('RSTOCKSTRADER_BASE_URL not set');
  if (!env.token) throw new Error('RSTOCKSTRADER_TOKEN not set');
  if (!env.accountId) throw new Error('RSTOCKSTRADER_ACCOUNT_ID not set');

  // Normalise base URL: strip trailing slash
  const normalised: RStocksTraderEnv = {
    ...env,
    baseUrl: env.baseUrl.replace(/\/$/, ''),
  };

  return {
    getAccountInfo: () => getAccountInfo(normalised),
    getInstrumentSpec: (symbol) => getInstrumentSpec(normalised, symbol),
    placeOrder: (input) => placeOrder(normalised, input),
    cancelOrder: (id) => cancelOrder(normalised, id),
    listOpenPositions: () => listOpenPositions(normalised),
    closePosition: (id) => closePosition(normalised, id),
  };
}

/**
 * Read env vars in one place so executor dispatch doesn't need RoboForex specifics.
 *
 * Required env:
 *   RSTOCKSTRADER_BASE_URL    e.g. https://stockstrader.roboforex.com/api/v1
 *   RSTOCKSTRADER_TOKEN       Bearer token from the dashboard
 *   RSTOCKSTRADER_ACCOUNT_ID  Numeric demo account id
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
