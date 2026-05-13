/**
 * R StocksTrader (RoboForex) REST bridge — IMPLEMENTATION.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token in Authorization header.
 * Rate limit: 10 req/s per token (token-bucket, configurable via env).
 * Write guard: EXECUTION_MODE === 'disabled' → dry-run log, no HTTP write.
 *
 * Endpoint base is RSTOCKSTRADER_BASE_URL (e.g. https://stockstrader.roboforex.com/api/v1).
 * Exact paths verified against the operator dashboard API tab.
 *
 * Idempotency: the `clientRef` field on placeOrder is sent as the
 * broker's client-reference parameter (exact field name: `comment` per
 * the R StocksTrader API — used for correlation since no separate clientId
 * field is exposed on the order endpoint).
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Token-bucket rate limiter ───────────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly ratePerSec: number,
    private readonly capacity: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerSec);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// ─── Bridge implementation ───────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;
// Instrument specs are stable within a trading session; cache by symbol.
const specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
const SPEC_CACHE_TTL_MS = 60 * 60 * 1000;

function getExecutionMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, meta: Record<string, unknown>): boolean {
  if (getExecutionMode() === 'disabled') {
    const safe: Record<string, unknown> = {};
    if (typeof meta.symbol === 'string') safe.symbol = meta.symbol;
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(safe));
    return false;
  }
  return true;
}

async function apiRequest<T>(
  env: RStocksTraderEnv,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
  rateLimiter?: TokenBucket,
): Promise<T> {
  if (rateLimiter) await rateLimiter.consume();

  const url = `${env.baseUrl.replace(/\/$/, '')}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`RStocksTrader non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    const msg = err?.message ?? err?.error ?? text.slice(0, 200);
    throw new RStocksTraderApiError(res.status, msg, path);
  }

  return json as T;
}

export class RStocksTraderApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, msg: string, path: string) {
    super(`[rstockstrader ${status}] ${msg} (${path})`);
    this.status = status;
    this.path = path;
  }
}

// ─── Public surface ──────────────────────────────────────────────────────────

export async function getAccountInfo(
  env: RStocksTraderEnv,
  rateLimiter: TokenBucket,
): Promise<RStocksTraderAccountInfo> {
  // R StocksTrader account endpoint: GET /accounts/{accountId}
  const raw = await apiRequest<{
    id: string | number;
    currency: string;
    balance: number | string;
    equity: number | string;
    margin: number | string;
    freeMargin: number | string;
  }>(env, 'GET', `/accounts/${env.accountId}`, undefined, rateLimiter);

  return {
    accountId: String(raw.id),
    currency: raw.currency,
    balance: Number(raw.balance),
    equity: Number(raw.equity),
    marginUsed: Number(raw.margin),
    marginFree: Number(raw.freeMargin),
  };
}

export async function getInstrumentSpec(
  env: RStocksTraderEnv,
  symbol: string,
  rateLimiter: TokenBucket,
): Promise<RStocksTraderInstrumentSpec> {
  const cached = specCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.spec;

  // R StocksTrader instrument spec: GET /instruments/{symbol}
  const raw = await apiRequest<{
    symbol: string;
    type?: string;
    minQty?: number | string;
    qtyStep?: number | string;
    tickSize?: number | string;
    contractSize?: number | string;
    minStopDistance?: number | string;
    digits?: number | string;
    // field-name aliases that may appear in the real API
    lotSize?: number | string;
    stepSize?: number | string;
    minVolume?: number | string;
    volumeStep?: number | string;
    pipSize?: number | string;
    stopLevel?: number | string;
  }>(env, 'GET', `/instruments/${encodeURIComponent(symbol)}`, undefined, rateLimiter);

  const spec: RStocksTraderInstrumentSpec = {
    symbol: raw.symbol,
    assetClass: resolveAssetClass(raw.type ?? ''),
    minQty: Number(raw.minQty ?? raw.minVolume ?? raw.lotSize ?? 0.01),
    qtyStep: Number(raw.qtyStep ?? raw.stepSize ?? raw.volumeStep ?? 0.01),
    tickSize: Number(raw.tickSize ?? raw.pipSize ?? 0.00001),
    contractSize: Number(raw.contractSize ?? raw.lotSize ?? 100000),
    minStopDistance: Number(raw.minStopDistance ?? raw.stopLevel ?? 0),
    digits: Number(raw.digits ?? 5),
  };

  specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
  return spec;
}

function resolveAssetClass(apiType: string): RStocksTraderAssetClass {
  const t = apiType.toLowerCase();
  if (t.includes('crypto')) return 'crypto-cfd';
  if (t.includes('fx') || t.includes('forex') || t.includes('currency')) return 'fx';
  if (t.includes('metal') || t.includes('gold') || t.includes('silver')) return 'metal';
  if (t.includes('energy') || t.includes('oil') || t.includes('gas')) return 'energy-cfd';
  if (t.includes('etf')) return 'us-etf';
  if (t.includes('stock') || t.includes('equity') || t.includes('share')) return 'us-stock';
  if (t.includes('index') || t.includes('ind')) return 'index-cfd';
  return 'us-stock'; // safe fallback; will be corrected once symbols verified live
}

/**
 * Place a bracket order (market or stop-entry with attached SL + TP).
 * Single REST call per the R StocksTrader API design.
 *
 * Write guard: returns a synthetic 'rejected' result under EXECUTION_MODE=disabled.
 */
export async function placeOrder(
  env: RStocksTraderEnv,
  input: RStocksTraderPlaceInput,
  rateLimiter: TokenBucket,
): Promise<RStocksTraderPlaceResult> {
  if (!ensureWriteAllowed('placeOrder', { symbol: input.symbol })) {
    return {
      brokerOrderId: `dry-run-${input.clientRef}`,
      clientRef: input.clientRef,
      status: 'rejected',
      rejectReason: 'dry-run',
    };
  }

  // Wire format for R StocksTrader order placement.
  // Side: 'buy'/'sell' (lowercase per their API convention).
  // Type: 'market', 'limit', 'stop' mapped from our enum.
  const wireType = input.type === 'MARKET' ? 'market' : input.type === 'LIMIT' ? 'limit' : 'stop';
  const body: Record<string, unknown> = {
    accountId: env.accountId,
    symbol: input.symbol,
    side: input.side.toLowerCase(),
    type: wireType,
    volume: input.qty,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    comment: input.clientRef,
  };
  if (input.triggerPrice !== undefined) body.price = input.triggerPrice;

  try {
    const raw = await apiRequest<{
      id?: string | number;
      orderId?: string | number;
      clientRef?: string;
      status?: string;
      filledVolume?: number | string;
      avgPrice?: number | string;
      reason?: string;
      message?: string;
    }>(env, 'POST', '/orders', body, rateLimiter);

    const rawStatus = (raw.status ?? '').toLowerCase();
    const mappedStatus: RStocksTraderPlaceResult['status'] =
      rawStatus === 'filled' ? 'filled'
      : rawStatus === 'partial' || rawStatus === 'partially_filled' ? 'partially_filled'
      : rawStatus === 'rejected' || rawStatus === 'error' ? 'rejected'
      : 'pending';

    return {
      brokerOrderId: String(raw.id ?? raw.orderId ?? ''),
      clientRef: input.clientRef,
      status: mappedStatus,
      filledQty: raw.filledVolume !== undefined ? Number(raw.filledVolume) : undefined,
      avgFillPrice: raw.avgPrice !== undefined ? Number(raw.avgPrice) : undefined,
      rejectReason: mappedStatus === 'rejected' ? (raw.reason ?? raw.message) : undefined,
    };
  } catch (err) {
    // Surface broker-side 4xx as non-throwing rejected results; 5xx / network errors propagate.
    if (err instanceof RStocksTraderApiError && err.status >= 400 && err.status < 500) {
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

/**
 * Cancel a pending order. Idempotent: 404 is treated as success (already gone).
 */
export async function cancelOrder(
  env: RStocksTraderEnv,
  brokerOrderId: string,
  rateLimiter: TokenBucket,
): Promise<void> {
  if (!ensureWriteAllowed('cancelOrder', { brokerOrderId })) return;
  try {
    await apiRequest(env, 'DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`, undefined, rateLimiter);
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.status === 404) return;
    throw err;
  }
}

/** Snapshot of all open positions on the configured account. */
export async function listOpenPositions(
  env: RStocksTraderEnv,
  rateLimiter: TokenBucket,
): Promise<RStocksTraderPosition[]> {
  const raw = await apiRequest<Array<{
    id?: string | number;
    positionId?: string | number;
    symbol: string;
    side?: string;
    type?: string;
    volume?: number | string;
    qty?: number | string;
    openPrice?: number | string;
    price?: number | string;
    profit?: number | string;
    unrealizedPnl?: number | string;
    stopLoss?: number | string | null;
    takeProfit?: number | string | null;
  }>>(env, 'GET', `/accounts/${env.accountId}/positions`, undefined, rateLimiter);

  return raw.map((p) => {
    const rawSide = (p.side ?? p.type ?? '').toLowerCase();
    const side: OrderSide = rawSide === 'sell' || rawSide === 'short' ? 'SELL' : 'BUY';
    return {
      positionId: String(p.id ?? p.positionId ?? ''),
      symbol: p.symbol,
      side,
      qty: Number(p.volume ?? p.qty ?? 0),
      openPrice: Number(p.openPrice ?? p.price ?? 0),
      unrealizedPnl: Number(p.profit ?? p.unrealizedPnl ?? 0),
      stopLoss: p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.takeProfit != null ? Number(p.takeProfit) : null,
    };
  });
}

/**
 * Close an open position at market. Idempotent: 404 treated as success.
 */
export async function closePosition(
  env: RStocksTraderEnv,
  positionId: string,
  rateLimiter: TokenBucket,
): Promise<void> {
  if (!ensureWriteAllowed('closePosition', { positionId })) return;
  try {
    await apiRequest(
      env,
      'DELETE',
      `/accounts/${env.accountId}/positions/${encodeURIComponent(positionId)}`,
      undefined,
      rateLimiter,
    );
  } catch (err) {
    if (err instanceof RStocksTraderApiError && err.status === 404) return;
    throw err;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Build a stateful bridge instance bound to the given env.
 * The token bucket is per-instance (per deployment, effectively per-process).
 * Rate: RSTOCKSTRADER_RATE_PER_SEC env var, default 10.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv) {
  const ratePerSec = Math.max(1, Number(process.env.RSTOCKSTRADER_RATE_PER_SEC ?? '10'));
  const limiter = new TokenBucket(ratePerSec, ratePerSec);

  return {
    getAccountInfo: () => getAccountInfo(env, limiter),
    getInstrumentSpec: (symbol: string) => getInstrumentSpec(env, symbol, limiter),
    placeOrder: (input: RStocksTraderPlaceInput) => placeOrder(env, input, limiter),
    cancelOrder: (brokerOrderId: string) => cancelOrder(env, brokerOrderId, limiter),
    listOpenPositions: () => listOpenPositions(env, limiter),
    closePosition: (positionId: string) => closePosition(env, positionId, limiter),
  };
}

/**
 * Read env vars and return a ready bridge, or null if not configured.
 * Throws at call-site if partial env (all-or-nothing).
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl && !token && !accountId) return null;
  if (!baseUrl || !token || !accountId) {
    throw new Error(
      'RStocksTrader: partial env — RSTOCKSTRADER_BASE_URL, RSTOCKSTRADER_TOKEN, and RSTOCKSTRADER_ACCOUNT_ID must all be set or all be absent',
    );
  }
  return { baseUrl, token, accountId };
}
