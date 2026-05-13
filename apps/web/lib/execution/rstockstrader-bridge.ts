/**
 * R StocksTrader (RoboForex) REST bridge — concrete implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * ⚠  VERIFY BEFORE FIRST LIVE USE:
 *   All endpoint paths, JSON field names, and the rate-limit ceiling are
 *   derived from typical broker REST API conventions. Cross-check every
 *   constant marked "VERIFY" against the operator's in-dashboard API tab
 *   before flipping EXECUTION_MODE=testnet.
 *
 * Auth: Authorization: Bearer {RSTOCKSTRADER_TOKEN} on every request.
 * Rate limit: token-bucket, default 10 req/s (VERIFY against dashboard).
 * Write guard: every mutating method checks EXECUTION_MODE !== 'disabled'.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Endpoint paths (VERIFY each against operator dashboard) ───────────────

/** VERIFY: exact path component after RSTOCKSTRADER_BASE_URL */
const ACCOUNTS_PATH = '/accounts';
/** VERIFY: instruments list and per-symbol detail path */
const INSTRUMENTS_PATH = '/instruments';
/** VERIFY: orders sub-path under /accounts/{id} */
const ORDERS_SUB = '/orders';
/** VERIFY: positions sub-path under /accounts/{id} */
const POSITIONS_SUB = '/positions';

// ─── Rate limiter (token bucket) ───────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {
    this.tokens = capacity;
    this.lastRefillMs = Date.now();
  }

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefillMs = now;

    if (this.tokens < 1) {
      const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSec) * 1000);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

/** Shared bucket — one per process. Capacity=10, refill=10/s → burst of 10. */
const globalBucket = new TokenBucket(
  /* capacity */ Number(process.env.RSTOCKSTRADER_RATE_LIMIT ?? 10),
  /* refillPerSec */ Number(process.env.RSTOCKSTRADER_RATE_LIMIT ?? 10),
);

// ─── Instrument spec cache (1h TTL) ────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const instrumentCache = new Map<string, CacheEntry<RStocksTraderInstrumentSpec>>();
const INSTRUMENT_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// ─── Public types ───────────────────────────────────────────────────────────

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

// ─── Bridge implementation ──────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 15_000;

function getMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, symbol?: string): boolean {
  const mode = getMode();
  if (mode === 'disabled') {
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, symbol ?? '');
    return false;
  }
  return true;
}

async function apiFetch<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  url: string,
  token: string,
  body?: unknown,
): Promise<T> {
  await globalBucket.consume();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

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
    throw new Error(`R StocksTrader non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    const msg = err?.message ?? err?.error ?? text;
    throw new RStocksTraderApiError(res.status, msg, url);
  }

  return json as T;
}

export class RStocksTraderApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly url: string,
  ) {
    super(`[rstockstrader ${statusCode}] ${message} (${url})`);
  }
}

// ─── Concrete bridge class ──────────────────────────────────────────────────

class RStocksTraderBridgeImpl {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly accountId: string;

  constructor(env: RStocksTraderEnv) {
    this.baseUrl = env.baseUrl.replace(/\/$/, '');
    this.token = env.token;
    this.accountId = env.accountId;
  }

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: exact path and response field names against operator dashboard.
    // Typical response: { id, currency, balance, equity, margin, freeMargin }
    const url = `${this.baseUrl}${ACCOUNTS_PATH}/${this.accountId}`;
    const raw = await apiFetch<Record<string, unknown>>('GET', url, this.token);
    return {
      accountId: String(raw.id ?? raw.accountId ?? this.accountId),
      currency: String(raw.currency ?? 'USD'),
      balance: Number(raw.balance ?? 0),
      equity: Number(raw.equity ?? 0),
      marginUsed: Number(raw.margin ?? raw.marginUsed ?? raw.usedMargin ?? 0),
      marginFree: Number(raw.freeMargin ?? raw.marginFree ?? raw.availableMargin ?? 0),
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = instrumentCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // VERIFY: exact path and response field names (e.g. lot_size, qty_step, tick_size).
    const url = `${this.baseUrl}${INSTRUMENTS_PATH}/${encodeURIComponent(symbol)}`;
    const raw = await apiFetch<Record<string, unknown>>('GET', url, this.token);

    const spec: RStocksTraderInstrumentSpec = {
      symbol,
      // VERIFY: assetClass derivation from instrument type field
      assetClass: deriveAssetClass(raw),
      minQty: Number(raw.min_qty ?? raw.minQty ?? raw.minLot ?? 0.01),
      qtyStep: Number(raw.qty_step ?? raw.qtyStep ?? raw.lotStep ?? 0.01),
      tickSize: Number(raw.tick_size ?? raw.tickSize ?? raw.pip ?? 0.00001),
      contractSize: Number(raw.contract_size ?? raw.contractSize ?? raw.lot_size ?? 1),
      minStopDistance: Number(raw.min_stop_distance ?? raw.minStopDistance ?? raw.stopsLevel ?? 0),
      digits: Number(raw.digits ?? 5),
    };

    instrumentCache.set(symbol, { value: spec, expiresAt: Date.now() + INSTRUMENT_CACHE_TTL_MS });
    return spec;
  }

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: exact request body field names (side, type, volume vs qty, sl, tp, comment).
    // R StocksTrader uses "volume" in some endpoints for lot size — adjust if needed.
    const url = `${this.baseUrl}${ACCOUNTS_PATH}/${this.accountId}${ORDERS_SUB}`;
    const body: Record<string, unknown> = {
      symbol: input.symbol,
      side: input.side,                // VERIFY: "BUY"/"SELL" vs "buy"/"sell"
      type: mapOrderType(input.type),  // VERIFY: exact order type string
      volume: input.qty,               // VERIFY: "volume" vs "qty" vs "quantity" vs "lots"
      stopLoss: input.stopLoss,        // VERIFY: "stopLoss" vs "sl" vs "stop_loss"
      takeProfit: input.takeProfit,    // VERIFY: "takeProfit" vs "tp" vs "take_profit"
      comment: input.comment ?? `tradeclaw:${input.clientRef}`,
      // VERIFY: exact client-reference field name ("clientId", "clientRef", "externalId")
      clientId: input.clientRef,
    };
    if (input.triggerPrice !== undefined) {
      body.price = input.triggerPrice; // VERIFY: "price" vs "triggerPrice" for stop/limit
    }

    try {
      // VERIFY: response shape — { orderId/id, status, filledQty, avgPrice }
      const raw = await apiFetch<Record<string, unknown>>('POST', url, this.token, body);
      return {
        brokerOrderId: String(raw.orderId ?? raw.id ?? raw.order_id ?? ''),
        clientRef: input.clientRef,
        status: normaliseOrderStatus(String(raw.status ?? 'pending')),
        filledQty: raw.filledQty !== undefined ? Number(raw.filledQty) : undefined,
        avgFillPrice: raw.avgPrice !== undefined ? Number(raw.avgPrice) : undefined,
      };
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.statusCode < 500) {
        // 4xx = broker-side rejection (bad params, margin, stop distance) — not an infra error.
        return {
          brokerOrderId: '',
          clientRef: input.clientRef,
          status: 'rejected',
          rejectReason: err.message,
        };
      }
      throw err;
    }
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder')) return;

    // VERIFY: DELETE vs POST /orders/{id}/cancel
    const url = `${this.baseUrl}${ACCOUNTS_PATH}/${this.accountId}${ORDERS_SUB}/${brokerOrderId}`;
    try {
      await apiFetch<unknown>('DELETE', url, this.token);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        // 404 / 422 = already filled, cancelled, or unknown — treat as success.
        if (err.statusCode === 404 || err.statusCode === 422 || err.statusCode === 400) return;
      }
      throw err;
    }
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: path and response field names (positionId/id, symbol, direction/side, volume/qty,
    //         openPrice/price, profit/unrealizedPnl, sl/stopLoss, tp/takeProfit)
    const url = `${this.baseUrl}${ACCOUNTS_PATH}/${this.accountId}${POSITIONS_SUB}`;
    const raw = await apiFetch<Array<Record<string, unknown>>>('GET', url, this.token);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => ({
      positionId: String(p.id ?? p.positionId ?? ''),
      symbol: String(p.symbol ?? ''),
      side: normaliseSide(String(p.side ?? p.direction ?? p.type ?? 'BUY')),
      qty: Number(p.volume ?? p.qty ?? p.quantity ?? 0),
      openPrice: Number(p.openPrice ?? p.price ?? p.open_price ?? 0),
      unrealizedPnl: Number(p.profit ?? p.unrealizedPnl ?? p.pnl ?? 0),
      stopLoss: p.sl != null ? Number(p.sl) : p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.tp != null ? Number(p.tp) : p.takeProfit != null ? Number(p.takeProfit) : null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition')) return;

    // VERIFY: DELETE vs POST /positions/{id}/close
    const url = `${this.baseUrl}${ACCOUNTS_PATH}/${this.accountId}${POSITIONS_SUB}/${positionId}`;
    try {
      await apiFetch<unknown>('DELETE', url, this.token);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        if (err.statusCode === 404 || err.statusCode === 422 || err.statusCode === 400) return;
      }
      throw err;
    }
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridgeImpl {
  if (!env.baseUrl || !env.token || !env.accountId) {
    throw new Error(
      'rstockstrader-bridge: RSTOCKSTRADER_BASE_URL, RSTOCKSTRADER_TOKEN, and RSTOCKSTRADER_ACCOUNT_ID must all be set',
    );
  }
  return new RStocksTraderBridgeImpl(env);
}

export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}

// ─── Normalisation helpers ──────────────────────────────────────────────────

/**
 * Map our canonical order type to whatever R StocksTrader expects.
 * VERIFY the exact strings against the API tab before going live.
 */
function mapOrderType(type: RStocksTraderOrderType): string {
  switch (type) {
    case 'MARKET':     return 'MARKET';     // VERIFY
    case 'LIMIT':      return 'LIMIT';      // VERIFY
    case 'STOP_ENTRY': return 'STOP';       // VERIFY: "STOP" vs "STOP_ENTRY" vs "BUY_STOP"/"SELL_STOP"
  }
}

function normaliseOrderStatus(
  raw: string,
): 'pending' | 'filled' | 'partially_filled' | 'rejected' {
  const lc = raw.toLowerCase();
  if (lc === 'filled' || lc === 'executed' || lc === 'done') return 'filled';
  if (lc === 'partially_filled' || lc === 'partial') return 'partially_filled';
  if (lc === 'rejected' || lc === 'cancelled' || lc === 'canceled' || lc === 'error') return 'rejected';
  return 'pending';
}

function normaliseSide(raw: string): OrderSide {
  const lc = raw.toLowerCase();
  if (lc === 'sell' || lc === 'short') return 'SELL';
  return 'BUY';
}

/**
 * Derive asset class from instrument metadata.
 * VERIFY: the field name and values R StocksTrader uses for asset type.
 */
function deriveAssetClass(raw: Record<string, unknown>): RStocksTraderAssetClass {
  const type = String(raw.type ?? raw.asset_class ?? raw.category ?? raw.instrument_type ?? '').toLowerCase();
  if (type.includes('forex') || type.includes('fx') || type.includes('currency')) return 'fx';
  if (type.includes('metal') || type.includes('gold') || type.includes('silver')) return 'metal';
  if (type.includes('crypto')) return 'crypto-cfd';
  if (type.includes('energy') || type.includes('oil') || type.includes('commodity')) return 'energy-cfd';
  if (type.includes('etf')) return 'us-etf';
  if (type.includes('stock') || type.includes('equity') || type.includes('share')) return 'us-stock';
  if (type.includes('index')) return 'index-cfd';
  // Fallback: inspect symbol name conventions
  const sym = String(raw.symbol ?? '').toUpperCase();
  if (sym.includes('/USD') && !sym.startsWith('XAU') && !sym.startsWith('XAG') && !sym.startsWith('XTI')) return 'fx';
  if (sym.startsWith('XAU') || sym.startsWith('XAG')) return 'metal';
  if (sym.startsWith('XTI') || sym.includes('OIL') || sym.includes('WTI')) return 'energy-cfd';
  if (sym.endsWith('.US')) return 'us-stock';
  return 'crypto-cfd';
}
