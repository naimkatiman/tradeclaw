/**
 * R StocksTrader (RoboForex) REST bridge — implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * All endpoint paths and field names are based on the R StocksTrader REST API
 * as described in the operator dashboard "API" tab. VERIFY each path against
 * the live dashboard before first deploy — the dashboard is the authoritative
 * source. Paths that diverge from the defaults below can be corrected here
 * without touching the executor dispatch layer.
 *
 * Write methods are gated by EXECUTION_MODE:
 *   disabled → dry-run log, no HTTP write
 *   demo / testnet / live → real HTTP call
 *
 * Rate limit: 10 req/sec token-bucket (verify against dashboard).
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

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

export interface RStocksTraderBridge {
  getAccountInfo(): Promise<RStocksTraderAccountInfo>;
  getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec>;
  placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult>;
  cancelOrder(brokerOrderId: string): Promise<void>;
  listOpenPositions(): Promise<RStocksTraderPosition[]>;
  closePosition(positionId: string): Promise<void>;
}

export interface RStocksTraderEnv {
  baseUrl: string;
  token: string;
  accountId: string;
}

// ─── Token-bucket rate limiter ────────────────────────────────────────────────

const DEFAULT_RATE_PER_SEC = 10;

class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(private readonly ratePerSec: number) {
    this.tokens = ratePerSec;
    this.lastRefillMs = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.ratePerSec, this.tokens + elapsed * this.ratePerSec);
    this.lastRefillMs = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
    this.lastRefillMs = Date.now();
  }
}

// ─── Instrument spec cache (1 h TTL, keyed by symbol) ────────────────────────

interface CachedSpec {
  spec: RStocksTraderInstrumentSpec;
  expiresAt: number;
}

const SPEC_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Mode guard ───────────────────────────────────────────────────────────────

function isWriteAllowed(action: string, symbol?: string): boolean {
  const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (raw === 'disabled') {
    const safe = symbol ? { symbol } : {};
    console.log(`[rst] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(safe));
    return false;
  }
  return true;
}

// ─── Bridge implementation ────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;

class RStocksTraderClient implements RStocksTraderBridge {
  private readonly bucket: TokenBucket;
  private readonly specCache = new Map<string, CachedSpec>();

  constructor(private readonly env: RStocksTraderEnv) {
    this.bucket = new TokenBucket(DEFAULT_RATE_PER_SEC);
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.bucket.acquire();

    const url = `${this.env.baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.env.token}`,
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
      throw new RStocksTraderApiError(res.status, `Non-JSON response: ${text.slice(0, 200)}`, path);
    }

    if (!res.ok) {
      const err = json as { message?: string; error?: string } | null;
      const msg = err?.message ?? err?.error ?? text.slice(0, 200);
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }

  // ── Account ─────────────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: confirm path and field names against the dashboard API tab.
    // Common patterns: /account, /accounts/{id}, /trading/accounts/{id}
    const raw = await this.request<Record<string, unknown>>('GET', `/account`);
    return {
      accountId: String(raw.id ?? raw.accountId ?? this.env.accountId),
      currency: String(raw.currency ?? 'USD'),
      balance: Number(raw.balance ?? 0),
      equity: Number(raw.equity ?? raw.balance ?? 0),
      marginUsed: Number(raw.margin ?? raw.marginUsed ?? raw.usedMargin ?? 0),
      marginFree: Number(raw.freeMargin ?? raw.marginFree ?? 0),
    };
  }

  // ── Instruments ─────────────────────────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && Date.now() < cached.expiresAt) return cached.spec;

    // VERIFY: confirm path against dashboard; some APIs use encoded symbols (%2F for /)
    const encodedSymbol = encodeURIComponent(symbol);
    const raw = await this.request<Record<string, unknown>>('GET', `/instruments/${encodedSymbol}`);

    const spec = parseInstrumentSpec(symbol, raw);
    this.specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!isWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: confirm field names (volume vs qty, side casing, type names)
    // against the dashboard API tab before first live deploy.
    const body: Record<string, unknown> = {
      accountId: this.env.accountId,
      symbol: input.symbol,
      // Side: R StocksTrader typically uses lowercase ('buy'/'sell') or 'BUY'/'SELL'.
      // Adjust the mapping below if the API returns a validation error on side.
      side: input.side.toLowerCase(),
      type: mapOrderType(input.type),
      volume: input.qty,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      // clientRef carried in comment for idempotency tracking.
      // VERIFY: some APIs have a dedicated clientId / comment field.
      comment: input.clientRef,
    };

    if (input.type !== 'MARKET' && input.triggerPrice !== undefined) {
      body.price = input.triggerPrice;
    }

    const raw = await this.request<Record<string, unknown>>('POST', '/orders', body);
    return parseOrderResult(input.clientRef, raw);
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!isWriteAllowed('cancelOrder')) return;
    try {
      await this.request('DELETE', `/orders/${brokerOrderId}`);
    } catch (err) {
      // Idempotent: treat 404 (already gone / already filled) as success.
      if (err instanceof RStocksTraderApiError && err.status === 404) return;
      throw err;
    }
  }

  // ── Positions ────────────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: confirm path and response shape against dashboard.
    const raw = await this.request<unknown[]>('GET', `/positions?accountId=${this.env.accountId}`);
    return (Array.isArray(raw) ? raw : []).map(parsePosition);
  }

  async closePosition(positionId: string): Promise<void> {
    if (!isWriteAllowed('closePosition')) return;
    try {
      await this.request('DELETE', `/positions/${positionId}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.status === 404) return;
      throw err;
    }
  }
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function mapOrderType(t: RStocksTraderOrderType): string {
  // VERIFY: confirm exact type strings accepted by the API.
  if (t === 'STOP_ENTRY') return 'stop';
  if (t === 'LIMIT') return 'limit';
  return 'market';
}

function parseInstrumentSpec(symbol: string, raw: Record<string, unknown>): RStocksTraderInstrumentSpec {
  // VERIFY: field names below against a live /instruments/{symbol} response.
  // Common variants documented inline.
  return {
    symbol,
    assetClass: (raw.assetClass as RStocksTraderAssetClass | undefined) ?? 'fx',
    minQty: Number(raw.minQty ?? raw.minVolume ?? raw.minLot ?? 0.01),
    qtyStep: Number(raw.qtyStep ?? raw.volumeStep ?? raw.lotStep ?? 0.01),
    tickSize: Number(raw.tickSize ?? raw.tick ?? 0.00001),
    contractSize: Number(raw.contractSize ?? raw.lotSize ?? 100_000),
    minStopDistance: Number(raw.minStopDistance ?? raw.minStopLevel ?? 0),
    digits: Number(raw.digits ?? raw.precision ?? 5),
  };
}

function parseOrderResult(clientRef: string, raw: Record<string, unknown>): RStocksTraderPlaceResult {
  const statusRaw = String(raw.status ?? raw.state ?? 'pending').toLowerCase();
  const status = (
    statusRaw === 'filled' || statusRaw === 'executed' ? 'filled'
    : statusRaw === 'partially_filled' || statusRaw === 'partial' ? 'partially_filled'
    : statusRaw === 'rejected' || statusRaw === 'cancelled' ? 'rejected'
    : 'pending'
  ) as RStocksTraderPlaceResult['status'];

  return {
    brokerOrderId: String(raw.id ?? raw.orderId ?? raw.order_id ?? ''),
    clientRef,
    status,
    filledQty: raw.filledVolume !== undefined ? Number(raw.filledVolume) : undefined,
    avgFillPrice: raw.avgPrice !== undefined ? Number(raw.avgPrice) : undefined,
    rejectReason: status === 'rejected' ? String(raw.rejectReason ?? raw.message ?? '') : undefined,
  };
}

function parsePosition(raw: unknown): RStocksTraderPosition {
  const r = raw as Record<string, unknown>;
  const sideRaw = String(r.side ?? r.type ?? 'buy').toLowerCase();
  return {
    positionId: String(r.id ?? r.positionId ?? ''),
    symbol: String(r.symbol ?? ''),
    side: sideRaw === 'sell' ? 'SELL' : 'BUY',
    qty: Number(r.volume ?? r.qty ?? 0),
    openPrice: Number(r.openPrice ?? r.price ?? 0),
    unrealizedPnl: Number(r.unrealizedPnl ?? r.profit ?? 0),
    stopLoss: r.stopLoss !== undefined && r.stopLoss !== null ? Number(r.stopLoss) : null,
    takeProfit: r.takeProfit !== undefined && r.takeProfit !== null ? Number(r.takeProfit) : null,
  };
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly path: string,
  ) {
    super(`[rst ${status}] ${message} (${path})`);
  }
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  return new RStocksTraderClient(env);
}

export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
