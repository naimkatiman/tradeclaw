/**
 * R StocksTrader (RoboForex) REST bridge — HTTP implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * ⚠  VERIFY BEFORE GOING LIVE
 * Every endpoint path, request field, and response field marked with
 * "// VERIFY:" must be checked against the operator's R StocksTrader
 * dashboard "API" tab. The R StocksTrader docs are only accessible from
 * the authenticated dashboard — this file cannot be tested without live
 * credentials and must not be merged to production until the acceptance
 * test in the plan doc §5.5 (manual 0.01 lot EUR/USD order + cancel) passes.
 *
 * Pattern mirrors binance-futures.ts:
 *   - All writes are gated by EXECUTION_MODE !== 'disabled'.
 *   - Network/5xx errors throw; broker-side rejections surface as
 *     RStocksTraderPlaceResult.status = 'rejected'.
 *   - Token bucket limits outbound calls to RSTOCKSTRADER_RATE_LIMIT_RPS
 *     (default 10 req/s — verify from API tab).
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (unchanged from stub) ───────────────────────────────────────

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

// ─── Errors ────────────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, msg: string, path: string) {
    super(`[rstockstrader ${status}] ${msg} (${path})`);
    this.status = status;
    this.path = path;
  }
}

// ─── Token bucket (rate limiter) ───────────────────────────────────────────────

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

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefillMs = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSecond) * 1000);
    await new Promise<void>((r) => setTimeout(r, waitMs));
    this.tokens = 0;
    this.lastRefillMs = Date.now();
  }
}

// ─── Implementation ────────────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;
const SPEC_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

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

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly limiter: TokenBucket;
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();

  constructor(private readonly env: RStocksTraderEnv) {
    const rps = Number(process.env.RSTOCKSTRADER_RATE_LIMIT_RPS ?? '10') || 10; // VERIFY: from API tab
    this.limiter = new TokenBucket(rps, rps);
  }

  // ─── HTTP core ────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.limiter.consume();

    const url = `${this.env.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.env.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new RStocksTraderApiError(
        res.status,
        `non-JSON response: ${text.slice(0, 200)}`,
        path,
      );
    }

    if (!res.ok) {
      const err = json as { message?: string; error?: string; description?: string } | null;
      const msg = err?.message ?? err?.error ?? err?.description ?? text.slice(0, 200);
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }

  // ─── Account ──────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: endpoint path — confirm exact path from dashboard API tab.
    // Common variants: /accounts/{id}, /v1/accounts/{id}, /api/accounts/{id}
    const raw = await this.request<{
      id?: string;                // VERIFY: might be 'accountId', 'account_id'
      login?: string;             // VERIFY: some APIs use login as ID
      currency: string;           // VERIFY: might be 'currencyCode'
      balance: number;
      equity: number;
      margin?: number;            // VERIFY: might be 'marginUsed', 'used_margin'
      freeMargin?: number;        // VERIFY: might be 'free_margin', 'availableMargin'
    }>('GET', `/accounts/${this.env.accountId}`);

    return {
      accountId: raw.id ?? raw.login ?? this.env.accountId,
      currency: raw.currency,
      balance: raw.balance,
      equity: raw.equity,
      marginUsed: raw.margin ?? 0,
      marginFree: raw.freeMargin ?? raw.equity - (raw.margin ?? 0),
    };
  }

  // ─── Instrument spec ──────────────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // VERIFY: endpoint path. Common variants: /instruments/{symbol}, /v1/symbols/{symbol}
    const raw = await this.request<{
      symbol: string;
      type?: string;             // VERIFY: asset-class discriminator field name
      category?: string;         // VERIFY: alternative
      digits: number;
      minVolume?: number;        // VERIFY: might be 'minQty', 'min_volume', 'min_lot'
      volumeStep?: number;       // VERIFY: might be 'qtyStep', 'lot_step', 'step'
      contractSize?: number;     // VERIFY: might be 'lotSize', 'contract_size'
      tickSize?: number;         // VERIFY: might be 'pip_size', 'price_step'
      stopLevel?: number;        // VERIFY: min stop distance in pips or price units
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    // VERIFY: map raw.type/category strings to RStocksTraderAssetClass values.
    // The strings below are guesses — replace with actual values from /instruments response.
    const assetClass = inferAssetClass(raw.type ?? raw.category ?? '');

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass,
      minQty: raw.minVolume ?? 0.01,
      qtyStep: raw.volumeStep ?? 0.01,
      tickSize: raw.tickSize ?? Math.pow(10, -raw.digits),
      contractSize: raw.contractSize ?? 1,
      // stopLevel from API is often in pips; convert to price units.
      // VERIFY: units — if stopLevel is already in price units, remove * tickSize.
      minStopDistance: (raw.stopLevel ?? 0) * (raw.tickSize ?? Math.pow(10, -raw.digits)),
      digits: raw.digits,
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  }

  // ─── Order placement ──────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: request body field names. Common variants per broker:
    //   direction / side / type (BUY|SELL vs buy|sell vs 0|1)
    //   volume / qty / lots / amount
    //   stopLoss / stop_loss / sl
    //   takeProfit / take_profit / tp
    //   label / comment / clientId / client_order_id
    const orderBody: Record<string, unknown> = {
      accountId: this.env.accountId,     // VERIFY: might be embedded in path, not body
      symbol: input.symbol,
      type: mapOrderType(input.type),     // VERIFY: see mapOrderType() below
      direction: input.side,             // VERIFY: might be 'side', or BUY→1/SELL→-1
      volume: input.qty,                 // VERIFY: might be 'lots', 'qty', 'quantity'
      stopLoss: input.stopLoss,          // VERIFY: might be 'sl', 'stop_loss'
      takeProfit: input.takeProfit,      // VERIFY: might be 'tp', 'take_profit'
      label: input.clientRef,            // VERIFY: idempotency field — might be 'comment', 'clientId', 'customId'
    };
    if (input.triggerPrice !== undefined) {
      orderBody.price = input.triggerPrice; // VERIFY: might be 'triggerPrice', 'openPrice'
    }
    if (input.comment) {
      orderBody.comment = input.comment;
    }

    // VERIFY: endpoint path. Common variants: /orders, /v1/orders, /trade
    const raw = await this.request<{
      id?: string;             // VERIFY: order ID field name
      orderId?: string;        // VERIFY
      status?: string;         // VERIFY: field name and value set
      state?: string;          // VERIFY: alternative
      volume?: number;         // VERIFY: filled qty field
      filledVolume?: number;   // VERIFY
      openPrice?: number;      // VERIFY: avg fill price field
      averagePrice?: number;   // VERIFY
      comment?: string;        // VERIFY: echoed label/clientRef
      message?: string;        // VERIFY: rejection reason
    }>('POST', '/orders', orderBody);

    const brokerId = raw.id ?? raw.orderId ?? '';
    const rawStatus = (raw.status ?? raw.state ?? '').toLowerCase();

    if (rawStatus === 'rejected' || rawStatus === 'error') {
      return {
        brokerOrderId: brokerId,
        clientRef: input.clientRef,
        status: 'rejected',
        rejectReason: raw.message ?? rawStatus,
      };
    }

    return {
      brokerOrderId: brokerId,
      clientRef: input.clientRef,
      status: mapBrokerStatus(rawStatus),
      filledQty: raw.filledVolume ?? raw.volume,
      avgFillPrice: raw.averagePrice ?? raw.openPrice,
    };
  }

  // ─── Cancel order ─────────────────────────────────────────────────────

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder', brokerOrderId)) return;

    try {
      // VERIFY: endpoint path. Common: DELETE /orders/{id}, POST /orders/{id}/cancel
      await this.request('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        // 404 = already gone; 409 = already filled — both are idempotent outcomes.
        // VERIFY: confirm which status codes the API uses for these cases.
        if (err.status === 404 || err.status === 409 || err.status === 410) return;
      }
      throw err;
    }
  }

  // ─── Positions ────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: endpoint path and query params. Common: GET /positions?accountId={id}
    const raw = await this.request<
      Array<{
        id?: string;           // VERIFY: position ID field
        positionId?: string;   // VERIFY
        symbol: string;
        direction?: string;    // VERIFY: BUY|SELL or buy|sell or 1|-1
        side?: string;         // VERIFY: alternative
        volume?: number;       // VERIFY: qty field name
        qty?: number;          // VERIFY
        openPrice?: number;    // VERIFY: entry price field
        entryPrice?: number;   // VERIFY
        unrealizedPnl?: number; // VERIFY
        profit?: number;        // VERIFY: alternative
        stopLoss?: number | null;
        takeProfit?: number | null;
      }>
    >('GET', `/positions?accountId=${encodeURIComponent(this.env.accountId)}`);

    return (raw ?? []).map((p) => ({
      positionId: p.positionId ?? p.id ?? '',
      symbol: p.symbol,
      side: normaliseSide(p.direction ?? p.side ?? 'BUY'),
      qty: p.volume ?? p.qty ?? 0,
      openPrice: p.openPrice ?? p.entryPrice ?? 0,
      unrealizedPnl: p.unrealizedPnl ?? p.profit ?? 0,
      stopLoss: p.stopLoss ?? null,
      takeProfit: p.takeProfit ?? null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition', positionId)) return;

    try {
      // VERIFY: endpoint path. Common: DELETE /positions/{id}, POST /positions/{id}/close
      await this.request('DELETE', `/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        // VERIFY: idempotent status codes for already-closed positions
        if (err.status === 404 || err.status === 409 || err.status === 410) return;
      }
      throw err;
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * VERIFY: map our canonical order types to whatever strings the R StocksTrader
 * API expects. These are guesses based on common broker REST conventions.
 */
function mapOrderType(type: RStocksTraderOrderType): string {
  switch (type) {
    case 'MARKET':     return 'MARKET';     // VERIFY
    case 'LIMIT':      return 'LIMIT';      // VERIFY
    case 'STOP_ENTRY': return 'STOP';       // VERIFY: might be 'STOP_ENTRY', 'BUY_STOP', 'SELL_STOP'
  }
}

/**
 * VERIFY: map whatever status strings R StocksTrader returns to our canonical set.
 */
function mapBrokerStatus(raw: string): RStocksTraderPlaceResult['status'] {
  if (raw === 'filled' || raw === 'executed' || raw === 'done') return 'filled';
  if (raw === 'partially_filled' || raw === 'partial') return 'partially_filled';
  if (raw === 'rejected' || raw === 'error' || raw === 'invalid') return 'rejected';
  return 'pending'; // default: 'pending', 'new', 'open', 'active', 'placed'
}

/**
 * VERIFY: map R StocksTrader direction/side values to our canonical BUY | SELL.
 * Brokers use strings, numbers (1/-1), or mixed-case — verify from live response.
 */
function normaliseSide(raw: string): OrderSide {
  const lc = String(raw).toLowerCase();
  if (lc === 'sell' || lc === '-1' || lc === 'short') return 'SELL';
  return 'BUY'; // 'buy', '1', 'long', or unknown → treat as BUY
}

/**
 * VERIFY: infer asset class from the type/category string returned by
 * /instruments. Replace these string literals with actual values from
 * the live API response.
 */
function inferAssetClass(raw: string): RStocksTraderAssetClass {
  const lc = raw.toLowerCase();
  if (lc.includes('crypto') || lc.includes('digital')) return 'crypto-cfd';
  if (lc.includes('forex') || lc.includes('fx') || lc.includes('currency')) return 'fx';
  if (lc.includes('metal') || lc.includes('gold') || lc.includes('silver')) return 'metal';
  if (lc.includes('energy') || lc.includes('oil')) return 'energy-cfd';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('index') || lc.includes('indices')) return 'index-cfd';
  if (lc.includes('stock') || lc.includes('equity') || lc.includes('share')) return 'us-stock';
  return 'us-stock'; // safe fallback — VERIFY
}

// ─── Public factory ────────────────────────────────────────────────────────────

/**
 * Construct a bridge instance from explicit env. Throws at call-site (not at
 * module load) if env vars are missing — identical to binance-futures.ts behaviour
 * so a misconfigured deploy fails the handshake, not the cold boot.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  if (!env.baseUrl || !env.token || !env.accountId) {
    throw new Error(
      'rstockstrader-bridge: RSTOCKSTRADER_BASE_URL, RSTOCKSTRADER_TOKEN, and RSTOCKSTRADER_ACCOUNT_ID must all be set',
    );
  }
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read env vars in one place so the executor dispatch layer doesn't need to
 * know R StocksTrader specifics. Returns null when any required var is absent —
 * caller should log and skip the tick rather than throwing.
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
