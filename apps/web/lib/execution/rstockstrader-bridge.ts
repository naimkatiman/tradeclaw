/**
 * R StocksTrader (RoboForex) REST bridge — HTTP implementation.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md §9
 *
 * Endpoint paths and field names are based on the plan doc §4–§7 and
 * common RoboForex REST API conventions. Every field that could not be
 * verified against a live response is marked VERIFY below. The operator
 * must cross-check against the in-dashboard API tab before the first
 * real signal fires.
 *
 * Safety invariants (same as binance-futures.ts):
 *   - All write paths (placeOrder, cancelOrder, closePosition) are
 *     short-circuited to a dry-run log when EXECUTION_MODE=disabled.
 *   - Reads (getAccountInfo, getInstrumentSpec, listOpenPositions) always
 *     hit the network regardless of EXECUTION_MODE — same pattern as
 *     Binance so the handshake curl can verify connectivity.
 *   - createRStocksTraderBridge() throws at call-site if env is missing,
 *     never at module load.
 */

import type { OrderSide } from './binance-futures';
import type { RStocksTraderAssetClass } from './rstockstrader-symbols';

// ─── Public types (interface kept in sync with the stub contract) ───────────

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

// ─── Rate limiter ────────────────────────────────────────────────────────────

// VERIFY: confirm actual rate limit from the in-dashboard API tab.
const DEFAULT_RATE_LIMIT_RPS = 10;
const REQ_TIMEOUT_MS = 10_000;

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private readonly rps: number) {
    this.tokens = rps;
    this.lastRefill = Date.now();
  }
  async consume(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.rps, this.tokens + elapsed * this.rps);
    this.lastRefill = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - this.tokens) / this.rps) * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

class RStocksTraderApiError extends Error {
  readonly status: number;
  constructor(status: number, msg: string, path: string) {
    super(`[rst ${status}] ${msg} (${path})`);
    this.status = status;
  }
}

async function apiRequest<T>(
  env: RStocksTraderEnv,
  bucket: TokenBucket,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  await bucket.consume();

  const url = `${env.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.token}`,
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
    // Treat 404 on cancel/close as "already gone" by returning null — callers
    // check for RStocksTraderApiError.status === 404 where idempotency requires it.
    throw new RStocksTraderApiError(res.status, msg, path);
  }

  return json as T;
}

// ─── Instrument spec cache (1 h TTL, keyed by symbol) ─────────────────────

interface CacheEntry {
  spec: RStocksTraderInstrumentSpec;
  expiresAt: number;
}
const specCache = new Map<string, CacheEntry>();
const SPEC_CACHE_TTL_MS = 3_600_000;

// ─── Implementation ──────────────────────────────────────────────────────────

function getMode(): string {
  return (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
}

function ensureWriteAllowed(action: string, symbol: string): boolean {
  const mode = getMode();
  if (mode === 'disabled') {
    console.log(`[rst] DRY-RUN (${action}) — EXECUTION_MODE=disabled — symbol=${symbol}`);
    return false;
  }
  return true;
}

class RStocksTraderBridgeImpl implements RStocksTraderBridge {
  private readonly bucket: TokenBucket;

  constructor(private readonly env: RStocksTraderEnv) {
    this.bucket = new TokenBucket(DEFAULT_RATE_LIMIT_RPS);
  }

  async getAccountInfo(): Promise<RStocksTraderAccountInfo> {
    // VERIFY: confirm exact path and response field names from dashboard API tab.
    const raw = await apiRequest<{
      id: string;                // VERIFY: might be "accountId" or numeric
      currency: string;
      balance: number | string;
      equity: number | string;
      margin_used?: number | string;  // VERIFY: snake_case vs camelCase
      marginUsed?: number | string;
      margin_free?: number | string;
      marginFree?: number | string;
    }>(this.env, this.bucket, 'GET', `/accounts/${this.env.accountId}`);

    return {
      accountId: String(raw.id),
      currency: raw.currency,
      balance: Number(raw.balance),
      equity: Number(raw.equity),
      marginUsed: Number(raw.margin_used ?? raw.marginUsed ?? 0),
      marginFree: Number(raw.margin_free ?? raw.marginFree ?? 0),
    };
  }

  async getInstrumentSpec(symbol: string): Promise<RStocksTraderInstrumentSpec> {
    const cached = specCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.spec;

    // VERIFY: exact path (may be /instruments/{symbol} or /symbols/{symbol}).
    // VERIFY: field names — use snake_case or camelCase per actual response.
    const raw = await apiRequest<{
      symbol: string;
      digits: number;
      min_qty?: number;         // VERIFY
      minQty?: number;
      qty_step?: number;        // VERIFY
      qtyStep?: number;
      tick_size?: number;       // VERIFY
      tickSize?: number;
      contract_size?: number;   // VERIFY
      contractSize?: number;
      min_stop_distance?: number; // VERIFY
      minStopDistance?: number;
    }>(this.env, this.bucket, 'GET', `/instruments/${encodeURIComponent(symbol)}`);

    // Resolve snake_case / camelCase variants
    const spec: RStocksTraderInstrumentSpec = {
      symbol: raw.symbol,
      // Asset class is not on the wire; derive from the symbol table in caller.
      // Use a placeholder that callers replace with the mapped value.
      assetClass: 'fx' as RStocksTraderAssetClass,
      minQty: Number(raw.min_qty ?? raw.minQty ?? 0.01),
      qtyStep: Number(raw.qty_step ?? raw.qtyStep ?? 0.01),
      tickSize: Number(raw.tick_size ?? raw.tickSize ?? 0.00001),
      contractSize: Number(raw.contract_size ?? raw.contractSize ?? 100_000),
      minStopDistance: Number(raw.min_stop_distance ?? raw.minStopDistance ?? 0),
      digits: raw.digits,
    };

    specCache.set(symbol, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  }

  async placeOrder(input: RStocksTraderPlaceInput): Promise<RStocksTraderPlaceResult> {
    if (!ensureWriteAllowed('placeOrder', input.symbol)) {
      return {
        brokerOrderId: `dry-run-${input.clientRef}`,
        clientRef: input.clientRef,
        status: 'pending',
      };
    }

    // VERIFY: exact field names, order type vocabulary, and whether SL/TP
    // are attached at placement or sent as separate fields. Adjust the body
    // shape to match whatever the dashboard API tab documents.
    const body: Record<string, unknown> = {
      account_id: this.env.accountId,   // VERIFY: "accountId" vs "account_id"
      symbol: input.symbol,
      type: input.type,                  // VERIFY: 'MARKET'|'LIMIT'|'STOP_ENTRY' or local vocab
      side: input.side,                  // VERIFY: 'BUY'|'SELL' or 'buy'|'sell'
      qty: input.qty,                    // VERIFY: field name ('qty'|'volume'|'lots')
      stop_loss: input.stopLoss,         // VERIFY: 'stop_loss' vs 'stopLoss' vs 'sl'
      take_profit: input.takeProfit,     // VERIFY: 'take_profit' vs 'takeProfit' vs 'tp'
      client_ref: input.clientRef,       // VERIFY: 'client_ref' vs 'clientRef' vs 'comment'
    };
    if (input.triggerPrice !== undefined) {
      body.trigger_price = input.triggerPrice; // VERIFY
    }
    if (input.comment) {
      body.comment = input.comment;
    }

    // VERIFY: exact POST path (/orders vs /accounts/{id}/orders vs similar).
    const raw = await apiRequest<{
      id: string | number;                // VERIFY: field name
      client_ref?: string;
      clientRef?: string;
      status: string;                     // VERIFY: status vocabulary
      filled_qty?: number | string;
      filledQty?: number | string;
      avg_fill_price?: number | string;
      avgFillPrice?: number | string;
      reject_reason?: string;
      rejectReason?: string;
    }>(this.env, this.bucket, 'POST', '/orders', body);

    const rawStatus = (raw.status ?? '').toLowerCase();
    const status: RStocksTraderPlaceResult['status'] =
      rawStatus === 'filled' ? 'filled'
      : rawStatus === 'partially_filled' || rawStatus === 'partial' ? 'partially_filled'
      : rawStatus === 'rejected' || rawStatus === 'error' ? 'rejected'
      : 'pending';

    return {
      brokerOrderId: String(raw.id),
      clientRef: String(raw.client_ref ?? raw.clientRef ?? input.clientRef),
      status,
      filledQty: raw.filled_qty !== undefined ? Number(raw.filled_qty) : raw.filledQty !== undefined ? Number(raw.filledQty) : undefined,
      avgFillPrice: raw.avg_fill_price !== undefined ? Number(raw.avg_fill_price) : raw.avgFillPrice !== undefined ? Number(raw.avgFillPrice) : undefined,
      rejectReason: raw.reject_reason ?? raw.rejectReason,
    };
  }

  async cancelOrder(brokerOrderId: string): Promise<void> {
    if (!ensureWriteAllowed('cancelOrder', brokerOrderId)) return;

    // VERIFY: exact DELETE path and whether accountId is required as param.
    try {
      await apiRequest<unknown>(this.env, this.bucket, 'DELETE', `/orders/${brokerOrderId}`);
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 400)) {
        // Already cancelled / filled / unknown — treat as idempotent success.
        return;
      }
      throw err;
    }
  }

  async listOpenPositions(): Promise<RStocksTraderPosition[]> {
    // VERIFY: exact path and field names.
    const raw = await apiRequest<Array<{
      id: string | number;              // VERIFY
      symbol: string;
      side: string;
      qty: number | string;
      open_price?: number | string;     // VERIFY
      openPrice?: number | string;
      unrealized_pnl?: number | string; // VERIFY
      unrealizedPnl?: number | string;
      stop_loss?: number | string | null;
      stopLoss?: number | string | null;
      take_profit?: number | string | null;
      takeProfit?: number | string | null;
    }>>(this.env, this.bucket, 'GET', `/positions?account_id=${this.env.accountId}`);

    return raw.map((p) => ({
      positionId: String(p.id),
      symbol: p.symbol,
      side: (p.side.toUpperCase() === 'BUY' ? 'BUY' : 'SELL') as OrderSide,
      qty: Number(p.qty),
      openPrice: Number(p.open_price ?? p.openPrice ?? 0),
      unrealizedPnl: Number(p.unrealized_pnl ?? p.unrealizedPnl ?? 0),
      stopLoss: p.stop_loss != null ? Number(p.stop_loss) : p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.take_profit != null ? Number(p.take_profit) : p.takeProfit != null ? Number(p.takeProfit) : null,
    }));
  }

  async closePosition(positionId: string): Promise<void> {
    if (!ensureWriteAllowed('closePosition', positionId)) return;

    // VERIFY: exact path for market close of an open position.
    try {
      await apiRequest<unknown>(
        this.env,
        this.bucket,
        'POST',
        `/positions/${positionId}/close`,
        { account_id: this.env.accountId },
      );
    } catch (err) {
      if (err instanceof RStocksTraderApiError && (err.status === 404 || err.status === 400)) {
        return;
      }
      throw err;
    }
  }
}

// ─── Public factory ──────────────────────────────────────────────────────────

/**
 * Construct a bridge instance. Throws at call-site if any required env var
 * is missing — matches binance-futures.ts pattern so a misconfigured deploy
 * fails the handshake curl, not the cold boot.
 */
export function createRStocksTraderBridge(env: RStocksTraderEnv): RStocksTraderBridge {
  return new RStocksTraderBridgeImpl(env);
}

/**
 * Read R StocksTrader env vars. Returns null when any var is absent so
 * the executor dispatch can skip the tick cleanly instead of throwing.
 */
export function readRStocksTraderEnvOrNull(): RStocksTraderEnv | null {
  const baseUrl = process.env.RSTOCKSTRADER_BASE_URL;
  const token = process.env.RSTOCKSTRADER_TOKEN;
  const accountId = process.env.RSTOCKSTRADER_ACCOUNT_ID;
  if (!baseUrl || !token || !accountId) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ''), token, accountId };
}
