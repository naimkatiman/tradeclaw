/**
 * R StocksTrader (RoboForex) REST bridge — full implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token via Authorization header.
 * Base URL: RSTOCKSTRADER_BASE_URL (from env; exact path confirmed in dashboard).
 * All write calls are gated by EXECUTION_MODE !== 'disabled' — same pattern as
 * binance-futures.ts so the kill-switch works symmetrically.
 *
 * IMPORTANT: exact endpoint paths and field names must be verified against the
 * live /instruments and /accounts responses in the operator dashboard before
 * the first real order is placed. URL patterns below follow the most common
 * RoboForex REST conventions but MAY need adjustment.
 *
 * Rate limiter: token-bucket, default 10 req/s (configurable via
 * RSTOCKSTRADER_RATE_LIMIT env var). Shared across the bridge instance.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (kept in sync with the interface sketch below) ────────────

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

// ─── API error ──────────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly statusCode: number;
  readonly path: string;
  constructor(statusCode: number, msg: string, path: string) {
    super(`[rst ${statusCode}] ${msg} (${path})`);
    this.statusCode = statusCode;
    this.path = path;
  }
}

// ─── Token-bucket rate limiter ───────────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(private readonly ratePerSec: number) {
    this.tokens = ratePerSec;
    this.lastRefillMs = Date.now();
  }

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillMs) / 1_000;
    this.tokens = Math.min(this.ratePerSec, this.tokens + elapsedSec * this.ratePerSec);
    this.lastRefillMs = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for next token
    const waitMs = Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1_000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
  }
}

const REQ_TIMEOUT_MS = 10_000;
const DEFAULT_RATE_PER_SEC = 10;

// ─── Bridge implementation ───────────────────────────────────────────────────

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly bucket: TokenBucket;
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();
  private readonly SPEC_TTL_MS = 60 * 60_000; // 1 h

  constructor(private readonly env: RStocksTraderEnv) {
    const rate = Number(process.env.RSTOCKSTRADER_RATE_LIMIT ?? DEFAULT_RATE_PER_SEC);
    this.bucket = new TokenBucket(Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_RATE_PER_SEC);
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    await this.bucket.consume();

    const url = `${this.env.baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.env.token}`,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

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
      throw new Error(`RST non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      const err = json as { message?: string; error?: string } | null;
      const msg = err?.message ?? err?.error ?? text;
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }

  private isDryRun(action: string, meta: Record<string, unknown>): boolean {
    const mode = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
    if (mode === 'disabled') {
      const safe: Record<string, unknown> = {};
      if (typeof meta.symbol === 'string') safe.symbol = meta.symbol;
      console.log(`[rst] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(safe));
      return true;
    }
    return false;
  }

  // ── Public surface ────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // Verify exact path + field names against live /accounts/{id} response.
    const raw = await this.request<{
      id?: string;
      accountId?: string;
      currency?: string;
      balance?: number;
      equity?: number;
      margin?: number;
      marginUsed?: number;
      freeMargin?: number;
      marginFree?: number;
    }>('GET', `/accounts/${this.env.accountId}`);

    return {
      accountId: String(raw.id ?? raw.accountId ?? this.env.accountId),
      currency: raw.currency ?? 'USD',
      balance: Number(raw.balance ?? 0),
      equity: Number(raw.equity ?? 0),
      marginUsed: Number(raw.marginUsed ?? raw.margin ?? 0),
      marginFree: Number(raw.marginFree ?? raw.freeMargin ?? 0),
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // Verify exact field names against live /instruments/{symbol} response.
    const raw = await this.request<{
      symbol?: string;
      assetClass?: string;
      asset_class?: string;
      minQty?: number;
      min_qty?: number;
      minVolume?: number;
      qtyStep?: number;
      qty_step?: number;
      volumeStep?: number;
      tickSize?: number;
      tick_size?: number;
      point?: number;
      contractSize?: number;
      contract_size?: number;
      minStopDistance?: number;
      min_stop_distance?: number;
      stopsLevel?: number;
      digits?: number;
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol ?? symbol,
      assetClass: (raw.assetClass ?? raw.asset_class ?? 'fx') as RStocksTraderAssetClass,
      minQty: Number(raw.minQty ?? raw.min_qty ?? raw.minVolume ?? 0.01),
      qtyStep: Number(raw.qtyStep ?? raw.qty_step ?? raw.volumeStep ?? 0.01),
      tickSize: Number(raw.tickSize ?? raw.tick_size ?? raw.point ?? 0.00001),
      contractSize: Number(raw.contractSize ?? raw.contract_size ?? 100_000),
      minStopDistance: Number(raw.minStopDistance ?? raw.min_stop_distance ?? raw.stopsLevel ?? 0),
      digits: Number(raw.digits ?? 5),
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + this.SPEC_TTL_MS });
    return spec;
  }

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (this.isDryRun('placeOrder', { symbol: input.symbol })) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // Verify exact field names against live API tab.
    // R StocksTrader typically accepts a single order object with attached SL/TP.
    const orderType = this.mapOrderType(input.type);
    const body: Record<string, unknown> = {
      accountId: this.env.accountId,
      symbol: input.symbol,
      side: input.side,
      type: orderType,
      volume: input.qty,
      stopLoss: roundToDigits(input.stopLoss, 8),
      takeProfit: roundToDigits(input.takeProfit, 8),
      clientRef: input.clientRef,
    };
    if (input.triggerPrice !== undefined) body.price = roundToDigits(input.triggerPrice, 8);
    if (input.comment) body.comment = input.comment;

    const raw = await this.request<{
      id?: string;
      orderId?: string;
      clientRef?: string;
      comment?: string;
      status?: string;
      filledQty?: number;
      filledVolume?: number;
      avgFillPrice?: number;
      openPrice?: number;
      rejectReason?: string;
    }>('POST', '/orders', body);

    return {
      brokerOrderId: String(raw.id ?? raw.orderId ?? ''),
      clientRef: raw.clientRef ?? raw.comment ?? input.clientRef,
      status: mapOrderStatus(raw.status ?? 'pending'),
      filledQty: raw.filledQty ?? raw.filledVolume,
      avgFillPrice: raw.avgFillPrice ?? raw.openPrice,
      rejectReason: raw.rejectReason,
    };
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (this.isDryRun('cancelOrder', { brokerOrderId })) return;

    try {
      await this.request('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      // 404 = already gone / filled / cancelled — treat as success (idempotent)
      if (err instanceof RStocksTraderApiError && (err.statusCode === 404 || err.statusCode === 400)) return;
      throw err;
    }
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    const raw = await this.request<Array<{
      id?: string;
      positionId?: string;
      symbol: string;
      side: string;
      volume?: number;
      qty?: number;
      openPrice?: number;
      entryPrice?: number;
      profit?: number;
      unrealizedPnl?: number;
      stopLoss?: number | null;
      takeProfit?: number | null;
    }>>('GET', `/positions?account=${encodeURIComponent(this.env.accountId)}`);

    return raw.map((p) => ({
      positionId: String(p.id ?? p.positionId ?? ''),
      symbol: p.symbol,
      side: (p.side?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as OrderSide,
      qty: Number(p.volume ?? p.qty ?? 0),
      openPrice: Number(p.openPrice ?? p.entryPrice ?? 0),
      unrealizedPnl: Number(p.profit ?? p.unrealizedPnl ?? 0),
      stopLoss: p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.takeProfit != null ? Number(p.takeProfit) : null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (this.isDryRun('closePosition', { positionId })) return;

    try {
      await this.request('DELETE', `/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      // 404 = already closed — idempotent
      if (err instanceof RStocksTraderApiError && (err.statusCode === 404 || err.statusCode === 400)) return;
      throw err;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private mapOrderType(type: RStocksTraderOrderType): string {
    // Verify exact type strings against live API tab.
    switch (type) {
      case 'MARKET':     return 'market';
      case 'LIMIT':      return 'limit';
      case 'STOP_ENTRY': return 'stop';
    }
  }
}

// ─── Public factory ──────────────────────────────────────────────────────────

/**
 * Construct a bridge from explicit env config. Throws at call-site (not at
 * module load) if the env block is incomplete — matches binance-futures.ts
 * behaviour so a misconfigured deploy fails the handshake, not cold boot.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  if (!env.baseUrl || !env.token || !env.accountId) {
    throw new Error('rstockstrader-bridge: baseUrl, token, and accountId are all required');
  }
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read env vars in one place. Returns null when any required var is absent —
 * the executor dispatch layer can skip the tick without throwing.
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
  return { baseUrl, token, accountId };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function mapOrderStatus(s: string): RStocksTraderPlaceResult['status'] {
  const lc = s.toLowerCase();
  if (lc === 'filled') return 'filled';
  if (lc === 'partially_filled' || lc === 'partial') return 'partially_filled';
  if (lc === 'rejected' || lc === 'error') return 'rejected';
  return 'pending';
}

function roundToDigits(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}
