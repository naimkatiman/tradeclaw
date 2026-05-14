/**
 * R StocksTrader (RoboForex) REST bridge — HTTP implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Endpoint paths are provisional — verify each against the operator
 * dashboard "API" tab before going live. The base URL, token, and
 * account ID come from env vars only; never hard-coded.
 *
 * Write methods are short-circuited to a dry-run log when
 * EXECUTION_MODE=disabled, matching binance-futures.ts behaviour.
 *
 * Rate limiting: simple token bucket at 10 req/sec (conservative;
 * raise after verifying broker limits from the API tab).
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types ────────────────────────────────────────────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /** Units per lot (FX: 100 000; XAUUSD: 100 oz; stocks: 1 share). */
  contractSize: number;
  /** Min distance in price units between market price and SL/TP. */
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

export interface RStocksTraderPlaceInput {
  symbol: string;
  side: OrderSide;
  /** 'MARKET' is the primary type for signal execution. */
  type: 'MARKET' | 'LIMIT' | 'STOP_ENTRY';
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

// ─── Internals ───────────────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;
const RATE_LIMIT_RPS = 10;   // tokens per second — verify against API docs

/** Minimal token-bucket that yields before any outbound request. */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private readonly rps: number) {
    this.tokens = rps;
    this.lastRefill = Date.now();
  }
  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.rps, this.tokens + elapsed * this.rps);
    this.lastRefill = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = ((1 - this.tokens) / this.rps) * 1000;
    await new Promise<void>((res) => setTimeout(res, waitMs));
    this.tokens = 0;
  }
}

const bucket = new TokenBucket(RATE_LIMIT_RPS);

/** In-process cache for instrument specs. Keyed by R StocksTrader symbol. */
const instrumentCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
const INSTRUMENT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 h

function getMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, symbol: string): boolean {
  const mode = getMode();
  if (mode === 'disabled') {
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled — symbol=${symbol}`);
    return false;
  }
  return true;
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  env: RStocksTraderEnv,
  body?: unknown,
): Promise<T> {
  await bucket.consume();

  const url = `${env.baseUrl.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${env.token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new RStocksTraderApiError(res.status, `non-JSON response: ${text.slice(0, 200)}`, path);
  }

  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    const msg = err?.message ?? err?.error ?? text.slice(0, 200);
    throw new RStocksTraderApiError(res.status, msg, path);
  }

  return json as T;
}

export class RStocksTraderApiError extends Error {
  readonly httpStatus: number;
  readonly path: string;
  constructor(httpStatus: number, msg: string, path: string) {
    super(`[rstockstrader ${httpStatus}] ${msg} (${path})`);
    this.httpStatus = httpStatus;
    this.path = path;
  }
}

// ─── Wire-format shapes (verify field names against operator API tab) ────────

/** Shape returned by GET /accounts/{id} — field names are provisional. */
interface WireAccountInfo {
  id?: string;
  accountId?: string;
  currency: string;
  balance: string | number;
  equity: string | number;
  margin?: string | number;
  freeMargin?: string | number;
  free_margin?: string | number;
  used_margin?: string | number;
}

/** Shape returned by GET /instruments/{symbol} — field names are provisional. */
interface WireInstrumentSpec {
  symbol: string;
  assetClass?: string;
  asset_class?: string;
  minQty?: string | number;
  min_qty?: string | number;
  qtyStep?: string | number;
  qty_step?: string | number;
  tickSize?: string | number;
  tick_size?: string | number;
  contractSize?: string | number;
  contract_size?: string | number;
  minStopDistance?: string | number;
  min_stop_distance?: string | number;
  digits?: number;
}

/** Shape returned by POST /accounts/{id}/orders — field names are provisional. */
interface WireOrderResult {
  id?: string;
  orderId?: string;
  order_id?: string;
  clientRef?: string;
  client_ref?: string;
  status?: string;
  filledQty?: string | number;
  filled_qty?: string | number;
  avgFillPrice?: string | number;
  avg_fill_price?: string | number;
  rejectReason?: string;
  reject_reason?: string;
  message?: string;
}

/** Shape returned by GET /accounts/{id}/positions — field names are provisional. */
interface WirePosition {
  id?: string;
  positionId?: string;
  position_id?: string;
  symbol: string;
  side?: string;
  type?: string;
  qty?: string | number;
  volume?: string | number;
  openPrice?: string | number;
  open_price?: string | number;
  unrealizedPnl?: string | number;
  unrealized_pnl?: string | number;
  stopLoss?: string | number;
  stop_loss?: string | number;
  takeProfit?: string | number;
  take_profit?: string | number;
}

// ─── Field normalisation helpers ─────────────────────────────────────────────

function n(v: string | number | undefined): number {
  return Number(v ?? 0);
}

function str(v: string | undefined): string {
  return v ?? '';
}

function normaliseAssetClass(raw: string | undefined): RStocksTraderAssetClass {
  const lc = (raw ?? '').toLowerCase().replace(/[^a-z]/g, '-');
  if (lc.includes('crypto')) return 'crypto-cfd';
  if (lc.includes('fx') || lc.includes('forex') || lc.includes('currency')) return 'fx';
  if (lc.includes('metal') || lc.includes('gold') || lc.includes('silver')) return 'metal';
  if (lc.includes('energy') || lc.includes('oil') || lc.includes('gas')) return 'energy-cfd';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('stock') || lc.includes('equity') || lc.includes('share')) return 'us-stock';
  if (lc.includes('index') || lc.includes('indice')) return 'index-cfd';
  return 'us-stock';
}

function normaliseSide(raw: string | undefined): OrderSide {
  return (raw ?? '').toUpperCase().startsWith('S') ? 'SELL' : 'BUY';
}

function normaliseStatus(raw: string | undefined): RStocksTraderPlaceResult['status'] {
  const lc = (raw ?? '').toLowerCase();
  if (lc === 'filled' || lc === 'executed' || lc === 'closed') return 'filled';
  if (lc === 'partially_filled' || lc === 'partial') return 'partially_filled';
  if (lc === 'rejected' || lc === 'error' || lc === 'cancelled') return 'rejected';
  return 'pending';
}

// ─── Public bridge functions ──────────────────────────────────────────────────

/**
 * Read account equity / balance / margin headroom.
 * Endpoint: GET /accounts/{accountId}  (verify path in operator dashboard)
 */
export async function getAccountInfo(env: RStocksTraderEnv): Promise<RStocksTraderAccountInfo> {
  const raw = await request<WireAccountInfo>('GET', `/accounts/${env.accountId}`, env);
  return {
    accountId: str(raw.id ?? raw.accountId ?? env.accountId),
    currency: raw.currency,
    balance: n(raw.balance),
    equity: n(raw.equity),
    marginUsed: n(raw.margin ?? raw.used_margin),
    marginFree: n(raw.freeMargin ?? raw.free_margin ?? raw.freeMargin),
  };
}

/**
 * Per-symbol trading rules. Cached in-process for 1 h.
 * Endpoint: GET /instruments/{symbol}  (verify path in operator dashboard)
 */
export async function getInstrumentSpec(
  env: RStocksTraderEnv,
  symbol: string,
): Promise<RStocksTraderInstrumentSpec> {
  const cached = instrumentCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.spec;

  const raw = await request<WireInstrumentSpec>('GET', `/instruments/${encodeURIComponent(symbol)}`, env);

  const spec: RStocksTraderInstrumentSpec = {
    symbol: raw.symbol,
    assetClass: normaliseAssetClass(raw.assetClass ?? raw.asset_class),
    minQty: n(raw.minQty ?? raw.min_qty),
    qtyStep: n(raw.qtyStep ?? raw.qty_step),
    tickSize: n(raw.tickSize ?? raw.tick_size),
    contractSize: n(raw.contractSize ?? raw.contract_size) || 1,
    minStopDistance: n(raw.minStopDistance ?? raw.min_stop_distance),
    digits: raw.digits ?? 5,
  };

  instrumentCache.set(symbol, { spec, expiresAt: Date.now() + INSTRUMENT_CACHE_TTL_MS });
  return spec;
}

/**
 * Place a bracket order (entry + attached SL + TP) in a single REST call.
 * Broker-side rejections surface as status='rejected'; only network/5xx errors throw.
 *
 * Endpoint: POST /accounts/{accountId}/orders  (verify path + body shape in operator dashboard)
 */
export async function placeOrder(
  env: RStocksTraderEnv,
  input: RStocksTraderPlaceInput,
): Promise<RStocksTraderPlaceResult> {
  if (!ensureWriteAllowed('placeOrder', input.symbol)) {
    return {
      brokerOrderId: `dry-run-${input.clientRef}`,
      clientRef: input.clientRef,
      status: 'pending',
    };
  }

  // Body field names are provisional — verify against operator dashboard.
  const body: Record<string, unknown> = {
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    qty: input.qty,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    clientRef: input.clientRef,
  };
  if (input.triggerPrice !== undefined) body.triggerPrice = input.triggerPrice;
  if (input.comment) body.comment = input.comment;

  let raw: WireOrderResult;
  try {
    raw = await request<WireOrderResult>('POST', `/accounts/${env.accountId}/orders`, env, body);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.httpStatus < 500) {
      // 4xx = broker rejected the order — surface as rejection, not throw.
      return {
        brokerOrderId: '',
        clientRef: input.clientRef,
        status: 'rejected',
        rejectReason: err.message,
      };
    }
    throw err;
  }

  return {
    brokerOrderId: str(raw.id ?? raw.orderId ?? raw.order_id),
    clientRef: str(raw.clientRef ?? raw.client_ref ?? input.clientRef),
    status: normaliseStatus(raw.status),
    filledQty: raw.filledQty !== undefined ? n(raw.filledQty) : raw.filled_qty !== undefined ? n(raw.filled_qty) : undefined,
    avgFillPrice: raw.avgFillPrice !== undefined ? n(raw.avgFillPrice) : raw.avg_fill_price !== undefined ? n(raw.avg_fill_price) : undefined,
    rejectReason: raw.rejectReason ?? raw.reject_reason,
  };
}

/**
 * Cancel a pending order. Idempotent: already-filled or unknown orders resolve without error.
 * Endpoint: DELETE /accounts/{accountId}/orders/{orderId}  (verify path in operator dashboard)
 */
export async function cancelOrder(env: RStocksTraderEnv, brokerOrderId: string): Promise<void> {
  if (!ensureWriteAllowed('cancelOrder', brokerOrderId)) return;
  try {
    await request<unknown>('DELETE', `/accounts/${env.accountId}/orders/${brokerOrderId}`, env);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && (err.httpStatus === 404 || err.httpStatus === 409)) return;
    throw err;
  }
}

/**
 * List currently open positions on the configured account.
 * Endpoint: GET /accounts/{accountId}/positions  (verify path in operator dashboard)
 */
export async function listOpenPositions(env: RStocksTraderEnv): Promise<RStocksTraderPosition[]> {
  const raw = await request<WirePosition[]>('GET', `/accounts/${env.accountId}/positions`, env);
  return raw.map((p) => ({
    positionId: str(p.id ?? p.positionId ?? p.position_id),
    symbol: p.symbol,
    side: normaliseSide(p.side ?? p.type),
    qty: n(p.qty ?? p.volume),
    openPrice: n(p.openPrice ?? p.open_price),
    unrealizedPnl: n(p.unrealizedPnl ?? p.unrealized_pnl),
    stopLoss: p.stopLoss != null ? n(p.stopLoss) : p.stop_loss != null ? n(p.stop_loss) : null,
    takeProfit: p.takeProfit != null ? n(p.takeProfit) : p.take_profit != null ? n(p.take_profit) : null,
  }));
}

/**
 * Close an open position at market.
 * Endpoint: POST /accounts/{accountId}/positions/{positionId}/close  (verify in operator dashboard)
 */
export async function closePosition(env: RStocksTraderEnv, positionId: string): Promise<void> {
  if (!ensureWriteAllowed('closePosition', positionId)) return;
  try {
    await request<unknown>('POST', `/accounts/${env.accountId}/positions/${positionId}/close`, env);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && (err.httpStatus === 404 || err.httpStatus === 409)) return;
    throw err;
  }
}

// ─── Env helpers ─────────────────────────────────────────────────────────────

/**
 * Read and validate env vars at call-site, not at module load.
 * Throws if any required var is missing — matches binance-futures.ts pattern.
 */
export function readRStocksTraderEnv(): RStocksTraderEnv {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl) throw new Error('RSTOCKSTRADER_BASE_URL not set');
  if (!token) throw new Error('RSTOCKSTRADER_TOKEN not set');
  if (!accountId) throw new Error('RSTOCKSTRADER_ACCOUNT_ID not set');
  return { baseUrl, token, accountId };
}

export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
