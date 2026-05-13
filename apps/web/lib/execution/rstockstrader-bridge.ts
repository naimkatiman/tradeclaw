/**
 * R StocksTrader (RoboForex) REST bridge — full implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token via RSTOCKSTRADER_TOKEN.
 * Base URL: RSTOCKSTRADER_BASE_URL (e.g. https://stockstrader.roboforex.com/api/v1)
 *
 * Endpoint paths are annotated with "API-verify:" comments wherever the
 * exact path or field name must be confirmed against the operator's live
 * dashboard before first deployment. All verified endpoints match the
 * RoboForex R StocksTrader REST v1 documentation.
 *
 * EXECUTION_MODE=disabled short-circuits every WRITE method (same pattern
 * as binance-futures.ts). Reads still hit the network.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public interfaces (kept here so bridge.ts is self-contained) ───────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /** Base-asset units per 1 lot (FX: 100 000; XAU: 100 oz; stocks: 1 share). */
  contractSize: number;
  /** Min price-distance between market and any attached SL/TP. */
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

const DEFAULT_RATE_LIMIT = 10; // requests per second — API-verify: confirm from dashboard

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly ratePerSec: number,
    private readonly maxBurst: number,
  ) {
    this.tokens = maxBurst;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxBurst, this.tokens + elapsed * this.ratePerSec);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = Math.ceil((1 - this.tokens) / this.ratePerSec * 1000);
    await new Promise((r) => setTimeout(r, waitMs));
    this.tokens = 0;
  }
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 15_000;

export class RStocksTraderApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly path: string,
  ) {
    super(`[rstockstrader ${status}] ${body.slice(0, 200)} (${path})`);
  }
}

// ─── Bridge implementation ───────────────────────────────────────────────────

export class RStocksTraderBridgeImpl {
  private readonly bucket: TokenBucket;
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
  private readonly SPEC_TTL_MS = 60 * 60 * 1000; // 1 h

  constructor(private readonly env: RStocksTraderEnv) {
    this.bucket = new TokenBucket(DEFAULT_RATE_LIMIT, DEFAULT_RATE_LIMIT * 2);
  }

  // ─── Read endpoints ──────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // API-verify: confirm path /accounts/{id} and field names (balance, equity, margin_free, etc.)
    const raw = await this.get<{
      id: string;
      currency: string;
      balance: number;
      equity: number;
      margin: number;
      free_margin: number;
    }>(`/accounts/${this.env.accountId}`);

    return {
      accountId: String(raw.id),
      currency: raw.currency,
      balance: raw.balance,
      equity: raw.equity,
      marginUsed: raw.margin,
      marginFree: raw.free_margin,
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // API-verify: confirm path /instruments/{symbol} and field names
    const raw = await this.get<{
      symbol: string;
      type: string;          // API-verify: asset class field name
      min_qty: number;       // API-verify
      qty_step: number;      // API-verify
      tick_size: number;     // API-verify
      contract_size: number; // API-verify
      min_stop_distance: number; // API-verify
      digits: number;
    }>(`/instruments/${encodeURIComponent(symbol)}`);

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: mapAssetClass(raw.type),
      minQty: raw.min_qty,
      qtyStep: raw.qty_step,
      tickSize: raw.tick_size,
      contractSize: raw.contract_size,
      minStopDistance: raw.min_stop_distance,
      digits: raw.digits,
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + this.SPEC_TTL_MS });
    return spec;
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // API-verify: confirm path /positions?account_id={id} and field names
    const raw = await this.get<Array<{
      id: string;           // API-verify
      symbol: string;
      type: 'buy' | 'sell'; // API-verify: side field name/values
      volume: number;       // API-verify: qty field name
      open_price: number;   // API-verify
      profit: number;       // API-verify: unrealizedPnl field name
      stop_loss: number | null;
      take_profit: number | null;
    }>>(`/positions?account_id=${encodeURIComponent(this.env.accountId)}`);

    return raw.map((p) => ({
      positionId: String(p.id),
      symbol: p.symbol,
      side: p.type === 'buy' ? 'BUY' : 'SELL',
      qty: p.volume,
      openPrice: p.open_price,
      unrealizedPnl: p.profit,
      stopLoss: p.stop_loss,
      takeProfit: p.take_profit,
    }));
  }

  // ─── Write endpoints (gated by EXECUTION_MODE) ───────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${Date.now()}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // Reject locally if stop distance is too small — avoids a broker round-trip
    // for a deterministically-rejected order.
    const spec = await this.getInstrumentSpec(input.symbol);
    if (input.type === 'MARKET') {
      const stopDist = Math.abs(input.stopLoss - (input.triggerPrice ?? 0));
      if (stopDist > 0 && stopDist < spec.minStopDistance) {
        return {
          brokerOrderId: '',
          clientRef: input.clientRef,
          status: 'rejected',
          rejectReason: `stop_too_close: distance ${stopDist} < minStopDistance ${spec.minStopDistance}`,
        };
      }
    }

    // API-verify: confirm POST /orders payload field names and accepted values
    const body: Record<string, unknown> = {
      account_id: this.env.accountId,
      symbol: input.symbol,
      side: input.side === 'BUY' ? 'buy' : 'sell', // API-verify: side values
      type: mapOrderType(input.type),               // API-verify: type values
      volume: input.qty,                            // API-verify: qty field name
      stop_loss: input.stopLoss,
      take_profit: input.takeProfit,
      client_order_id: input.clientRef,             // API-verify: idempotency field name
    };
    if (input.type !== 'MARKET' && input.triggerPrice !== undefined) {
      body.price = input.triggerPrice;              // API-verify: price field name
    }
    if (input.comment) body.comment = input.comment;

    try {
      const raw = await this.post<{
        id: string;           // API-verify: order id field name
        client_order_id: string;
        status: string;       // API-verify: status values
        filled_volume?: number;
        fill_price?: number;
        reject_reason?: string;
      }>('/orders', body);

      return {
        brokerOrderId: String(raw.id),
        clientRef: raw.client_order_id ?? input.clientRef,
        status: mapOrderStatus(raw.status),
        filledQty: raw.filled_volume,
        avgFillPrice: raw.fill_price,
        rejectReason: raw.reject_reason,
      };
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.status >= 400 && err.status < 500) {
        return {
          brokerOrderId: '',
          clientRef: input.clientRef,
          status: 'rejected',
          rejectReason: err.body.slice(0, 200),
        };
      }
      throw err;
    }
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder', brokerOrderId)) return;
    try {
      // API-verify: confirm DELETE /orders/{id} path
      await this.delete(`/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      // Already cancelled, filled, or unknown → idempotent success
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 409)) return;
      throw err;
    }
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition', positionId)) return;
    try {
      // API-verify: confirm DELETE /positions/{id} path
      await this.delete(`/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 409)) return;
      throw err;
    }
  }

  // ─── HTTP primitives ─────────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    await this.bucket.acquire();

    const url = `${this.env.baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.env.token}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    });

    const text = await res.text();
    if (!res.ok) throw new RStocksTraderApiError(res.status, text, path);

    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new RStocksTraderApiError(res.status, `non-JSON: ${text.slice(0, 100)}`, path);
    }
  }
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

// API-verify: actual asset-type strings returned by /instruments
function mapAssetClass(raw: string): RStocksTraderAssetClass {
  const lc = raw.toLowerCase();
  if (lc.includes('crypto')) return 'crypto-cfd';
  if (lc.includes('fx') || lc.includes('forex') || lc.includes('currency')) return 'fx';
  if (lc.includes('metal') || lc === 'xauusd' || lc === 'xagusd') return 'metal';
  if (lc.includes('energy') || lc.includes('oil')) return 'energy-cfd';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('index')) return 'index-cfd';
  return 'us-stock';
}

// API-verify: exact type strings accepted by POST /orders
function mapOrderType(t: RStocksTraderOrderType): string {
  if (t === 'MARKET') return 'market';
  if (t === 'LIMIT') return 'limit';
  if (t === 'STOP_ENTRY') return 'stop';
  return 'market';
}

// API-verify: exact status strings returned by POST /orders
function mapOrderStatus(s: string): RStocksTraderPlaceResult['status'] {
  const lc = s.toLowerCase();
  if (lc === 'filled' || lc === 'executed') return 'filled';
  if (lc === 'partially_filled' || lc === 'partial') return 'partially_filled';
  if (lc === 'rejected' || lc === 'error') return 'rejected';
  return 'pending';
}

// ─── Mode guard (mirrors binance-futures.ts ensureWriteAllowed) ──────────────

function ensureWriteAllowed(action: string, ref: string): boolean {
  const mode = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (mode === 'disabled') {
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled — ref=${ref.slice(0, 32)}`);
    return false;
  }
  return true;
}

// ─── Factory / env helpers ───────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridgeImpl {
  if (!env.baseUrl || !env.token || !env.accountId) {
    throw new Error('rstockstrader-bridge: baseUrl, token, and accountId are all required');
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
