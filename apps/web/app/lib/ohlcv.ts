/**
 * OHLCV Data Fetcher — hub-first historical candle data
 *
 * Architecture (mirrors /api/prices route, per 2026-05-07 directive):
 *   1. market-data-hub      — primary, when MARKET_DATA_HUB_URL is set
 *   2. Binance public OHLCV — crypto-only thin survival fallback
 *   3. Stooq CSV            — forex/metals-only thin survival fallback
 *   4. Synthetic generator  — last resort, clearly tagged in the source field
 *
 * Removed from the hot path (Kraken / CryptoCompare): both still exported
 * from data-providers/ for backtest + signal-history consumers, but no
 * longer called per-request from this fetcher. Hub aggregates all crypto
 * sources internally so direct calls duplicate work and add tail latency.
 */

import { fetchStooqOHLCV, isStooqSymbol } from './data-providers';
import { fetchHubCandles, isHubEnabled } from './data-providers/market-data-hub';

export type OHLCVSource = 'market-data-hub' | 'binance' | 'stooq' | 'kraken' | 'cryptocompare' | 'synthetic';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Symbol mapping: our symbols → API-specific symbols
export const BINANCE_SYMBOLS: Record<string, string> = {
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
  UNIUSD: 'UNIUSDT',
  LTCUSD: 'LTCUSDT',
  BCHUSD: 'BCHUSDT',
  NEARUSD: 'NEARUSDT',
  APTUSD: 'APTUSDT',
  ARBUSD: 'ARBUSDT',
  OPUSD: 'OPUSDT',
  FILUSD: 'FILUSDT',
  INJUSD: 'INJUSDT',
  SUIUSD: 'SUIUSDT',
  SEIUSD: 'SEIUSDT',
  TIAUSD: 'TIAUSDT',
  FETUSD: 'FETUSDT',
  AAVEUSD: 'AAVEUSDT',
  PEPEUSD: 'PEPEUSDT',
  SHIBUSD: 'SHIBUSDT',
};

// Timeframe → Binance interval mapping
const BINANCE_INTERVALS: Record<string, string> = {
  M5: '5m',
  M15: '15m',
  H1: '1h',
  H4: '4h',
  D1: '1d',
};

const TIMEFRAME_MS: Record<string, number> = {
  M5: 5 * 60 * 1000,
  M15: 15 * 60 * 1000,
  H1: 60 * 60 * 1000,
  H4: 4 * 60 * 60 * 1000,
  D1: 24 * 60 * 60 * 1000,
};

// In-memory cache with TTL
interface CacheEntry {
  data: OHLCV[];
  source: OHLCVSource;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(symbol: string, timeframe: string): string {
  return `${symbol}:${timeframe}`;
}

function getFromCache(key: string): { data: OHLCV[]; source: OHLCVSource } | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) {
    return { data: entry.data, source: entry.source };
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: OHLCV[], source: OHLCVSource): void {
  cache.set(key, { data, source, expires: Date.now() + CACHE_TTL });
  // Evict old entries if cache gets too big
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now >= v.expires) cache.delete(k);
    }
  }
}

/**
 * Trim any candles whose scheduled close time is still in the future.
 *
 * Upstream feeds sometimes include the currently-forming bar. TradeClaw's
 * public signal engine should only work from confirmed candle closes, so we
 * drop any bar whose close timestamp has not arrived yet.
 */
export function trimClosedCandles(candles: OHLCV[], timeframe: string, now = Date.now()): OHLCV[] {
  const duration = TIMEFRAME_MS[timeframe];
  if (!duration || candles.length === 0) return candles;

  return candles.filter((candle) => candle.timestamp + duration <= now);
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
 * Main entry point — fetch OHLCV for a symbol and timeframe.
 * Hub-first; thin Binance + Stooq fallbacks; synthetic last resort.
 */
export async function getOHLCV(
  symbol: string,
  timeframe: string = 'H1',
): Promise<{ candles: OHLCV[]; source: OHLCVSource }> {
  const cacheKey = getCacheKey(symbol, timeframe);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { candles: cached.data, source: cached.source };
  }

  let candles: OHLCV[] = [];
  let source: OHLCVSource = 'synthetic';

  // ── 1. market-data-hub (primary) ─────────────────────────
  if (isHubEnabled()) {
    try {
      const hubCandles = await fetchHubCandles(symbol, timeframe);
      if (hubCandles.length > candles.length) {
        candles = hubCandles;
        source = 'market-data-hub';
      }
    } catch {
      /* fall through */
    }
  }

  // ── 2. Binance OHLCV (crypto thin survival fallback) ─────
  // Only replace if Binance returns MORE than we got from hub. Daily candles
  // legitimately return ~40 rows (40 trading days); we must not destroy that
  // real data with an empty fallback response.
  if (candles.length < 50 && BINANCE_SYMBOLS[symbol]) {
    try {
      const binanceCandles = await fetchBinanceOHLCV(symbol, timeframe);
      if (binanceCandles.length > candles.length) {
        candles = binanceCandles;
        source = 'binance';
      }
    } catch {
      /* fall through */
    }
  }

  // ── 3. Stooq (forex/metals thin survival fallback) ───────
  if (candles.length < 50 && isStooqSymbol(symbol)) {
    try {
      const lookback =
        timeframe === 'M5' ? 3 : timeframe === 'M15' ? 7 : timeframe === 'D1' ? 365 : 30;
      const stooqCandles = await fetchStooqOHLCV(symbol, timeframe, lookback);
      if (stooqCandles.length > candles.length) {
        candles = stooqCandles;
        source = 'stooq';
      }

      // H4 aggregation: build from H1 when direct H4 returns short.
      if (candles.length < 50 && timeframe === 'H4') {
        const h1Candles = await fetchStooqOHLCV(symbol, 'H1', 60);
        if (h1Candles.length > 0) {
          const aggregated = aggregateCandles(h1Candles, 4, 4 * 3600 * 1000);
          if (aggregated.length > candles.length) {
            candles = aggregated;
            source = 'stooq';
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  // ── 4. Synthetic (last resort, clearly tagged) ────────────
  // Only generate synthetic when we got NOTHING from real sources. If hub
  // returned 40 D1 candles for EUR/USD, return those with source='market-
  // data-hub' — the consumer (signals.ts) already skips symbols with < 50
  // candles. Generating synthetic to "pad" real data lies about the source.
  if (candles.length === 0) {
    const config = FALLBACK_CONFIG[symbol];
    if (config) {
      candles = generateSyntheticOHLCV(config.basePrice, config.volatility, 250);
      source = 'synthetic';
    }
  }

  candles = trimClosedCandles(candles, timeframe);

  // Cache only real-source data. Caching synthetic locks in stale state for
  // 5 min after a transient hub failure — even when hub recovers, subsequent
  // requests serve the cached synthetic until TTL expires. By skipping the
  // cache for synthetic, every request retries the hub, so recovery is
  // instant. Synthetic is computed cheaply enough (Math.random + arithmetic)
  // that recomputing per-request is fine.
  if (candles.length > 0 && source !== 'synthetic') {
    setCache(cacheKey, candles, source);
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
