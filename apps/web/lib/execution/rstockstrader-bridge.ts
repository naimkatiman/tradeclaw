/**
 * R StocksTrader (RoboForex) REST bridge — full implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token in Authorization header.
 * All writes are guarded by EXECUTION_MODE — identical dry-run semantics to
 * binance-futures.ts. Imports it for the ExecutionMode type only.
 *
 * IMPORTANT: Endpoint paths and field names are based on common RoboForex
 * REST API conventions. Every path marked "VERIFY:" must be confirmed against
 * the operator dashboard's API tab before going live. Do not remove VERIFY
 * comments until the endpoint has been tested against the real API.
 */

import type { ExecutionMode } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

export type { RStocksTraderAssetClass };

// ─── Public types ────────────────────────────────────────────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /** Lot size in base-asset units per 1.0 lot (FX=100000, XAUUSD=100, stocks=1). */
  contractSize: number;
  /** Minimum price distance between current price and SL/TP. */
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
  side: 'BUY' | 'SELL';
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
  side: 'BUY' | 'SELL';
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
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(count = 1): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;

    if (this.tokens < count) {
      const waitMs = ((count - this.tokens) / this.refillPerSecond) * 1000;
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= count;
    }
  }
}

// ─── HTTP error class ─────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly statusCode: number;
  readonly path: string;
  constructor(statusCode: number, msg: string, path: string) {
    super(`[rstockstrader ${statusCode}] ${msg} (${path})`);
    this.statusCode = statusCode;
    this.path = path;
  }
}

// ─── Bridge implementation ────────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;
// VERIFY: confirm actual rate limit from API tab. Default 10/s is conservative.
const RATE_LIMIT_PER_SEC = 10;

class RStocksTraderBridgeImpl {
  private readonly bucket: TokenBucket;
  private readonly specCache: Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>;
  private readonly SPEC_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(private readonly env: RStocksTraderEnv) {
    this.bucket = new TokenBucket(RATE_LIMIT_PER_SEC, RATE_LIMIT_PER_SEC);
    this.specCache = new Map();
  }

  private getMode(): ExecutionMode {
    const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
    if (raw === 'testnet' || raw === 'live') return raw;
    return 'disabled';
  }

  private ensureWriteAllowed(action: string, symbol: string): boolean {
    const mode = this.getMode();
    if (mode === 'disabled') {
      console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled — symbol=${symbol}`);
      return false;
    }
    return true;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.bucket.consume(1);

    const url = `${this.env.baseUrl}${path}`;
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
      const err = json as { message?: string; error?: string } | null;
      const msg = err?.message ?? err?.error ?? text.slice(0, 200);
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }

  // ─── Account ────────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: confirm path and field names against dashboard API tab.
    // Likely: GET /accounts/{accountId} → { id, currency, balance, equity, margin, freeMargin }
    const raw = await this.request<{
      id: string;
      currency: string;
      balance: number;
      equity: number;
      margin: number;
      freeMargin: number;
    }>('GET', `/accounts/${this.env.accountId}`);

    return {
      accountId: String(raw.id),
      currency: raw.currency,
      balance: raw.balance,
      equity: raw.equity,
      marginUsed: raw.margin,
      marginFree: raw.freeMargin,
    };
  }

  // ─── Instrument spec (1h cache) ─────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // VERIFY: confirm path and field names. Likely: GET /instruments/{symbol}
    // Expected response fields: symbol, digits, contractSize, minVolume,
    //   volumeStep, tickSize, stopsLevel (= minStopDistance in price units).
    const raw = await this.request<{
      symbol: string;
      digits: number;
      contractSize: number;
      minVolume: number;
      volumeStep: number;
      tickSize: number;
      stopsLevel: number;
      assetClass?: string;
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: normalizeAssetClass(raw.assetClass ?? ''),
      minQty: raw.minVolume,
      qtyStep: raw.volumeStep,
      tickSize: raw.tickSize,
      contractSize: raw.contractSize,
      minStopDistance: raw.stopsLevel * raw.tickSize,
      digits: raw.digits,
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + this.SPEC_TTL_MS });
    return spec;
  }

  // ─── Order placement ─────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!this.ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: confirm endpoint path, method, and field names.
    // Common convention: POST /orders with attached SL/TP in a single call.
    // Fields below mirror what most RoboForex-family REST APIs use, but
    // exact names (e.g. "volume" vs "qty", "sl" vs "stopLoss") must be
    // confirmed from the dashboard's API tab / Swagger UI.
    const orderType = mapOrderType(input.type);
    const body: Record<string, unknown> = {
      accountId: this.env.accountId,
      symbol: input.symbol,
      orderType,
      side: input.side === 'BUY' ? 'buy' : 'sell',  // VERIFY: casing
      volume: input.qty,                              // VERIFY: "volume" vs "qty"
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      clientRef: input.clientRef,                    // VERIFY: field name for idempotency key
      comment: input.comment ?? `tc:${input.clientRef}`,
    };

    if (input.triggerPrice !== undefined) {
      body.price = input.triggerPrice;               // VERIFY: field name for trigger price
    }

    let raw: {
      orderId?: string;
      id?: string;
      clientRef?: string;
      status?: string;
      filledVolume?: number;
      avgPrice?: number;
      message?: string;
    };

    try {
      raw = await this.request<typeof raw>('POST', '/orders', body);
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

    const brokerId = String(raw.orderId ?? raw.id ?? '');
    const rawStatus = (raw.status ?? '').toLowerCase();
    const status = mapOrderStatus(rawStatus);

    return {
      brokerOrderId: brokerId,
      clientRef: raw.clientRef ?? input.clientRef,
      status,
      filledQty: raw.filledVolume,
      avgFillPrice: raw.avgPrice,
    };
  }

  // ─── Cancel order ────────────────────────────────────────────────────────

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!this.ensureWriteAllowed('cancelOrder', brokerOrderId)) return;

    // VERIFY: confirm path — likely DELETE /orders/{orderId}
    try {
      await this.request<unknown>('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        // 404 = already gone; 400 = already filled/cancelled — treat both as success.
        if (err.statusCode === 404 || err.statusCode === 400) return;
      }
      throw err;
    }
  }

  // ─── Positions ───────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: confirm path and response shape.
    // Likely: GET /positions?accountId={id}
    const raw = await this.request<Array<{
      id?: string;
      positionId?: string;
      symbol: string;
      type?: string;
      side?: string;
      volume?: number;
      qty?: number;
      openPrice?: number;
      profit?: number;
      unrealizedPnl?: number;
      sl?: number;
      stopLoss?: number;
      tp?: number;
      takeProfit?: number;
    }>>('GET', `/positions?accountId=${encodeURIComponent(this.env.accountId)}`);

    return raw.map((p) => {
      const rawSide = (p.type ?? p.side ?? 'buy').toLowerCase();
      return {
        positionId: String(p.positionId ?? p.id ?? ''),
        symbol: p.symbol,
        side: rawSide.includes('sell') || rawSide === 'short' ? 'SELL' : 'BUY',
        qty: p.volume ?? p.qty ?? 0,
        openPrice: p.openPrice ?? 0,
        unrealizedPnl: p.profit ?? p.unrealizedPnl ?? 0,
        stopLoss: p.sl ?? p.stopLoss ?? null,
        takeProfit: p.tp ?? p.takeProfit ?? null,
      };
    });
  }

  async closePosition(positionId: string): Promise<void> {
    if (!this.ensureWriteAllowed('closePosition', positionId)) return;

    // VERIFY: confirm close path. Common patterns:
    //   DELETE /positions/{id}          — direct close at market
    //   POST /positions/{id}/close      — action endpoint
    try {
      await this.request<unknown>('DELETE', `/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError) {
        if (err.statusCode === 404 || err.statusCode === 400) return;
      }
      throw err;
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridgeImpl {
  if (!env.baseUrl || !env.token || !env.accountId) {
    throw new Error(
      'rstockstrader-bridge: RSTOCKSTRADER_BASE_URL, RSTOCKSTRADER_TOKEN, and RSTOCKSTRADER_ACCOUNT_ID are all required',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapOrderType(t: RStocksTraderOrderType): string {
  // VERIFY: exact string values the API expects for each order type.
  switch (t) {
    case 'MARKET': return 'market';
    case 'LIMIT': return 'limit';
    case 'STOP_ENTRY': return 'stop';
  }
}

function mapOrderStatus(raw: string): RStocksTraderPlaceResult['status'] {
  if (raw === 'filled') return 'filled';
  if (raw === 'partially_filled' || raw === 'partial') return 'partially_filled';
  if (raw === 'rejected' || raw === 'canceled' || raw === 'cancelled') return 'rejected';
  return 'pending';
}

function normalizeAssetClass(raw: string): RStocksTraderAssetClass {
  const lc = raw.toLowerCase();
  if (lc.includes('crypto')) return 'crypto-cfd';
  if (lc.includes('stock')) return 'us-stock';
  if (lc.includes('etf')) return 'us-etf';
  if (lc.includes('metal') || lc === 'xauusd' || lc === 'xagusd') return 'metal';
  if (lc.includes('energy') || lc.includes('oil')) return 'energy-cfd';
  if (lc.includes('index')) return 'index-cfd';
  return 'fx';
}
