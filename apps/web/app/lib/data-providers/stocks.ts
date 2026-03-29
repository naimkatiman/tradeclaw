/**
 * Stock Data Providers — Finnhub, Twelve Data, Financial Modeling Prep
 * All require free API keys (optional — gracefully degrade without them)
 */

import { type PriceQuote, type OHLCV, safeFetch } from './types';

// ─── Finnhub ───────────────────────────────────────────────────────────────
// https://finnhub.io/ — 60 calls/min free, real-time US stock quotes

const FINNHUB_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'V', 'SPY', 'QQQ', 'DIA', 'IWM',
];

export async function fetchFinnhubQuotes(): Promise<PriceQuote[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    FINNHUB_SYMBOLS.map(async (symbol) => {
      const data = await safeFetch<{
        c: number; d: number; dp: number; h: number; l: number; o: number; t: number;
      }>(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      if (!data || data.c === 0) return null;
      return {
        symbol: `${symbol}USD`,
        price: data.c,
        change24h: +data.dp.toFixed(2),
        high24h: data.h,
        low24h: data.l,
        timestamp: data.t * 1000,
        source: 'finnhub',
      } as PriceQuote;
    }),
  );

  const quotes: PriceQuote[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) quotes.push(r.value);
  }
  return quotes;
}

export async function fetchFinnhubCandles(
  symbol: string,
  resolution: 'D' | '60' | '15' = 'D',
  count: number = 300,
): Promise<OHLCV[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const ticker = symbol.replace('USD', '');
  const to = Math.floor(Date.now() / 1000);
  const secondsPerCandle = resolution === 'D' ? 86400 : parseInt(resolution) * 60;
  const from = to - count * secondsPerCandle;

  const data = await safeFetch<{
    s: string;
    t: number[];
    o: number[];
    h: number[];
    l: number[];
    c: number[];
    v: number[];
  }>(
    `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`,
  );
  if (!data || data.s !== 'ok') return [];

  return data.t.map((t, i) => ({
    timestamp: t * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i],
  }));
}

// ─── Twelve Data ───────────────────────────────────────────────────────────
// https://twelvedata.com/ — 800 calls/day, 8 calls/min free

export async function fetchTwelveDataOHLCV(
  symbol: string,
  interval: '15min' | '1h' | '4h' | '1day' = '1h',
): Promise<OHLCV[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return [];

  // Convert our symbol format to Twelve Data format
  let tdSymbol = symbol;
  if (symbol.endsWith('USD') && symbol.length === 6) {
    // Forex: EURUSD → EUR/USD
    tdSymbol = `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }

  const data = await safeFetch<{
    values: Array<{
      datetime: string;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }>;
  }>(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=300&apikey=${apiKey}`,
  );
  if (!data?.values) return [];

  return data.values
    .map((v) => ({
      timestamp: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume) || 0,
    }))
    .reverse(); // Twelve Data returns newest first
}

// ─── Financial Modeling Prep ───────────────────────────────────────────────
// https://financialmodelingprep.com/ — 250 calls/day free

export async function fetchFMPQuotes(
  symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'],
): Promise<PriceQuote[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  const symbolList = symbols.join(',');
  const data = await safeFetch<
    Array<{
      symbol: string;
      price: number;
      changesPercentage: number;
      dayHigh: number;
      dayLow: number;
      volume: number;
      marketCap: number;
      timestamp: number;
    }>
  >(`https://financialmodelingprep.com/api/v3/quote/${symbolList}?apikey=${apiKey}`);
  if (!data) return [];

  return data.map((q) => ({
    symbol: `${q.symbol}USD`,
    price: q.price,
    change24h: +q.changesPercentage.toFixed(2),
    high24h: q.dayHigh,
    low24h: q.dayLow,
    volume24h: q.volume,
    marketCap: q.marketCap,
    timestamp: Date.now(),
    source: 'fmp',
  }));
}
