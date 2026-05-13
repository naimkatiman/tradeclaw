/**
 * R StocksTrader (RoboForex) REST bridge — Phase 2 implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token in every request header.
 * Rate limit: token-bucket, 10 req/sec default (RSTOCKSTRADER_RATE_LIMIT_RPS
 * env var to override once the real limit is confirmed from the API tab).
 *
 * All write paths are guarded by EXECUTION_MODE — 'disabled' short-circuits
 * to a logged dry-run, identical to binance-futures.ts behaviour.
 *
 * Instrument spec is cached for 1h per symbol (process-lifetime Map).
 *
 * API paths below are based on the RoboForex StocksTrader OpenAPI reference.
 * Verify actual field names against the live /instruments and /accounts
 * responses before changing EXECUTION_MODE to testnet or live.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (preserved from original stub) ────────────────────────────

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

// ─── Token-bucket rate limiter ───────────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private lastRefill: number;

  constructor(rps: number) {
    this.capacity = rps;
    this.tokens = rps;
    this.refillPerMs = rps / 1000;
    this.lastRefill = Date.now();
  }

  /** Resolve when a token is available, sleeping in ~10ms increments. */
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
      this.lastRefill = now;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil((1 - this.tokens) / this.refillPerMs);
      await new Promise<void>((r) => setTimeout(r, waitMs));
    }
  }
}

// ─── Spec cache (process-lifetime, 1h TTL) ───────────────────────────────────

interface CachedSpec {
  spec: RStocksTraderInstrumentSpec;
  expiresAt: number;
}

const SPEC_CACHE = new Map<string, CachedSpec>();
const SPEC_TTL_MS = 60 * 60 * 1000;

// ─── Mode helper (mirrors binance-futures.ts) ────────────────────────────────

function getMode(): 'disabled' | 'testnet' | 'live' {
  const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (raw === 'testnet' || raw === 'live') return raw;
  return 'disabled';
}

// ─── Bridge implementation ───────────────────────────────────────────────────

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly env: RStocksTraderEnv;
  private readonly bucket: TokenBucket;

  constructor(env: RStocksTraderEnv) {
    this.env = env;
    const rps = Number(process.env.RSTOCKSTRADER_RATE_LIMIT_RPS ?? '10');
    this.bucket = new TokenBucket(Number.isFinite(rps) && rps > 0 ? rps : 10);
  }

  // ─── HTTP core ─────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.bucket.acquire();

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
      signal: AbortSignal.timeout(15_000),
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

  private ensureWriteAllowed(action: string, symbol: string): boolean {
    const mode = getMode();
    if (mode === 'disabled') {
      console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled — symbol=${symbol}`);
      return false;
    }
    return true;
  }

  // ─── Read methods ───────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // GET /accounts/{accountId}
    const raw = await this.request<{
      id: string | number;
      currency: string;
      balance: number | string;
      equity: number | string;
      margin: number | string;
      freeMargin: number | string;
    }>('GET', `/accounts/${this.env.accountId}`);

    return {
      accountId: String(raw.id),
      currency: raw.currency,
      balance: Number(raw.balance),
      equity: Number(raw.equity),
      marginUsed: Number(raw.margin),
      marginFree: Number(raw.freeMargin),
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = SPEC_CACHE.get(symbol);
    if (cached && Date.now() < cached.expiresAt) return cached.spec;

    // GET /instruments/{symbol}
    const raw = await this.request<{
      symbol: string;
      type: string;
      minVolume: number | string;
      volumeStep: number | string;
      tickSize: number | string;
      contractSize: number | string;
      minStopDistance: number | string;
      digits: number;
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: mapTypeToAssetClass(raw.type),
      minQty: Number(raw.minVolume),
      qtyStep: Number(raw.volumeStep),
      tickSize: Number(raw.tickSize),
      contractSize: Number(raw.contractSize),
      minStopDistance: Number(raw.minStopDistance),
      digits: Number(raw.digits),
    };

    SPEC_CACHE.set(symbol, { spec, expiresAt: Date.now() + SPEC_TTL_MS });
    return spec;
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // GET /accounts/{accountId}/positions
    const raw = await this.request<Array<{
      id: string | number;
      symbol: string;
      type: string;
      volume: number | string;
      openPrice: number | string;
      profit: number | string;
      stopLoss: number | string | null;
      takeProfit: number | string | null;
    }>>('GET', `/accounts/${this.env.accountId}/positions`);

    return raw.map((p) => ({
      positionId: String(p.id),
      symbol: p.symbol,
      side: mapPositionTypeSide(p.type),
      qty: Number(p.volume),
      openPrice: Number(p.openPrice),
      unrealizedPnl: Number(p.profit),
      stopLoss: p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.takeProfit != null ? Number(p.takeProfit) : null,
    }));
  }

  // ─── Write methods ──────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!this.ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // Broker-side rejections (bad SL distance, insufficient margin, etc.)
    // should NOT throw — surface them as status='rejected' so the executor
    // can log and continue without marking the signal as an unhandled error.
    try {
      const body: Record<string, unknown> = {
        accountId: this.env.accountId,
        symbol: input.symbol,
        side: input.side,
        orderType: mapOrderType(input.type),
        volume: input.qty,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        comment: input.comment ?? input.clientRef,
        // clientRef maps to the comment/externalId field; used for idempotency.
        externalId: input.clientRef,
      };
      if (input.triggerPrice !== undefined) {
        body.price = input.triggerPrice;
      }

      const raw = await this.request<{
        id: string | number;
        status: string;
        filledVolume?: number | string;
        filledPrice?: number | string;
        rejectReason?: string;
      }>('POST', `/orders`, body);

      const status = normalizeStatus(raw.status);
      return {
        brokerOrderId: String(raw.id),
        clientRef: input.clientRef,
        status,
        filledQty: raw.filledVolume != null ? Number(raw.filledVolume) : undefined,
        avgFillPrice: raw.filledPrice != null ? Number(raw.filledPrice) : undefined,
        rejectReason: raw.rejectReason,
      };
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.httpStatus >= 400 && err.httpStatus < 500) {
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
    if (!this.ensureWriteAllowed('cancelOrder', brokerOrderId)) return;
    try {
      await this.request<unknown>('DELETE', `/orders/${encodeURIComponent(brokerOrderId)}`);
    } catch (err) {
      // 404 / "order not found" = already gone; treat as success for idempotency.
      if (err instanceof RStocksTraderApiError && (err.httpStatus === 404 || err.httpStatus === 410)) return;
      throw err;
    }
  }

  async closePosition(positionId: string): Promise<void> {
    if (!this.ensureWriteAllowed('closePosition', positionId)) return;
    try {
      await this.request<unknown>('DELETE', `/accounts/${this.env.accountId}/positions/${encodeURIComponent(positionId)}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.httpStatus === 404 || err.httpStatus === 410)) return;
      throw err;
    }
  }
}

// ─── API error type ──────────────────────────────────────────────────────────

export class RStocksTraderApiError extends Error {
  readonly httpStatus: number;
  readonly path: string;
  constructor(httpStatus: number, msg: string, path: string) {
    super(`[rstockstrader ${httpStatus}] ${msg} (${path})`);
    this.httpStatus = httpStatus;
    this.path = path;
  }
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────

function mapTypeToAssetClass(type: string): RStocksTraderAssetClass {
  const t = type.toLowerCase();
  if (t.includes('crypto')) return 'crypto-cfd';
  if (t.includes('fx') || t.includes('forex')) return 'fx';
  if (t.includes('metal') || t === 'xauusd' || t === 'xagusd') return 'metal';
  if (t.includes('energy') || t.includes('oil')) return 'energy-cfd';
  if (t.includes('etf')) return 'us-etf';
  if (t.includes('index')) return 'index-cfd';
  return 'us-stock';
}

function mapPositionTypeSide(type: string): OrderSide {
  return type.toLowerCase().includes('sell') ? 'SELL' : 'BUY';
}

function mapOrderType(type: RStocksTraderOrderType): string {
  switch (type) {
    case 'MARKET':     return 'market';
    case 'LIMIT':      return 'limit';
    case 'STOP_ENTRY': return 'stop';
  }
}

function normalizeStatus(raw: string): RStocksTraderPlaceResult['status'] {
  const s = raw.toLowerCase();
  if (s === 'filled' || s === 'executed') return 'filled';
  if (s.includes('partial')) return 'partially_filled';
  if (s === 'rejected' || s === 'canceled' || s === 'cancelled') return 'rejected';
  return 'pending';
}

// ─── Public factory ──────────────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  return new RStocksTraderBridgeImpl(env);
}

export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
