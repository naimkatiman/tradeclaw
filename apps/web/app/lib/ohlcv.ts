/**
 * OHLCV Data Fetcher — fetches historical candle data from free APIs
 * Crypto: Binance → Kraken → CryptoCompare (fallback chain)
 * Forex/Metals: Yahoo Finance → Twelve Data (fallback chain)
 */

import { fetchKrakenOHLCV, fetchCryptoCompareOHLCV, fetchTwelveDataOHLCV, fetchOandaOHLCV, isOandaSymbol } from './data-providers';

export type OHLCVSource = 'binance' | 'oanda' | 'yahoo' | 'kraken' | 'cryptocompare' | 'twelvedata' | 'synthetic';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Symbol mapping: our symbols → API-specific symbols
const BINANCE_SYMBOLS: Record<string, string> = {
  BTCUSD: 'BTCUSDT',
  ETHUSD: 'ETHUSDT',
  XRPUSD: 'XRPUSDT',
  SOLUSD: 'SOLUSDT',
  DOGEUSD: 'DOGEUSDT',
  BNBUSD: 'BNBUSDT',
  ADAUSD: 'ADAUSDT',
  DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT',
  AVAXUSD: 'AVAXUSDT',
  ATOMUSD: 'ATOMUSDT',
  MATICUSD: 'MATICUSDT',
};

// Yahoo Finance symbols for forex/metals
const YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: 'GC=F',       // Gold futures
  XAGUSD: 'SI=F',       // Silver futures
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'CAD=X',
  NZDUSD: 'NZDUSD=X',
  USDCHF: 'CHF=X',
};

// Timeframe → Binance interval mapping
const BINANCE_INTERVALS: Record<string, string> = {
  M15: '15m',
  H1: '1h',
  H4: '4h',
  D1: '1d',
};

// Timeframe → Yahoo Finance interval + range
const YAHOO_CONFIG: Record<string, { interval: string; range: string }> = {
  M15: { interval: '15m', range: '5d' },
  H1: { interval: '1h', range: '30d' },
  H4: { interval: '1h', range: '90d' }, // Yahoo doesn't have 4h, we'll aggregate
  D1: { interval: '1d', range: '1y' },
};

// In-memory cache with TTL
interface CacheEntry {
  data: OHLCV[];
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(symbol: string, timeframe: string): string {
  return `${symbol}:${timeframe}`;
}

function getFromCache(key: string): OHLCV[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: OHLCV[]): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  // Evict old entries if cache gets too big
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now >= v.expires) cache.delete(k);
    }
  }
}

/**
 * Fetch OHLCV from Binance public API
 */
async function fetchBinanceOHLCV(symbol: string, timeframe: string): Promise<OHLCV[]> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol];
  const interval = BINANCE_INTERVALS[timeframe];
  if (!binanceSymbol || !interval) return [];

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=300`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  
  const data = await res.json() as (string | number)[][];
  
  return data.map((candle) => ({
    timestamp: candle[0] as number,
    open: parseFloat(candle[1] as string),
    high: parseFloat(candle[2] as string),
    low: parseFloat(candle[3] as string),
    close: parseFloat(candle[4] as string),
    volume: parseFloat(candle[5] as string),
  }));
}

/**
 * Fetch OHLCV from Yahoo Finance chart API
 */
async function fetchYahooOHLCV(symbol: string, timeframe: string): Promise<OHLCV[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol];
  const config = YAHOO_CONFIG[timeframe];
  if (!yahooSymbol || !config) return [];

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${config.interval}&range=${config.range}`;
  
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];
    
    const json = await res.json() as {
      chart: {
        result: Array<{
          timestamp: number[];
          indicators: {
            quote: Array<{
              open: (number | null)[];
              high: (number | null)[];
              low: (number | null)[];
              close: (number | null)[];
              volume: (number | null)[];
            }>;
          };
        }>;
      };
    };
    
    const result = json?.chart?.result?.[0];
    if (!result?.timestamp) return [];
    
    const { timestamp: timestamps } = result;
    const quote = result.indicators.quote[0];
    
    const candles: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open[i];
      const h = quote.high[i];
      const l = quote.low[i];
      const c = quote.close[i];
      const v = quote.volume[i];
      if (o != null && h != null && l != null && c != null) {
        candles.push({
          timestamp: timestamps[i] * 1000,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v ?? 0,
        });
      }
    }
    
    // For H4 timeframe, aggregate 1h candles into properly boundary-aligned 4h candles
    if (timeframe === 'H4') {
      return aggregateCandles(candles, 4, 4 * 3600 * 1000);
    }
    
    return candles;
  } catch {
    return [];
  }
}

/**
 * Aggregate candles into larger timeframe.
 * When alignToMs is provided, groups candles by boundary (e.g. 4h = 4*3600*1000)
 * instead of naive sequential chunking, ensuring proper period alignment.
 */
function aggregateCandles(candles: OHLCV[], factor: number, alignToMs?: number): OHLCV[] {
  if (!alignToMs) {
    // Naive sequential chunking (for non-forex/fallback)
    const result: OHLCV[] = [];
    for (let i = 0; i < candles.length; i += factor) {
      const chunk = candles.slice(i, i + factor);
      if (chunk.length === 0) break;
      result.push({
        timestamp: chunk[0].timestamp,
        open: chunk[0].open,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((sum, c) => sum + c.volume, 0),
      });
    }
    return result;
  }

  // Boundary-aligned grouping (e.g. H4 boundaries at 00:00/04:00/08:00/12:00/16:00/20:00 UTC)
  const groups = new Map<number, OHLCV[]>();
  for (const c of candles) {
    const boundary = Math.floor(c.timestamp / alignToMs) * alignToMs;
    if (!groups.has(boundary)) groups.set(boundary, []);
    groups.get(boundary)!.push(c);
  }

  const result: OHLCV[] = [];
  for (const [boundary, chunk] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (chunk.length === 0) continue;
    const sorted = chunk.sort((a, b) => a.timestamp - b.timestamp);
    result.push({
      timestamp: boundary,
      open: sorted[0].open,
      high: Math.max(...sorted.map(c => c.high)),
      low: Math.min(...sorted.map(c => c.low)),
      close: sorted[sorted.length - 1].close,
      volume: sorted.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return result;
}

/**
 * Generate synthetic OHLCV from a spot price when APIs fail
 * Creates realistic-looking candles based on the symbol's volatility
 */
function generateSyntheticOHLCV(basePrice: number, volatility: number, count: number): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = basePrice * (1 - volatility * 0.1 / basePrice * count * 0.01); // Start lower
  const now = Date.now();
  const interval = 60 * 60 * 1000; // 1h

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * volatility * 0.5; // Slight upward bias
    const open = price;
    price = price + change;
    const high = Math.max(open, price) + Math.random() * volatility * 0.3;
    const low = Math.min(open, price) - Math.random() * volatility * 0.3;

    candles.push({
      timestamp: now - (count - i) * interval,
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +price.toFixed(5),
      volume: Math.floor(Math.random() * 10000 + 1000),
    });
  }
  return candles;
}

// Fallback base prices and volatilities for synthetic data
const FALLBACK_CONFIG: Record<string, { basePrice: number; volatility: number }> = {
  BTCUSD: { basePrice: 70798, volatility: 2000 },
  ETHUSD: { basePrice: 2147, volatility: 100 },
  XRPUSD: { basePrice: 1.40, volatility: 0.03 },
  SOLUSD: { basePrice: 142.80, volatility: 8 },
  DOGEUSD: { basePrice: 0.178, volatility: 0.008 },
  BNBUSD: { basePrice: 608.50, volatility: 25 },
  ADAUSD: { basePrice: 0.45, volatility: 0.02 },
  DOTUSD: { basePrice: 7.50, volatility: 0.4 },
  LINKUSD: { basePrice: 15.20, volatility: 0.8 },
  AVAXUSD: { basePrice: 35.00, volatility: 2 },
  ATOMUSD: { basePrice: 9.50, volatility: 0.5 },
  MATICUSD: { basePrice: 0.70, volatility: 0.03 },
  XAUUSD: { basePrice: 4505, volatility: 20 },
  XAGUSD: { basePrice: 71, volatility: 0.8 },
  EURUSD: { basePrice: 1.1559, volatility: 0.005 },
  GBPUSD: { basePrice: 1.3352, volatility: 0.006 },
  USDJPY: { basePrice: 159.53, volatility: 0.8 },
  AUDUSD: { basePrice: 0.6939, volatility: 0.004 },
  USDCAD: { basePrice: 1.3826, volatility: 0.005 },
  NZDUSD: { basePrice: 0.5799, volatility: 0.004 },
  USDCHF: { basePrice: 0.7922, volatility: 0.004 },
};

/**
 * Main entry point — fetch OHLCV data for a symbol and timeframe
 * Returns at least 200 candles when possible
 */
export async function getOHLCV(symbol: string, timeframe: string = 'H1'): Promise<{ candles: OHLCV[]; source: OHLCVSource }> {
  const cacheKey = getCacheKey(symbol, timeframe);
  const cached = getFromCache(cacheKey);
  if (cached) {
    const source: OHLCVSource = BINANCE_SYMBOLS[symbol] ? 'binance' : isOandaSymbol(symbol) ? 'oanda' : YAHOO_SYMBOLS[symbol] ? 'yahoo' : 'synthetic';
    return { candles: cached, source };
  }

  let candles: OHLCV[] = [];
  let source: OHLCVSource = 'synthetic';

  try {
    if (BINANCE_SYMBOLS[symbol]) {
      candles = await fetchBinanceOHLCV(symbol, timeframe);
      if (candles.length > 0) source = 'binance';
    } else if (isOandaSymbol(symbol)) {
      // OANDA first for forex/metals (requires API token)
      candles = await fetchOandaOHLCV(symbol, timeframe);
      if (candles.length > 0) source = 'oanda';

      // Fallback to Yahoo if OANDA unavailable or returned insufficient data
      if (candles.length < 50 && YAHOO_SYMBOLS[symbol]) {
        candles = await fetchYahooOHLCV(symbol, timeframe);
        if (candles.length > 0) source = 'yahoo';
      }
    } else if (YAHOO_SYMBOLS[symbol]) {
      candles = await fetchYahooOHLCV(symbol, timeframe);
      if (candles.length > 0) source = 'yahoo';
    }
  } catch {
    // Fall through to fallback providers
  }

  // Fallback chain: Kraken → CryptoCompare (crypto), Twelve Data (forex/metals)
  if (candles.length < 50) {
    try {
      if (BINANCE_SYMBOLS[symbol]) {
        candles = await fetchKrakenOHLCV(symbol, timeframe);
        if (candles.length > 0) source = 'kraken';

        if (candles.length < 50) {
          candles = await fetchCryptoCompareOHLCV(symbol, timeframe);
          if (candles.length > 0) source = 'cryptocompare';
        }
      } else if (YAHOO_SYMBOLS[symbol]) {
        const tfMap: Record<string, '15min' | '1h' | '4h' | '1day'> = {
          M15: '15min', H1: '1h', H4: '4h', D1: '1day',
        };
        const tdInterval = tfMap[timeframe];
        if (tdInterval) {
          candles = await fetchTwelveDataOHLCV(symbol, tdInterval);
          if (candles.length > 0) source = 'twelvedata';
        }
      }
    } catch {
      // Fall through to synthetic
    }
  }

  // Fallback to synthetic if all APIs fail
  if (candles.length < 50) {
    const config = FALLBACK_CONFIG[symbol];
    if (config) {
      candles = generateSyntheticOHLCV(config.basePrice, config.volatility, 250);
      source = 'synthetic';
    }
  }

  if (candles.length > 0) {
    setCache(cacheKey, candles);
  }

  return { candles, source };
}

/**
 * Fetch OHLCV for multiple symbols in parallel
 */
export async function getMultiOHLCV(
  symbols: string[],
  timeframe: string = 'H1'
): Promise<Map<string, { candles: OHLCV[]; source: OHLCVSource }>> {
  const results = new Map<string, { candles: OHLCV[]; source: OHLCVSource }>();
  
  const settled = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const result = await getOHLCV(symbol, timeframe);
      return { symbol, ...result };
    })
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.set(result.value.symbol, {
        candles: result.value.candles,
        source: result.value.source,
      });
    }
  }

  return results;
}
