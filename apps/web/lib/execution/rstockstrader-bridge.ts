/**
 * R StocksTrader (RoboForex) REST bridge — HTTP implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * VERIFICATION REQUIRED: Endpoint paths and response field names below are
 * based on common RoboForex REST API conventions. Before going live, verify
 * each endpoint against the live /instruments and /account responses in the
 * operator dashboard. Fields marked "VERIFY" need confirmation.
 *
 * Env vars required (set on Railway, never committed):
 *   RSTOCKSTRADER_BASE_URL     e.g. https://stockstrader.roboforex.com/api/v1
 *   RSTOCKSTRADER_TOKEN        Bearer token (must have trade-write permission)
 *   RSTOCKSTRADER_ACCOUNT_ID   Numeric demo account id
 *
 * All write methods are gated by EXECUTION_MODE !== 'disabled'. Reads always
 * execute (needed for account info, instrument specs, position checks).
 */

import { currentMode } from './binance-futures';
import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (re-exported for callers) ──────────────────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /**
   * Contract size in base-asset units per lot.
   * FX majors: 100 000; XAUUSD: 100 oz; stocks: 1 share; crypto CFDs: 1.
   * Used to translate USD risk budget into lot quantity.
   */
  contractSize: number;
  /**
   * Minimum distance in price units between current price and SL/TP.
   * Validated locally before posting to avoid broker-side rejections.
   */
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
  /** MARKET or STOP_ENTRY (stop-entry triggers at triggerPrice). */
  type: 'MARKET' | 'STOP_ENTRY';
  qty: number;
  /** Required for STOP_ENTRY; ignored for MARKET. */
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

// ─── API error ───────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly statusCode: number;
  readonly path: string;
  constructor(statusCode: number, msg: string, path: string) {
    super(`[rstockstrader ${statusCode}] ${msg} (${path})`);
    this.statusCode = statusCode;
    this.path = path;
  }
}

// ─── Token-bucket rate limiter ───────────────────────────────────────────────

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

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefillMs = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSec) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
    this.lastRefillMs = Date.now();
  }
}

// ─── Instrument spec cache (1h per symbol) ───────────────────────────────────

interface SpecCacheEntry {
  spec: RStocksTraderInstrumentSpec;
  expiresAt: number;
}

const SPEC_CACHE_TTL_MS = 60 * 60 * 1000;
const specCache = new Map<string, SpecCacheEntry>();

// ─── Bridge implementation ───────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;

class RStocksTraderBridgeImpl {
  private readonly accountId: string;
  private readonly bucket: TokenBucket;

  constructor(env: RStocksTraderEnv) {
    // Validate env at construction so the error surfaces at deploy handshake,
    // not inside a cron tick.
    if (!env.baseUrl) throw new Error('RSTOCKSTRADER_BASE_URL is required');
    if (!env.token) throw new Error('RSTOCKSTRADER_TOKEN is required');
    if (!env.accountId) throw new Error('RSTOCKSTRADER_ACCOUNT_ID is required');

    this.accountId = env.accountId;
    const rateLimit = Number(process.env.RSTOCKSTRADER_RATE_LIMIT ?? '10');
    this.bucket = new TokenBucket(rateLimit, rateLimit);
  }

  // ─── HTTP plumbing ─────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.bucket.acquire();

    const baseUrl = (process.env.RSTOCKSTRADER_BASE_URL ?? '').replace(/\/$/, '');
    const token = process.env.RSTOCKSTRADER_TOKEN ?? '';

    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
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
      throw new RStocksTraderApiError(
        res.status,
        `non-JSON response: ${text.slice(0, 200)}`,
        path,
      );
    }

    if (!res.ok) {
      const detail = typeof json === 'object' && json !== null
        ? JSON.stringify(json).slice(0, 300)
        : String(json);
      throw new RStocksTraderApiError(res.status, detail, path);
    }

    return json as T;
  }

  // ─── Account ───────────────────────────────────────────────────────────

  /**
   * Returns equity / balance / margin for the configured account.
   *
   * VERIFY: field names against the live GET /accounts/{id} or /account
   * response on the operator dashboard. Common RoboForex field variants:
   *   equity / Equity / account_equity
   *   balance / Balance / account_balance
   *   margin_free / free_margin / marginFree
   */
  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: endpoint path — may be /accounts/{id} or /account
    const raw = await this.request<Record<string, unknown>>(
      'GET',
      `/accounts/${this.accountId}`,
    );
    return {
      accountId: String(raw.id ?? raw.accountId ?? this.accountId),
      currency: String(raw.currency ?? 'USD'),
      balance: Number(raw.balance ?? raw.Balance ?? 0),
      equity: Number(raw.equity ?? raw.Equity ?? 0),
      marginUsed: Number(raw.margin_used ?? raw.marginUsed ?? raw.margin ?? 0),
      marginFree: Number(raw.margin_free ?? raw.marginFree ?? raw.free_margin ?? 0),
    };
  }

  // ─── Instruments ───────────────────────────────────────────────────────

  /**
   * Fetch instrument trading rules, cached for 1h per symbol.
   *
   * VERIFY: endpoint path and field names against GET /instruments/{symbol}.
   * Common variants for contract size: contract_size / contractSize / lot_size.
   * Min stop distance: min_stop_distance / stops_level / minStopDistance.
   */
  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // VERIFY: endpoint path — may be /instruments/{symbol} or /symbols/{symbol}
    const raw = await this.request<Record<string, unknown>>(
      'GET',
      `/instruments/${encodeURIComponent(symbol)}`,
    );

    const spec: RStocksTraderInstrumentSpec = {
      symbol,
      // VERIFY: asset_class field name
      assetClass: mapAssetClass(String(raw.asset_class ?? raw.assetClass ?? raw.type ?? 'fx')),
      minQty: Number(raw.min_qty ?? raw.minQty ?? raw.min_lot ?? 0.01),
      qtyStep: Number(raw.qty_step ?? raw.qtyStep ?? raw.lot_step ?? 0.01),
      tickSize: Number(raw.tick_size ?? raw.tickSize ?? raw.pip_size ?? 0.00001),
      // VERIFY: contract_size field — FX = 100000, gold = 100, stocks = 1
      contractSize: Number(raw.contract_size ?? raw.contractSize ?? raw.lot_size ?? 100000),
      minStopDistance: Number(raw.min_stop_distance ?? raw.minStopDistance ?? raw.stops_level ?? 0),
      digits: Number(raw.digits ?? raw.decimal_places ?? 5),
    };

    specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  }

  // ─── Orders ────────────────────────────────────────────────────────────

  /**
   * Place a bracket order (entry + attached SL/TP).
   *
   * Returns a non-throwing 'rejected' result for broker-side validation
   * errors (bad stop distance, insufficient margin, etc.).
   * Only network / 5xx errors throw.
   *
   * VERIFY: endpoint path, body field names, and order type strings.
   * Common variants:
   *   type: 'market' | 'stop' vs 'MARKET' | 'STOP_ENTRY'
   *   stop_loss vs stopLoss vs sl
   *   take_profit vs takeProfit vs tp
   *   client_ref vs clientRef vs comment
   */
  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    const dryRun = currentMode() === 'disabled';
    if (dryRun) {
      const safe: Record<string, unknown> = { symbol: input.symbol };
      console.log('[rstockstrader] DRY-RUN (placeOrder) — EXECUTION_MODE=disabled —', JSON.stringify(safe));
      return {
        brokerOrderId: `dry-run-${Date.now()}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: endpoint path and body shape
    const body: Record<string, unknown> = {
      account_id: this.accountId,
      symbol: input.symbol,
      // VERIFY: side values — 'buy'/'sell' vs 'BUY'/'SELL'
      side: input.side.toLowerCase(),
      // VERIFY: type values — 'market'/'stop_entry' vs 'MARKET'/'STOP_ENTRY'
      type: input.type.toLowerCase(),
      qty: input.qty,
      stop_loss: input.stopLoss,
      take_profit: input.takeProfit,
      // VERIFY: client reference field name
      client_ref: input.clientRef,
    };
    if (input.triggerPrice !== undefined) {
      // VERIFY: trigger price field name — 'price'/'trigger_price'/'entry_price'
      body.price = input.triggerPrice;
    }
    if (input.comment) body.comment = input.comment;

    try {
      // VERIFY: endpoint path — may be /orders or /accounts/{id}/orders
      const raw = await this.request<Record<string, unknown>>('POST', '/orders', body);
      return mapOrderResponse(raw, input.clientRef);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.statusCode >= 400 && err.statusCode < 500) {
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

  // ─── Cancel ────────────────────────────────────────────────────────────

  /**
   * Cancel a pending entry order. Idempotent: unknown / already-filled /
   * already-cancelled orders resolve without throwing.
   *
   * VERIFY: endpoint path and HTTP method (DELETE vs PATCH with status).
   */
  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (currentMode() === 'disabled') {
      console.log('[rstockstrader] DRY-RUN (cancelOrder) — EXECUTION_MODE=disabled');
      return;
    }
    try {
      // VERIFY: endpoint path
      await this.request('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.statusCode === 404 || err.statusCode === 422)) {
        // 404 = not found; 422 = already filled/cancelled — both are idempotent ok
        return;
      }
      throw err;
    }
  }

  // ─── Positions ─────────────────────────────────────────────────────────

  /**
   * All currently open positions on the configured account.
   *
   * VERIFY: endpoint path and field names.
   * Common variants: /positions vs /accounts/{id}/positions
   */
  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: endpoint path
    const raw = await this.request<unknown[]>(
      'GET',
      `/accounts/${this.accountId}/positions`,
    );
    if (!Array.isArray(raw)) return [];
    return raw.map(mapPosition);
  }

  /**
   * Close an open position at market. Idempotent: already-closed or unknown
   * positions resolve without throwing.
   *
   * VERIFY: endpoint path and HTTP method (DELETE vs POST /positions/{id}/close).
   */
  async closePosition(positionId: string): Promise<void> {
    if (currentMode() === 'disabled') {
      console.log('[rstockstrader] DRY-RUN (closePosition) — EXECUTION_MODE=disabled');
      return;
    }
    try {
      // VERIFY: endpoint path
      await this.request('DELETE', `/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.statusCode === 404 || err.statusCode === 422)) {
        return;
      }
      throw err;
    }
  }
}

// ─── Response mappers ────────────────────────────────────────────────────────

function mapOrderResponse(raw: Record<string, unknown>, clientRef: string): RStocksTraderPlaceResult {
  // VERIFY: field names in the order response
  const statusRaw = String(raw.status ?? raw.Status ?? 'pending').toLowerCase();
  let status: RStocksTraderPlaceResult['status'] = 'pending';
  if (statusRaw === 'filled' || statusRaw === 'executed') status = 'filled';
  else if (statusRaw === 'partially_filled' || statusRaw === 'partial') status = 'partially_filled';
  else if (statusRaw === 'rejected' || statusRaw === 'error') status = 'rejected';

  return {
    // VERIFY: id field name — 'id'/'orderId'/'order_id'
    brokerOrderId: String(raw.id ?? raw.orderId ?? raw.order_id ?? ''),
    clientRef: String(raw.client_ref ?? raw.clientRef ?? clientRef),
    status,
    filledQty: raw.filled_qty !== undefined ? Number(raw.filled_qty ?? raw.filledQty) : undefined,
    avgFillPrice: raw.avg_fill_price !== undefined ? Number(raw.avg_fill_price ?? raw.avgFillPrice) : undefined,
    rejectReason: typeof raw.reject_reason === 'string' ? raw.reject_reason : undefined,
  };
}

function mapPosition(raw: unknown): RStocksTraderPosition {
  const r = raw as Record<string, unknown>;
  const sideRaw = String(r.side ?? r.Side ?? 'BUY').toUpperCase();
  return {
    // VERIFY: position id field name
    positionId: String(r.id ?? r.positionId ?? r.position_id ?? ''),
    symbol: String(r.symbol ?? r.Symbol ?? ''),
    side: (sideRaw === 'SELL' ? 'SELL' : 'BUY') as OrderSide,
    qty: Number(r.qty ?? r.lots ?? r.volume ?? 0),
    openPrice: Number(r.open_price ?? r.openPrice ?? r.entry_price ?? 0),
    unrealizedPnl: Number(r.unrealized_pnl ?? r.unrealizedPnl ?? r.profit ?? 0),
    stopLoss: r.stop_loss != null ? Number(r.stop_loss ?? r.stopLoss) : null,
    takeProfit: r.take_profit != null ? Number(r.take_profit ?? r.takeProfit) : null,
  };
}

function mapAssetClass(raw: string): RStocksTraderAssetClass {
  const lc = raw.toLowerCase();
  if (lc.includes('crypto')) return 'crypto-cfd';
  if (lc.includes('stock') || lc.includes('equity')) return 'us-stock';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('metal') || lc.includes('gold') || lc.includes('silver')) return 'metal';
  if (lc.includes('energy') || lc.includes('oil')) return 'energy-cfd';
  if (lc.includes('index') || lc.includes('indice')) return 'index-cfd';
  return 'fx';
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Construct a bridge instance from env. Throws at call time (not at module
 * load) if required env vars are absent — mirrors binance-futures.ts behaviour.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridgeImpl {
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read env vars in one place. Returns null when any required var is unset so
 * the executor dispatch can fail clearly rather than throwing inside a tick.
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
