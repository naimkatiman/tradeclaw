/**
 * R StocksTrader (RoboForex) REST bridge — MetaApi v1 convention.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Endpoint paths follow the MetaApi MT5 REST API (the protocol used by
 * R StocksTrader). Verify each path against the operator dashboard before
 * first live run — the base URL is operator-configured via
 * RSTOCKSTRADER_BASE_URL and RoboForex may use a custom sub-path prefix.
 *
 * Auth: `auth-token: <token>` header (MetaApi standard).
 * Rate limit: 10 req/s default, override with RSTOCKSTRADER_RATE_LIMIT_RPS.
 *
 * Write methods are gated by EXECUTION_MODE, matching binance-futures.ts
 * behaviour exactly. EXECUTION_MODE=disabled → dry-run log, no HTTP write.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (unchanged from stub) ────────────────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /**
   * USD value of 1 tick move for 1 standard lot, in the account's base
   * currency. Used for risk-first lot sizing: lots = riskUsd / (stopPips * tickValue).
   */
  tickValue: number;
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

// ─── Token bucket rate limiter ──────────────────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly capacity: number, private readonly rps: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + (elapsed / 1000) * this.rps);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }
    const waitMs = Math.ceil(((1 - this.tokens) / this.rps) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
  }
}

const RST_RATE_LIMIT_RPS = (() => {
  const n = Number(process.env.RSTOCKSTRADER_RATE_LIMIT_RPS ?? '10');
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

// One bucket shared across all bridge instances in this process.
const globalBucket = new TokenBucket(RST_RATE_LIMIT_RPS, RST_RATE_LIMIT_RPS);

const REQ_TIMEOUT_MS = 10_000;

function getExecMode(): 'disabled' | 'testnet' | 'live' {
  const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (raw === 'testnet' || raw === 'live') return raw;
  return 'disabled';
}

// ─── HTTP client ────────────────────────────────────────────────────────

async function rstRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  env: RStocksTraderEnv,
  body?: Record<string, unknown>,
): Promise<T> {
  await globalBucket.consume();

  const url = `${env.baseUrl.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    'auth-token': env.token,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`RStocksTrader non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    throw new Error(
      `[rst ${res.status}] ${err?.message ?? err?.error ?? text.slice(0, 200)} (${path})`,
    );
  }

  return json as T;
}

// ─── Instrument spec cache (1-hour TTL per symbol, process-scoped) ──────

interface SpecCacheEntry {
  spec: RStocksTraderInstrumentSpec;
  expiresAt: number;
}
const specCache = new Map<string, SpecCacheEntry>();

// ─── Bridge implementation ──────────────────────────────────────────────

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  constructor(private readonly env: RStocksTraderEnv) {}

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // MetaApi endpoint: GET /users/current/accounts/{id}/account-information
    // Verify path against RoboForex operator dashboard before first run.
    const raw = await rstRequest<{
      balance: number;
      equity: number;
      margin?: number;
      freeMargin?: number;
      currency?: string;
    }>('GET', `/users/current/accounts/${this.env.accountId}/account-information`, this.env);

    return {
      accountId: this.env.accountId,
      currency: raw.currency ?? 'USD',
      balance: raw.balance,
      equity: raw.equity,
      marginUsed: raw.margin ?? 0,
      marginFree: raw.freeMargin ?? raw.equity,
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // MetaApi endpoint: GET /users/current/accounts/{id}/symbols/{symbol}/specification
    const raw = await rstRequest<{
      symbol: string;
      tickSize: number;
      tickValue: number;
      point?: number;
      digits: number;
      minVolume: number;
      maxVolume?: number;
      volumeStep: number;
      contractSize: number;
      // minStopLevel is in "points"; multiply by point to get price distance.
      minStopLevel?: number;
    }>(
      'GET',
      `/users/current/accounts/${this.env.accountId}/symbols/${encodeURIComponent(symbol)}/specification`,
      this.env,
    );

    const point = raw.point ?? raw.tickSize;
    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: 'fx',            // caller overrides via RSTOCKSTRADER_SYMBOLS lookup
      minQty: raw.minVolume,
      qtyStep: raw.volumeStep,
      tickSize: raw.tickSize,
      tickValue: raw.tickValue,
      contractSize: raw.contractSize,
      minStopDistance: (raw.minStopLevel ?? 0) * point,
      digits: raw.digits,
    };

    specCache.set(symbol, { spec, expiresAt: Date.now() + 3_600_000 });
    return spec;
  }

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (getExecMode() === 'disabled') {
      console.log(`[rst] DRY-RUN placeOrder — EXECUTION_MODE=disabled — symbol=${input.symbol}`);
      return { brokerOrderId: 'dry-run', clientRef: input.clientRef, status: 'pending' };
    }

    // Map to MetaApi actionType strings
    const actionType =
      input.type === 'MARKET'
        ? input.side === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL'
        : input.type === 'LIMIT'
        ? input.side === 'BUY' ? 'ORDER_TYPE_BUY_LIMIT' : 'ORDER_TYPE_SELL_LIMIT'
        : input.side === 'BUY' ? 'ORDER_TYPE_BUY_STOP' : 'ORDER_TYPE_SELL_STOP';

    const raw = await rstRequest<{
      numericCode?: number;
      stringCode?: string;
      message?: string;
      orderId?: string;
      positionId?: string;
    }>('POST', `/users/current/accounts/${this.env.accountId}/trade`, this.env, {
      actionType,
      symbol: input.symbol,
      volume: input.qty,
      ...(input.triggerPrice !== undefined ? { openPrice: input.triggerPrice } : {}),
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      clientId: input.clientRef,
      comment: input.comment,
    });

    // MetaApi returns TRADE_RETCODE_REJECT (or similar) for broker rejections
    const code = raw.stringCode ?? '';
    if (code.includes('REJECT') || code.includes('ERROR') || (raw.numericCode !== undefined && raw.numericCode !== 10009)) {
      return {
        brokerOrderId: raw.orderId ?? 'unknown',
        clientRef: input.clientRef,
        status: 'rejected',
        rejectReason: raw.message ?? raw.stringCode ?? `numericCode=${raw.numericCode}`,
      };
    }

    return {
      brokerOrderId: raw.orderId ?? raw.positionId ?? 'unknown',
      clientRef: input.clientRef,
      // Market orders on MT5 fill synchronously; the REST call returns when done.
      status: 'filled',
    };
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (getExecMode() === 'disabled') {
      console.log(`[rst] DRY-RUN cancelOrder — orderId=${brokerOrderId}`);
      return;
    }
    try {
      await rstRequest(
        'POST',
        `/users/current/accounts/${this.env.accountId}/trade`,
        this.env,
        { actionType: 'ORDER_CANCEL', orderId: brokerOrderId },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already filled or cancelled — ignore
      if (msg.includes('DONE') || msg.includes('10009') || msg.includes('10027')) return;
      throw err;
    }
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // MetaApi endpoint: GET /users/current/accounts/{id}/positions
    const raw = await rstRequest<
      Array<{
        id: string;
        symbol: string;
        type: string;    // 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL'
        volume: number;
        openPrice: number;
        profit: number;
        stopLoss?: number | null;
        takeProfit?: number | null;
      }>
    >('GET', `/users/current/accounts/${this.env.accountId}/positions`, this.env);

    return (Array.isArray(raw) ? raw : []).map((p) => ({
      positionId: p.id,
      symbol: p.symbol,
      side: p.type.includes('BUY') ? 'BUY' : ('SELL' as OrderSide),
      qty: p.volume,
      openPrice: p.openPrice,
      unrealizedPnl: p.profit,
      stopLoss: p.stopLoss ?? null,
      takeProfit: p.takeProfit ?? null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (getExecMode() === 'disabled') {
      console.log(`[rst] DRY-RUN closePosition — positionId=${positionId}`);
      return;
    }
    try {
      await rstRequest(
        'POST',
        `/users/current/accounts/${this.env.accountId}/trade`,
        this.env,
        { actionType: 'POSITION_CLOSE_ID', positionId },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already closed — idempotent
      if (msg.includes('DONE') || msg.includes('10009')) return;
      throw err;
    }
  }
}

// ─── Public factories ───────────────────────────────────────────────────

export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read env vars in one place so the executor dispatch layer doesn't need to
 * know about RoboForex specifics. Returns null when any required var is absent
 * so the caller can fail-fast at handshake time rather than mid-tick.
 *
 * Required env:
 *   RSTOCKSTRADER_BASE_URL    e.g. https://mt-client-api-v1.agiliumtrade.ai
 *   RSTOCKSTRADER_TOKEN       Bearer / auth-token from the dashboard
 *   RSTOCKSTRADER_ACCOUNT_ID  Numeric demo account id
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
