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

import type { OHLCV, ForexRate } from './types';
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
    M5: '5min',
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
