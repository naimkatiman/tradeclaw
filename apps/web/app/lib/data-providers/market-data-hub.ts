/**
 * Market Data Hub Provider — Redis-backed cache service on Railway
 *
 * For hosted TradeClaw: set MARKET_DATA_HUB_URL to use pre-cached data
 * For Docker / self-hosted: leave unset — falls through to free API chain
 *
 * Hub API:
 *   GET /api/candles/:symbol?interval=1h&limit=300  → OHLCV candles
 *   GET /api/quotes                                   → all latest quotes
 *   GET /api/quotes/:symbol                           → single quote
 *   GET /api/exchange-rates                           → forex rates
 */

import type { OHLCV, PriceQuote, ForexRate } from './types';
import { safeFetch } from './types';

const HUB_URL = process.env.MARKET_DATA_HUB_URL ?? '';

/** Convert TradeClaw symbol (BTCUSD) → Hub symbol (BTC/USD) */
function toHubSymbol(symbol: string): string {
  // Forex/Metals: 6-char pairs like EURUSD, XAUUSD
  if (symbol.length === 6 && !symbol.includes('/')) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  // Crypto: variable length (BTCUSD, DOGEUSD, MATICUSD)
  if (symbol.endsWith('USD') && symbol.length > 6) {
    return `${symbol.slice(0, -3)}/USD`;
  }
  if (symbol.endsWith('USD') && symbol.length <= 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol;
}

/** Convert TradeClaw timeframe → Twelve Data interval (used by hub) */
function toHubInterval(timeframe: string): string {
  const map: Record<string, string> = {
    M15: '15min',
    H1: '1h',
    H4: '4h',
    D1: '1day',
  };
  return map[timeframe] ?? '1h';
}

/** Whether the hub is configured */
export function isHubEnabled(): boolean {
  return HUB_URL.length > 0;
}

interface HubCandleResponse {
  symbol: string;
  interval: string;
  count: number;
  values: Array<{
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

interface HubQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previous_close: number;
  change: number;
  percent_change: number;
  volume: number | null;
  timestamp: number;
  fetched_at: string;
  asset_type: string;
  name: string;
}

interface HubExchangeRateResponse {
  data: Array<{
    from_currency: string;
    to_currency: string;
    rate: number;
    timestamp: number;
    fetched_at: string;
  }>;
  count: number;
}

/**
 * Fetch OHLCV candles from the market data hub
 */
export async function fetchHubCandles(
  symbol: string,
  timeframe: string,
  limit = 300,
): Promise<OHLCV[]> {
  if (!HUB_URL) return [];

  const hubSymbol = encodeURIComponent(toHubSymbol(symbol));
  const interval = toHubInterval(timeframe);
  const url = `${HUB_URL}/api/candles/${hubSymbol}?interval=${interval}&limit=${limit}`;

  const data = await safeFetch<HubCandleResponse>(url, { timeoutMs: 6000 });
  if (!data?.values?.length) return [];

  return data.values.map((v) => ({
    timestamp: new Date(v.datetime + ' UTC').getTime(),
    open: v.open,
    high: v.high,
    low: v.low,
    close: v.close,
    volume: v.volume,
  }));
}

/**
 * Fetch all quotes from the hub (bulk — single request for all symbols)
 */
export async function fetchHubQuotes(): Promise<PriceQuote[]> {
  if (!HUB_URL) return [];

  const data = await safeFetch<HubQuote[]>(`${HUB_URL}/api/quotes`, {
    timeoutMs: 5000,
  });
  if (!data?.length) return [];

  return data.map((q) => ({
    symbol: q.symbol.replace('/', ''),
    price: q.price,
    change24h: q.percent_change,
    high24h: q.high,
    low24h: q.low,
    volume24h: q.volume ?? undefined,
    timestamp: q.timestamp * 1000,
    source: 'market-data-hub',
  }));
}

/**
 * Fetch a single quote from the hub
 */
export async function fetchHubQuote(symbol: string): Promise<PriceQuote | null> {
  if (!HUB_URL) return null;

  const hubSymbol = encodeURIComponent(toHubSymbol(symbol));
  const data = await safeFetch<HubQuote>(`${HUB_URL}/api/quotes/${hubSymbol}`, {
    timeoutMs: 5000,
  });
  if (!data) return null;

  return {
    symbol: data.symbol.replace('/', ''),
    price: data.price,
    change24h: data.percent_change,
    high24h: data.high,
    low24h: data.low,
    volume24h: data.volume ?? undefined,
    timestamp: data.timestamp * 1000,
    source: 'market-data-hub',
  };
}

/**
 * Fetch forex rates from the hub
 */
export async function fetchHubExchangeRates(): Promise<ForexRate[]> {
  if (!HUB_URL) return [];

  const data = await safeFetch<HubExchangeRateResponse>(
    `${HUB_URL}/api/exchange-rates`,
    { timeoutMs: 5000 },
  );
  if (!data?.data?.length) return [];

  return data.data.map((r) => ({
    pair: `${r.from_currency}${r.to_currency}`,
    rate: r.rate,
    timestamp: r.timestamp * 1000,
    source: 'market-data-hub',
  }));
}
