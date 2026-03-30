/**
 * OANDA Data Provider — forex & metals via OANDA v20 REST API
 * Requires free practice account API token → https://developer.oanda.com/
 * Gracefully degrades (returns []) when OANDA_API_TOKEN is unset.
 */

import { type PriceQuote, type OHLCV, safeFetch } from './types';

// Base URL — practice by default, override with OANDA_API_ENV=live
const OANDA_BASE =
  process.env.OANDA_API_ENV === 'live'
    ? 'https://api-fxtrade.oanda.com/v3'
    : 'https://api-fxpractice.oanda.com/v3';

function getHeaders(): Record<string, string> {
  const token = process.env.OANDA_API_TOKEN;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function hasToken(): boolean {
  return !!process.env.OANDA_API_TOKEN;
}

// ─── Symbol mapping: our symbols → OANDA instrument names ─────────────────

const OANDA_INSTRUMENTS: Record<string, string> = {
  // Forex majors
  EURUSD: 'EUR_USD',
  GBPUSD: 'GBP_USD',
  USDJPY: 'USD_JPY',
  AUDUSD: 'AUD_USD',
  USDCAD: 'USD_CAD',
  NZDUSD: 'NZD_USD',
  USDCHF: 'USD_CHF',
  // Forex crosses
  EURGBP: 'EUR_GBP',
  EURJPY: 'EUR_JPY',
  GBPJPY: 'GBP_JPY',
  // Metals
  XAUUSD: 'XAU_USD',
  XAGUSD: 'XAG_USD',
};

// Timeframe → OANDA granularity
const OANDA_GRANULARITY: Record<string, string> = {
  M15: 'M15',
  H1: 'H1',
  H4: 'H4',
  D1: 'D',
};

// ─── Candle / OHLCV ──────────────────────────────────────────────────────

interface OandaCandle {
  time: string;
  mid: { o: string; h: string; l: string; c: string };
  volume: number;
  complete: boolean;
}

export async function fetchOandaOHLCV(
  symbol: string,
  timeframe: string,
): Promise<OHLCV[]> {
  if (!hasToken()) return [];

  const instrument = OANDA_INSTRUMENTS[symbol];
  const granularity = OANDA_GRANULARITY[timeframe];
  if (!instrument || !granularity) return [];

  const data = await safeFetch<{
    instrument: string;
    granularity: string;
    candles: OandaCandle[];
  }>(
    `${OANDA_BASE}/instruments/${instrument}/candles?granularity=${granularity}&count=300&price=M`,
    { headers: getHeaders(), timeoutMs: 10000 },
  );
  if (!data?.candles) return [];

  return data.candles
    .filter((c) => c.complete)
    .map((c) => ({
      timestamp: new Date(c.time).getTime(),
      open: parseFloat(c.mid.o),
      high: parseFloat(c.mid.h),
      low: parseFloat(c.mid.l),
      close: parseFloat(c.mid.c),
      volume: c.volume,
    }));
}

// ─── Live Prices ─────────────────────────────────────────────────────────

export async function fetchOandaPrices(
  symbols?: string[],
): Promise<PriceQuote[]> {
  if (!hasToken()) return [];

  const accountId = process.env.OANDA_ACCOUNT_ID;
  if (!accountId) return [];

  const requestedSymbols = symbols ?? Object.keys(OANDA_INSTRUMENTS);
  const instruments = requestedSymbols
    .map((s) => OANDA_INSTRUMENTS[s])
    .filter(Boolean)
    .join(',');
  if (!instruments) return [];

  const data = await safeFetch<{
    prices: Array<{
      instrument: string;
      time: string;
      status: string;
      bids: Array<{ price: string }>;
      asks: Array<{ price: string }>;
    }>;
  }>(
    `${OANDA_BASE}/accounts/${accountId}/pricing?instruments=${instruments}`,
    { headers: getHeaders(), timeoutMs: 10000 },
  );
  if (!data?.prices) return [];

  const reverseMap = Object.fromEntries(
    Object.entries(OANDA_INSTRUMENTS).map(([k, v]) => [v, k]),
  );

  return data.prices
    .filter((p) => p.status === 'tradeable' && p.bids?.length > 0 && p.asks?.length > 0)
    .map((p) => {
      const bid = parseFloat(p.bids[0].price);
      const ask = parseFloat(p.asks[0].price);
      const mid = (bid + ask) / 2;
      return {
        symbol: reverseMap[p.instrument] ?? p.instrument,
        price: +mid.toFixed(5),
        timestamp: new Date(p.time).getTime(),
        source: 'oanda',
      };
    });
}

/** Check whether a symbol is supported by this provider */
export function isOandaSymbol(symbol: string): boolean {
  return symbol in OANDA_INSTRUMENTS;
}
