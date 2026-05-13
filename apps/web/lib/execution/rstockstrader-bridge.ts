/**
 * R StocksTrader (RoboForex) REST bridge — full implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md
 *
 * Authentication: Bearer token in `Authorization` header.
 * All write methods are gated by EXECUTION_MODE — identical pattern to
 * binance-futures.ts so the executor dispatch layer stays symmetric.
 *
 * IMPORTANT — endpoint verification:
 *   Every path and every response-field mapping below is marked
 *   TODO-VERIFY. Before going live, Zaky must confirm each one against
 *   the operator dashboard's API tab. The constants at the top of each
 *   section are the ONLY places that need editing; do not hunt through
 *   the method bodies.
 *
 * Rate limiting: token-bucket, 10 req/sec default (verify from API tab).
 * Instrument spec: cached 1h per symbol (process restart clears cache).
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── API path constants (TODO-VERIFY against operator dashboard) ──────────────

/** Path fragment for account info. Append `/${accountId}` at call site. */
const PATH_ACCOUNTS = '/accounts';

/** Path fragment for instrument specs. Append `/${symbol}` at call site. */
const PATH_INSTRUMENTS = '/instruments';

/** Path fragment for order placement and cancellation. */
const PATH_ORDERS = '/orders';

/** Path fragment for position listing. */
const PATH_POSITIONS = '/positions';

const REQ_TIMEOUT_MS = 15_000;

// ─── Public interfaces (unchanged from the original stub) ────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /**
   * Contract size in base-asset units per 1 lot.
   * FX: 100 000; XAUUSD: 100 oz; stocks: 1 share.
   * Used in the lot-sizing formula: lots = riskBudget / (stopDistance × contractSize).
   */
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

class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefillMs = Date.now();
  }

  async consume(count = 1): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefillMs = now;

    if (this.tokens < count) {
      const waitMs = Math.ceil(((count - this.tokens) / this.refillPerSecond) * 1000);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= count;
    }
  }
}

// ─── Bridge implementation ───────────────────────────────────────────────────

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly limiter: TokenBucket;
  // Instrument spec cache: symbol → { spec, expiresAt }
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
  private static readonly SPEC_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

  constructor(
    private readonly env: RStocksTraderEnv,
    ratePerSecond = 10,
  ) {
    this.limiter = new TokenBucket(ratePerSecond, ratePerSecond);
  }

  // ── Account ───────────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    await this.limiter.consume();
    // TODO-VERIFY: exact path and response field names from operator dashboard.
    // Typical shape: { id, currency, balance, equity, margin, freeMargin }
    const data = await this.request<Record<string, unknown>>(
      'GET',
      `${PATH_ACCOUNTS}/${this.env.accountId}`,
    );
    return {
      accountId: String(data.id ?? this.env.accountId),
      currency: String(data.currency ?? 'USD'),
      balance: Number(data.balance ?? 0),
      equity: Number(data.equity ?? 0),
      marginUsed: Number(data.margin ?? data.usedMargin ?? data.margin_used ?? 0),
      marginFree: Number(data.freeMargin ?? data.free_margin ?? data.availableMargin ?? 0),
    };
  }

  // ── Instrument spec ───────────────────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.spec;
    }

    await this.limiter.consume();
    // TODO-VERIFY: exact path and response field names from operator dashboard.
    // Typical shape: { symbol, contractSize, digits, minQty, qtyStep, tickSize,
    //                  minStopDistance, assetClass / type }
    const data = await this.request<Record<string, unknown>>(
      'GET',
      `${PATH_INSTRUMENTS}/${encodeURIComponent(symbol)}`,
    );

    const spec: RStocksTraderInstrumentSpec = {
      symbol,
      assetClass: normaliseAssetClass(String(data.type ?? data.assetClass ?? data.asset_class ?? 'fx')),
      minQty: Number(data.minQty ?? data.min_qty ?? data.minLot ?? 0.01),
      qtyStep: Number(data.qtyStep ?? data.qty_step ?? data.lotStep ?? data.lot_step ?? 0.01),
      tickSize: Number(data.tickSize ?? data.tick_size ?? data.point ?? 0.00001),
      contractSize: Number(data.contractSize ?? data.contract_size ?? data.lotSize ?? data.lot_size ?? 100000),
      minStopDistance: Number(data.minStopDistance ?? data.min_stop_distance ?? data.stopsLevel ?? 0),
      digits: Number(data.digits ?? data.precision ?? 5),
    };

    this.specCache.set(symbol, {
      spec,
      expiresAt: Date.now() + RStocksTraderBridgeImpl.SPEC_CACHE_TTL_MS,
    });
    return spec;
  }

  // ── Place order ───────────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    await this.limiter.consume();

    // TODO-VERIFY: exact field names, order type strings, and response shape
    // from the operator dashboard. The body below follows the most common
    // R StocksTrader / RoboForex REST pattern; update field names as needed.
    const body: Record<string, unknown> = {
      accountId: this.env.accountId,
      symbol: input.symbol,
      // TODO-VERIFY: 'BUY'/'SELL' or 'buy'/'sell' — adjust casing if needed.
      side: input.side,
      // TODO-VERIFY: type strings 'MARKET'/'LIMIT'/'STOP_ENTRY' or lower-case.
      type: input.type,
      // TODO-VERIFY: quantity field name ('volume', 'qty', 'quantity', 'lots').
      volume: input.qty,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      // TODO-VERIFY: client-reference field name ('clientRef', 'comment',
      // 'clientOrderId', 'magic'). This is the idempotency handle.
      clientRef: input.clientRef,
      comment: input.comment ?? `tc-${input.clientRef}`,
    };
    if (input.type !== 'MARKET' && input.triggerPrice !== undefined) {
      // TODO-VERIFY: trigger price field name ('price', 'openPrice', 'triggerPrice').
      body.price = input.triggerPrice;
    }

    const data = await this.request<Record<string, unknown>>('POST', PATH_ORDERS, body);

    // TODO-VERIFY: response field names for orderId and status.
    const rawStatus = String(data.status ?? data.state ?? 'pending').toLowerCase();
    return {
      brokerOrderId: String(data.id ?? data.orderId ?? data.order_id ?? ''),
      clientRef: input.clientRef,
      status: normaliseOrderStatus(rawStatus),
      filledQty: data.filledQty !== undefined ? Number(data.filledQty ?? data.filled_qty) : undefined,
      avgFillPrice: data.avgPrice !== undefined ? Number(data.avgPrice ?? data.avg_price) : undefined,
      rejectReason: rawStatus === 'rejected' ? String(data.reason ?? data.rejectReason ?? '') : undefined,
    };
  }

  // ── Cancel order ──────────────────────────────────────────────────────────

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder', brokerOrderId)) return;

    await this.limiter.consume();
    // TODO-VERIFY: DELETE /orders/{id} or POST /orders/{id}/cancel
    try {
      await this.request<unknown>('DELETE', `${PATH_ORDERS}/${brokerOrderId}`);
    } catch (err) {
      // Treat already-gone / already-filled as success (idempotent cancel).
      const msg = getMsg(err);
      if (isAlreadyGoneError(msg)) return;
      throw err;
    }
  }

  // ── Positions ─────────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    await this.limiter.consume();
    // TODO-VERIFY: path and query params; some APIs use /accounts/{id}/positions.
    const data = await this.request<unknown>(
      'GET',
      `${PATH_POSITIONS}?accountId=${encodeURIComponent(this.env.accountId)}`,
    );

    const rows = Array.isArray(data) ? data : ((data as Record<string, unknown>).positions as unknown[] ?? []);
    return rows.map((p) => {
      const r = p as Record<string, unknown>;
      const rawSide = String(r.side ?? r.type ?? 'BUY').toUpperCase();
      return {
        // TODO-VERIFY: field names for id, symbol, side, qty, openPrice, unrealizedPnl, sl, tp.
        positionId: String(r.id ?? r.positionId ?? r.position_id ?? ''),
        symbol: String(r.symbol ?? ''),
        side: rawSide === 'SELL' ? 'SELL' : 'BUY',
        qty: Number(r.volume ?? r.qty ?? r.lots ?? 0),
        openPrice: Number(r.openPrice ?? r.open_price ?? r.price ?? 0),
        unrealizedPnl: Number(r.unrealizedPnl ?? r.profit ?? r.pnl ?? 0),
        stopLoss: r.stopLoss != null ? Number(r.stopLoss ?? r.sl) : null,
        takeProfit: r.takeProfit != null ? Number(r.takeProfit ?? r.tp) : null,
      } satisfies RStocksTraderPosition;
    });
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition', positionId)) return;

    await this.limiter.consume();
    // TODO-VERIFY: POST /positions/{id}/close or DELETE /positions/{id}
    try {
      await this.request<unknown>('POST', `${PATH_POSITIONS}/${positionId}/close`);
    } catch (err) {
      const msg = getMsg(err);
      if (isAlreadyGoneError(msg)) return;
      throw err;
    }
  }

  // ── HTTP helper ────────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.env.baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.env.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
      const err = json as Record<string, unknown> | null;
      const msg = String(err?.message ?? err?.error ?? err?.msg ?? text);
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, msg: string, path: string) {
    super(`[rstockstrader ${status}] ${msg} (${path})`);
    this.status = status;
    this.path = path;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isAlreadyGoneError(msg: string): boolean {
  // Common broker error patterns for "order/position already closed/cancelled".
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('already closed') ||
    msg.includes('already cancelled') ||
    msg.includes('does not exist')
  );
}

function normaliseOrderStatus(raw: string): RStocksTraderPlaceResult['status'] {
  if (raw === 'filled' || raw === 'executed' || raw === 'closed') return 'filled';
  if (raw === 'partially_filled' || raw === 'partial') return 'partially_filled';
  if (raw === 'rejected' || raw === 'canceled' || raw === 'cancelled' || raw === 'error') return 'rejected';
  return 'pending';
}

function normaliseAssetClass(raw: string): RStocksTraderAssetClass {
  const lc = raw.toLowerCase();
  if (lc.includes('crypto')) return 'crypto-cfd';
  if (lc.includes('fx') || lc.includes('forex') || lc.includes('currency')) return 'fx';
  if (lc.includes('metal') || lc.includes('gold') || lc.includes('silver')) return 'metal';
  if (lc.includes('energy') || lc.includes('oil') || lc.includes('gas')) return 'energy-cfd';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('index') || lc.includes('indices')) return 'index-cfd';
  if (lc.includes('stock') || lc.includes('equity') || lc.includes('share')) return 'us-stock';
  return 'fx'; // safe default for unknown
}

function ensureWriteAllowed(action: string, ref: string): boolean {
  const mode = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (mode === 'disabled') {
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled — ref=${ref}`);
    return false;
  }
  return true;
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read env vars. Returns null if any required var is missing.
 *
 * Required:
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
