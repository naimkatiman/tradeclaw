/**
 * R StocksTrader (RoboForex) REST bridge.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Auth: Bearer token in Authorization header.
 * Rate limit: token-bucket, default 10 req/s (verify from API dashboard).
 * All write methods are gated by EXECUTION_MODE — disabled → dry-run logged,
 * no HTTP call made. Mirrors the guard in binance-futures.ts.
 *
 * Endpoint paths follow the plan's description; exact paths and field names
 * must be verified against the live R StocksTrader API dashboard before
 * enabling EXECUTION_MODE=testnet.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (re-exported for executor consumption) ────────────────────

export interface RStocksTraderInstrumentSpec {
  symbol: string;
  assetClass: RStocksTraderAssetClass;
  minQty: number;
  qtyStep: number;
  tickSize: number;
  /** Base units per 1 lot (FX: 100 000; XAUUSD: 100; stocks: 1). */
  contractSize: number;
  /** Min distance in price units between current price and SL/TP. */
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
  qty: number;
  /** Absolute stop-loss price. */
  stopLoss: number;
  /** Absolute take-profit price. */
  takeProfit: number;
  /**
   * Idempotency key ≤ 64 chars. Bridge maps it to whatever client-reference
   * field R StocksTrader exposes (verify name from API dashboard).
   */
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

/** Normalised candle shape — compatible with BinanceKline so shared filters work. */
export interface RStocksTraderCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

// ─── Rate limiter ───────────────────────────────────────────────────────────

/**
 * Simple token-bucket. One instance per bridge → shared across all calls on
 * the same token. Default 10 req/s; adjust via RSTOCKSTRADER_RATE_LIMIT_RPS.
 */
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

  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until we have one token
    const waitMs = Math.ceil((1 - this.tokens) / this.refillPerMs);
    await new Promise((r) => setTimeout(r, waitMs));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// ─── Bridge implementation ──────────────────────────────────────────────────

const REQ_TIMEOUT_MS = 10_000;

function getExecutionMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function isWriteAllowed(action: string, symbol?: string): boolean {
  if (getExecutionMode() === 'disabled') {
    console.log(`[rstockstrader] DRY-RUN (${action}) — EXECUTION_MODE=disabled${symbol ? ` — ${symbol}` : ''}`);
    return false;
  }
  return true;
}

class RStocksTraderApiError extends Error {
  readonly status: number;
  constructor(status: number, msg: string, path: string) {
    super(`[rstockstrader ${status}] ${msg} (${path})`);
    this.status = status;
  }
}

class RStocksTraderBridgeImpl {
  private readonly env: RStocksTraderEnv;
  private readonly bucket: TokenBucket;
  /** 1-hour cache keyed by R StocksTrader symbol code. */
  private readonly specCache = new Map<string, { spec: RStocksTraderInstrumentSpec; expiresAt: number }>();

  constructor(env: RStocksTraderEnv, rps: number) {
    this.env = env;
    this.bucket = new TokenBucket(rps);
  }

  // ─── HTTP helper ──────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
  ): Promise<T> {
    await this.bucket.consume();

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
      throw new RStocksTraderApiError(res.status, `non-JSON response: ${text.slice(0, 200)}`, path);
    }

    if (!res.ok) {
      const err = json as { message?: string; error?: string } | null;
      const msg = err?.message ?? err?.error ?? text.slice(0, 200);
      throw new RStocksTraderApiError(res.status, msg, path);
    }

    return json as T;
  }

  // ─── Account ──────────────────────────────────────────────────────────────

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    const raw = await this.request<{
      id: string | number;
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

  // ─── Instrument spec (cached 1h) ──────────────────────────────────────────

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = this.specCache.get(symbol);
    if (cached && Date.now() < cached.expiresAt) return cached.spec;

    const raw = await this.request<{
      symbol: string;
      assetClass?: string;
      lotSize?: number;
      minLot?: number;
      lotStep?: number;
      tickSize?: number;
      minStopDistance?: number;
      digits?: number;
      contractSize?: number;
    }>('GET', `/instruments/${encodeURIComponent(symbol)}`);

    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      assetClass: (raw.assetClass ?? 'fx') as RStocksTraderAssetClass,
      minQty: raw.minLot ?? 0.01,
      qtyStep: raw.lotStep ?? 0.01,
      tickSize: raw.tickSize ?? 0.00001,
      contractSize: raw.contractSize ?? 100_000,
      minStopDistance: raw.minStopDistance ?? 0,
      digits: raw.digits ?? 5,
    };

    this.specCache.set(symbol, { spec, expiresAt: Date.now() + 3_600_000 });
    return spec;
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!isWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dryrun-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    let raw: {
      id?: string | number;
      orderId?: string | number;
      clientRef?: string;
      comment?: string;
      status?: string;
      filledQty?: number;
      avgPrice?: number;
      rejectReason?: string;
      message?: string;
    };

    try {
      raw = await this.request<typeof raw>('POST', `/accounts/${this.env.accountId}/orders`, {
        symbol: input.symbol,
        side: input.side,
        type: 'MARKET',
        qty: input.qty,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        clientRef: input.clientRef,
        comment: input.comment,
      });
    } catch (err) {
      if (err instanceof RStocksTraderApiError && err.status < 500) {
        // Broker-side rejection — surface as non-throwing result
        return {
          brokerOrderId: '',
          clientRef: input.clientRef,
          status: 'rejected',
          rejectReason: err.message,
        };
      }
      throw err;
    }

    const brokerId = String(raw.id ?? raw.orderId ?? '');
    const statusRaw = (raw.status ?? '').toLowerCase();
    const status: RStocksTraderPlaceResult['status'] =
      statusRaw === 'filled' ? 'filled'
      : statusRaw === 'partially_filled' ? 'partially_filled'
      : statusRaw === 'rejected' ? 'rejected'
      : 'pending';

    return {
      brokerOrderId: brokerId,
      clientRef: input.clientRef,
      status,
      filledQty: raw.filledQty,
      avgFillPrice: raw.avgPrice,
      rejectReason: status === 'rejected' ? (raw.rejectReason ?? raw.message) : undefined,
    };
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!isWriteAllowed('cancelOrder')) return;
    try {
      await this.request('DELETE', `/accounts/${this.env.accountId}/orders/${brokerOrderId}`);
    } catch (err) {
      // 404 = already gone; treat as success (idempotent)
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 400)) return;
      throw err;
    }
  }

  // ─── Positions ────────────────────────────────────────────────────────────

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    const raw = await this.request<Array<{
      id?: string | number;
      positionId?: string | number;
      symbol: string;
      side: string;
      qty?: number;
      volume?: number;
      openPrice?: number;
      price?: number;
      unrealizedPnl?: number;
      profit?: number;
      stopLoss?: number | null;
      takeProfit?: number | null;
    }>>('GET', `/accounts/${this.env.accountId}/positions`);

    return raw.map((p) => ({
      positionId: String(p.id ?? p.positionId ?? ''),
      symbol: p.symbol,
      side: (p.side?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as OrderSide,
      qty: p.qty ?? p.volume ?? 0,
      openPrice: p.openPrice ?? p.price ?? 0,
      unrealizedPnl: p.unrealizedPnl ?? p.profit ?? 0,
      stopLoss: p.stopLoss ?? null,
      takeProfit: p.takeProfit ?? null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (!isWriteAllowed('closePosition')) return;
    try {
      await this.request('DELETE', `/accounts/${this.env.accountId}/positions/${positionId}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 400)) return;
      throw err;
    }
  }

  /**
   * Fetch H1 OHLCV candles for a symbol. Returns them in BinanceKline shape
   * so the shared filter functions (EMA, ADX) can run without modification.
   *
   * Endpoint: GET /candles?symbol=<symbol>&timeframe=H1&limit=<n>
   * (verify exact path + field names from R StocksTrader API dashboard).
   */
  async getCandles(symbol: string, limit = 100): Promise<RStocksTraderCandle[]> {
    const raw = await this.request<Array<{
      time?: number;
      timestamp?: number;
      open: number | string;
      high: number | string;
      low: number | string;
      close: number | string;
      volume?: number | string;
    }>>('GET', `/candles?symbol=${encodeURIComponent(symbol)}&timeframe=H1&limit=${limit}`);

    return raw.map((k) => ({
      openTime: k.time ?? k.timestamp ?? 0,
      open: Number(k.open),
      high: Number(k.high),
      low: Number(k.low),
      close: Number(k.close),
      volume: Number(k.volume ?? 0),
      closeTime: 0,
    }));
  }
}

// ─── Factory + env helpers ──────────────────────────────────────────────────

/**
 * Read environment, validate presence, return a bridge instance.
 * Throws at call-site (NOT at module-load) if any env var is missing —
 * matches binance-futures.ts behaviour so misconfigured deploys fail the
 * handshake cron, not the cold boot.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridgeImpl {
  const rps = (() => {
    const v = Number(process.env.RSTOCKSTRADER_RATE_LIMIT_RPS ?? '10');
    return Number.isFinite(v) && v > 0 ? v : 10;
  })();
  return new RStocksTraderBridgeImpl(env, rps);
}

export type RStocksTraderBridge = RStocksTraderBridgeImpl;

/**
 * Read env vars in one place. Returns null when any required var is missing
 * so callers can skip gracefully rather than throwing at module init.
 *
 * Required env:
 *   RSTOCKSTRADER_BASE_URL    e.g. https://stockstrader.roboforex.com/api/v1
 *   RSTOCKSTRADER_TOKEN       Bearer token from the operator dashboard
 *   RSTOCKSTRADER_ACCOUNT_ID  Numeric demo account id
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl, token, accountId };
}
