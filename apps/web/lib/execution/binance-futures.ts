/**
 * Binance USDⓈ-M Futures REST client.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 *
 * Surface kept minimal — only what TradeClaw Pilot Phase 1 needs.
 * No external SDK; HMAC-SHA256 signing via Node's crypto.
 *
 * Trading venue is determined by BINANCE_BASE_URL:
 *   testnet -> https://testnet.binancefuture.com
 *   live    -> https://fapi.binance.com
 *
 * Market-data venue is BINANCE_MARKET_DATA_URL (optional, defaults to
 * BINANCE_BASE_URL). Set this to mainnet while trading on testnet so the
 * universe screen + ATR/EMA/ADX filters see real liquidity and price
 * action instead of synthetic testnet data. Endpoints split as:
 *   - signed (account, orders)        → BINANCE_BASE_URL
 *   - exchangeInfo (LOT_SIZE filters) → BINANCE_BASE_URL (must match venue)
 *   - serverTime (signing clock)      → BINANCE_BASE_URL
 *   - klines, markPrice, 24h ticker   → BINANCE_MARKET_DATA_URL
 *
 * EXECUTION_MODE=disabled short-circuits every WRITE method to a logged
 * dry-run. Reads still hit the network. This is the kill switch.
 */

import { createHmac } from 'node:crypto';

export type ExecutionMode = 'disabled' | 'testnet' | 'live';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT_MARKET'
  | 'STOP'
  | 'TAKE_PROFIT';

export type WorkingType = 'MARK_PRICE' | 'CONTRACT_PRICE';
export type MarginType = 'ISOLATED' | 'CROSSED';

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity?: number;
  price?: number;
  stopPrice?: number;
  closePosition?: boolean;
  reduceOnly?: boolean;
  clientOrderId: string;       // mandatory for idempotency
  workingType?: WorkingType;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
}

export interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  leverage: number;
  isolated: boolean;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
}

export interface BinanceAccount {
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  availableBalance: number;
  positions: BinancePosition[];
}

export interface BinanceKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface OrderResponse {
  orderId: number;
  clientOrderId: string;
  symbol: string;
  status: string;
  type: string;
  side: string;
  origQty: string;
  price: string;
  avgPrice: string;
  stopPrice: string;
  reduceOnly: boolean;
  closePosition: boolean;
  updateTime: number;
}

const RECV_WINDOW_MS = 5_000;
const REQ_TIMEOUT_MS = 10_000;

function getMode(): ExecutionMode {
  const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (raw === 'testnet' || raw === 'live') return raw;
  return 'disabled';
}

function getBaseUrl(): string {
  const url = process.env.BINANCE_BASE_URL;
  if (!url) {
    throw new Error('BINANCE_BASE_URL not set. Use https://testnet.binancefuture.com or https://fapi.binance.com.');
  }
  return url.replace(/\/$/, '');
}

/**
 * URL for unsigned market-data reads (klines, markPrice, 24h ticker).
 * Falls back to BINANCE_BASE_URL when unset, so single-URL deploys keep working.
 */
function getMarketDataBaseUrl(): string {
  const override = process.env.BINANCE_MARKET_DATA_URL;
  if (override) return override.replace(/\/$/, '');
  return getBaseUrl();
}

export function isMarketDataSplit(): boolean {
  const a = (process.env.BINANCE_MARKET_DATA_URL ?? '').replace(/\/$/, '');
  const b = (process.env.BINANCE_BASE_URL ?? '').replace(/\/$/, '');
  return a !== '' && a !== b;
}

function getKey(): string {
  const k = process.env.BINANCE_API_KEY;
  if (!k) throw new Error('BINANCE_API_KEY not set');
  return k;
}

function getSecret(): string {
  const s = process.env.BINANCE_API_SECRET;
  if (!s) throw new Error('BINANCE_API_SECRET not set');
  return s;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

function sign(query: string): string {
  return createHmac('sha256', getSecret()).update(query).digest('hex');
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  signed: boolean,
  options: { useMarketDataUrl?: boolean } = {},
): Promise<T> {
  // Signed requests must always go to the trading venue (BINANCE_BASE_URL) —
  // the API key is scoped to that account and the timestamp must match that
  // server's clock. Only unsigned reads can be routed to the market-data URL.
  const baseUrl = !signed && options.useMarketDataUrl ? getMarketDataBaseUrl() : getBaseUrl();
  let url = `${baseUrl}${path}`;
  // X-MBX-APIKEY is only required for signed (USER_DATA/TRADE) endpoints.
  // Public market data (/exchangeInfo, /ticker, /klines, /time) must work
  // without keys so universe-validate and offline screens can run.
  const headers: Record<string, string> = signed ? { 'X-MBX-APIKEY': getKey() } : {};

  if (signed) {
    const stamped = { ...params, timestamp: Date.now(), recvWindow: RECV_WINDOW_MS };
    const query = buildQuery(stamped);
    const signature = sign(query);
    url = `${url}?${query}&signature=${signature}`;
  } else {
    const query = buildQuery(params);
    if (query) url = `${url}?${query}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Binance non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const err = json as { code?: number; msg?: string };
    throw new BinanceApiError(err?.code ?? res.status, err?.msg ?? text, path);
  }

  return json as T;
}

export class BinanceApiError extends Error {
  readonly code: number;
  readonly path: string;
  constructor(code: number, msg: string, path: string) {
    super(`[binance ${code}] ${msg} (${path})`);
    this.code = code;
    this.path = path;
  }
}

// ─── Public read endpoints ──────────────────────────────────────────────────

export async function getServerTime(): Promise<number> {
  const r = await request<{ serverTime: number }>('GET', '/fapi/v1/time', {}, false);
  return r.serverTime;
}

export async function getMarkPrice(symbol: string): Promise<number> {
  const r = await request<{ markPrice: string }>('GET', '/fapi/v1/premiumIndex', { symbol }, false, { useMarketDataUrl: true });
  return Number(r.markPrice);
}

export async function getKlines(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
  limit = 100,
): Promise<BinanceKline[]> {
  const raw = await request<unknown[][]>('GET', '/fapi/v1/klines', { symbol, interval, limit }, false, { useMarketDataUrl: true });
  return raw.map((k) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: Number(k[6]),
  }));
}

/**
 * Trading-venue exchange info. Used for LOT_SIZE / PRICE_FILTER / MIN_NOTIONAL
 * — these MUST match the venue we place orders on (testnet vs mainnet have
 * different minimums) so this stays on BINANCE_BASE_URL even when market data
 * is split.
 */
export async function getExchangeInfo(): Promise<{
  symbols: Array<{ symbol: string; status: string; quoteAsset: string; pricePrecision: number; quantityPrecision: number; filters: Array<Record<string, unknown>> }>;
}> {
  return request('GET', '/fapi/v1/exchangeInfo', {}, false);
}

export async function get24hVolume(symbol?: string): Promise<Array<{ symbol: string; quoteVolume: string }>> {
  const r = await request<unknown>('GET', '/fapi/v1/ticker/24hr', symbol ? { symbol } : {}, false, { useMarketDataUrl: true });
  return Array.isArray(r) ? (r as Array<{ symbol: string; quoteVolume: string }>) : [r as { symbol: string; quoteVolume: string }];
}

// ─── Signed read endpoints ──────────────────────────────────────────────────

export async function getAccount(): Promise<BinanceAccount> {
  const raw = await request<{
    totalWalletBalance: string;
    totalUnrealizedProfit: string;
    totalMarginBalance: string;
    availableBalance: string;
    positions: Array<{
      symbol: string;
      positionAmt: string;
      entryPrice: string;
      unrealizedProfit: string;
      leverage: string;
      isolated: boolean;
      positionSide: 'BOTH' | 'LONG' | 'SHORT';
    }>;
  }>('GET', '/fapi/v2/account', {}, true);

  const positions = await Promise.all(
    raw.positions
      .filter((p) => Number(p.positionAmt) !== 0)
      .map(async (p) => ({
        symbol: p.symbol,
        positionAmt: Number(p.positionAmt),
        entryPrice: Number(p.entryPrice),
        markPrice: await getMarkPrice(p.symbol).catch(() => 0),
        unrealizedProfit: Number(p.unrealizedProfit),
        leverage: Number(p.leverage),
        isolated: p.isolated,
        positionSide: p.positionSide,
      })),
  );

  return {
    totalWalletBalance: Number(raw.totalWalletBalance),
    totalUnrealizedProfit: Number(raw.totalUnrealizedProfit),
    totalMarginBalance: Number(raw.totalMarginBalance),
    availableBalance: Number(raw.availableBalance),
    positions,
  };
}

export async function getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
  return request('GET', '/fapi/v1/openOrders', symbol ? { symbol } : {}, true);
}

// ─── Signed write endpoints (gated by EXECUTION_MODE) ───────────────────────

function ensureWriteAllowed(action: string, payload: Record<string, unknown>): boolean {
  const mode = getMode();
  if (mode === 'disabled') {
    console.log(`[binance] DRY-RUN (${action}) — EXECUTION_MODE=disabled —`, JSON.stringify(payload));
    return false;
  }
  return true;
}

export async function setLeverage(symbol: string, leverage: number): Promise<{ leverage: number; symbol: string } | null> {
  if (!ensureWriteAllowed('setLeverage', { symbol, leverage })) return null;
  return request('POST', '/fapi/v1/leverage', { symbol, leverage }, true);
}

export async function setMarginType(symbol: string, marginType: MarginType): Promise<void> {
  if (!ensureWriteAllowed('setMarginType', { symbol, marginType })) return;
  try {
    await request('POST', '/fapi/v1/marginType', { symbol, marginType }, true);
  } catch (err) {
    // -4046 = "No need to change margin type."
    if (err instanceof BinanceApiError && err.code === -4046) return;
    throw err;
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderResponse | null> {
  const params: Record<string, string | number | boolean | undefined> = {
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    newClientOrderId: input.clientOrderId,
    quantity: input.quantity,
    price: input.price,
    stopPrice: input.stopPrice,
    closePosition: input.closePosition,
    reduceOnly: input.reduceOnly,
    workingType: input.workingType,
    timeInForce: input.timeInForce,
    newOrderRespType: 'RESULT',
  };
  if (!ensureWriteAllowed('placeOrder', params)) return null;
  return request<OrderResponse>('POST', '/fapi/v1/order', params, true);
}

export async function cancelOrder(symbol: string, orderId: number): Promise<OrderResponse | null> {
  if (!ensureWriteAllowed('cancelOrder', { symbol, orderId })) return null;
  return request<OrderResponse>('DELETE', '/fapi/v1/order', { symbol, orderId }, true);
}

export async function cancelAllOrders(symbol: string): Promise<void> {
  if (!ensureWriteAllowed('cancelAllOrders', { symbol })) return;
  await request('DELETE', '/fapi/v1/allOpenOrders', { symbol }, true);
}

// ─── Mode helpers ───────────────────────────────────────────────────────────

export function currentMode(): ExecutionMode {
  return getMode();
}

export function isTestnet(): boolean {
  return (process.env.BINANCE_BASE_URL ?? '').includes('testnet');
}
