/**
 * R StocksTrader (RoboForex) REST bridge — full implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * IMPORTANT — endpoint paths and request body field names are PROVISIONAL.
 * Verify every marked constant against the operator dashboard's "API" tab
 * before enabling EXECUTION_BROKER=r-stockstrader in production. The
 * comments tag provisional items with "TODO-VERIFY".
 *
 * Auth: Bearer token in Authorization header.
 * Rate limit: token-bucket, 10 req/s default (RSTOCKSTRADER_RATE_PER_SEC).
 * Dry-run: all write methods skip the HTTP call when
 *   EXECUTION_MODE=disabled, matching binance-futures.ts behaviour.
 * Idempotency: cancelOrder and closePosition are idempotent — HTTP 404/409
 *   (order already gone) resolves without throwing.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

const REQ_TIMEOUT_MS = 10_000;
const SPEC_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// ─── Token bucket ────────────────────────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillPerSec: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSec) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
  }
}

// ─── Error type ──────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly path: string,
  ) {
    const msg = extractErrorMessage(body);
    super(`[r-stockstrader ${status}] ${msg} (${path})`);
  }
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    const msg = b.message ?? b.error ?? b.msg ?? b.detail;
    if (typeof msg === 'string') return msg;
  }
  return String(body ?? 'unknown error').slice(0, 200);
}

/** HTTP 404 or 409 on a cancel/close = already gone → treat as success. */
function isAlreadyGone(err: unknown): boolean {
  return err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 409);
}

// ─── Dry-run guard (mirrors binance-futures.ts) ───────────────────────────────

function executionMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, payload: Record<string, unknown>): boolean {
  if (executionMode() === 'disabled') {
    const safe: Record<string, unknown> = {};
    if (typeof payload.symbol === 'string') safe.symbol = payload.symbol;
    console.log(`[r-stockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(safe));
    return false;
  }
  return true;
}

// ─── Asset-class inference ───────────────────────────────────────────────────

function inferAssetClass(symbol: string): RStocksTraderAssetClass {
  // These heuristics cover the symbols in rstockstrader-symbols.ts.
  // If the bridge were to encounter an unknown symbol from /instruments
  // the default 'fx' is the safest wrong answer (smallest contractSize).
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') ||
      symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('BNB')) {
    return 'crypto-cfd';
  }
  if (symbol.includes('XAU') || symbol.includes('XAG')) return 'metal';
  if (symbol.includes('XTI') || symbol.includes('WTI') || symbol.includes('OIL')) return 'energy-cfd';
  if (symbol.endsWith('.US')) return 'us-stock';
  if (symbol === 'SPY.US' || symbol === 'QQQ.US' || symbol === 'BNO.US') return 'us-etf';
  return 'fx';
}

function normalizeOrderStatus(raw: string): RStocksTraderPlaceResult['status'] {
  const s = raw.toLowerCase();
  if (s === 'filled' || s === 'executed') return 'filled';
  if (s === 'partially_filled' || s === 'partial') return 'partially_filled';
  if (s === 'rejected' || s === 'refused') return 'rejected';
  return 'pending';
}

// ─── Interface definitions (kept here so callers only import this file) ───────

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

// ─── Bridge implementation ───────────────────────────────────────────────────

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly rateLimiter: TokenBucket;
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();

  constructor(private readonly env: RStocksTraderEnv, ratePerSec = 10) {
    this.rateLimiter = new TokenBucket(ratePerSec, ratePerSec);
  }

  // ─── Account ────────────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // TODO-VERIFY: confirm path and field names against dashboard API tab.
    // Common patterns: /accounts/{id}, /trading-accounts/{id}, /account
    const raw = await this.request<{
      id: string | number;
      currency: string;
      balance: number;
      equity: number;
      margin?: number;
      marginUsed?: number;
      freeMargin?: number;
      marginFree?: number;
    }>('GET', `/accounts/${encodeURIComponent(this.env.accountId)}`);

    return {
      accountId: String(raw.id),
      currency: raw.currency,
      balance: raw.balance,
      equity: raw.equity,
      marginUsed: raw.margin ?? raw.marginUsed ?? 0,
      marginFree: raw.freeMargin ?? raw.marginFree ?? raw.equity - (raw.margin ?? raw.marginUsed ?? 0),
    };
  }

  // ─── Instrument spec (cached 1h) ─────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // TODO-VERIFY: confirm path and field names. Common broker field names are
    // listed as alternatives — keep the one that matches the live response.
    const raw = await this.request<{
      symbol: string;
      digits: number;
      // quantity / lot fields — broker may use different names
      minLot?: number;
      min_lot?: number;
      minQty?: number;
      lotStep?: number;
      lot_step?: number;
      qtyStep?: number;
      // price increment
      tickSize?: number;
      tick_size?: number;
      point?: number;
      // contract size in base-asset units per "1 lot"
      contractSize?: number;
      contract_size?: number;
      lotSize?: number;
      // minimum stop distance in price units
      stopsLevel?: number;
      stops_level?: number;
      minStopDistance?: number;
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    const minQty = raw.minLot ?? raw.min_lot ?? raw.minQty ?? 0.01;
    const qtyStep = raw.lotStep ?? raw.lot_step ?? raw.qtyStep ?? minQty;
    const tickSize = raw.tickSize ?? raw.tick_size ?? raw.point ?? Math.pow(10, -raw.digits);
    const contractSize = raw.contractSize ?? raw.contract_size ?? raw.lotSize ?? 100_000;
    const minStopDistance = raw.stopsLevel ?? raw.stops_level ?? raw.minStopDistance ?? 0;

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: inferAssetClass(raw.symbol),
      minQty,
      qtyStep,
      tickSize,
      contractSize,
      minStopDistance,
      digits: raw.digits,
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  }

  // ─── Order placement ─────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', { symbol: input.symbol })) {
      return {
        brokerOrderId: `dryrun-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // TODO-VERIFY: confirm endpoint path, body field names, and how the broker
    // represents order type (MARKET/LIMIT/STOP_ENTRY) and side (BUY/SELL).
    // The `volume` field name is typical for MT5-derived brokers; `qty` and
    // `quantity` are also common.
    const body: Record<string, unknown> = {
      accountId: this.env.accountId,
      symbol: input.symbol,
      // TODO-VERIFY: confirm side/type string values accepted by the API
      side: input.side,          // 'BUY' or 'SELL'
      type: input.type,          // 'MARKET', 'LIMIT', 'STOP_ENTRY'
      volume: input.qty,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      comment: input.comment ?? `tradeclaw:${input.clientRef}`,
    };

    // Client reference field — may be named clientOrderId, clientRef, comment, or
    // similar depending on broker. TODO-VERIFY.
    body.clientOrderId = input.clientRef;

    if (input.triggerPrice !== undefined) {
      body.price = input.triggerPrice;
    }

    const raw = await this.request<{
      id: string | number;
      status: string;
      filledVolume?: number;
      filled_volume?: number;
      avgFillPrice?: number;
      avg_fill_price?: number;
      reason?: string;
      message?: string;
    }>('POST', '/orders', body);

    const status = normalizeOrderStatus(raw.status);
    return {
      brokerOrderId: String(raw.id),
      clientRef: input.clientRef,
      status,
      filledQty: raw.filledVolume ?? raw.filled_volume,
      avgFillPrice: raw.avgFillPrice ?? raw.avg_fill_price,
      rejectReason: status === 'rejected' ? (raw.reason ?? raw.message) : undefined,
    };
  }

  // ─── Cancel order ─────────────────────────────────────────────────────────

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder', { orderId: brokerOrderId })) return;

    try {
      // TODO-VERIFY: confirm DELETE /orders/{id} path
      await this.request('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      if (isAlreadyGone(err)) return;
      throw err;
    }
  }

  // ─── Positions ────────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // TODO-VERIFY: confirm endpoint path and whether accountId is a path param
    // or a query param. Common alternatives: /positions?accountId=...,
    // /accounts/{id}/positions, /trading-accounts/{id}/positions.
    const raw = await this.request<Array<{
      id: string | number;
      symbol: string;
      side?: string;
      type?: string;
      volume?: number;
      qty?: number;
      openPrice?: number;
      open_price?: number;
      unrealizedPnl?: number;
      unrealized_pnl?: number;
      profit?: number;
      stopLoss?: number | null;
      stop_loss?: number | null;
      takeProfit?: number | null;
      take_profit?: number | null;
    }>>('GET', `/positions`, undefined, { accountId: this.env.accountId });

    return raw.map((p) => ({
      positionId: String(p.id),
      symbol: p.symbol,
      side: ((p.side ?? p.type ?? 'BUY') as string).toUpperCase() as OrderSide,
      qty: p.volume ?? p.qty ?? 0,
      openPrice: p.openPrice ?? p.open_price ?? 0,
      unrealizedPnl: p.unrealizedPnl ?? p.unrealized_pnl ?? p.profit ?? 0,
      stopLoss: p.stopLoss ?? p.stop_loss ?? null,
      takeProfit: p.takeProfit ?? p.take_profit ?? null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition', { positionId })) return;

    try {
      // TODO-VERIFY: confirm path for market-close. Alternatives:
      //   POST /positions/{id}/close  (most common)
      //   DELETE /positions/{id}
      await this.request('POST', `/positions/${encodeURIComponent(positionId)}/close`);
    } catch (err) {
      if (isAlreadyGone(err)) return;
      throw err;
    }
  }

  // ─── HTTP helper ──────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    await this.rateLimiter.waitForToken();

    let url = `${this.env.baseUrl}${path}`;
    if (query) {
      const params = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (params) url = `${url}?${params}`;
    }

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
      throw new Error(`RStocksTrader non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new RStocksTraderApiError(res.status, json, path);
    }

    return json as T;
  }
}

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * Read environment, validate presence, return a live bridge instance.
 * Throws at call-site (NOT at module load) when env vars are missing —
 * matches binance-futures.ts behaviour: a misconfigured deploy fails the
 * handshake cron, not cold boot.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  const ratePerSec = process.env.RSTOCKSTRADER_RATE_PER_SEC
    ? Math.max(1, Number(process.env.RSTOCKSTRADER_RATE_PER_SEC))
    : 10;
  return new RStocksTraderBridgeImpl(env, ratePerSec);
}

/**
 * Read env vars in one place so the executor dispatch layer doesn't need to
 * know about RoboForex specifics.
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
  return { baseUrl: baseUrl.replace(/\/$/, ''), token, accountId };
}
