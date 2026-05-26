/**
 * Deterministic mock data generator for the public live demo.
 *
 * The demo deploy runs without API keys for any external market data
 * source. When the absence of those keys is detected (see
 * `apps/web/app/lib/demo-mode.ts`) the engine routes signal/OHLCV
 * lookups through these helpers so visitors always see a realistic
 * dashboard.
 *
 * Determinism note: every helper here takes a `seed` (defaulting to the
 * current UTC date so the demo refreshes once per day) and uses a
 * seeded PRNG so the same date always yields the same chart. This makes
 * the demo reproducible for screenshots and bug reports.
 */

export interface MockOHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MockSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  timeframe: string;
  timestamp: string;
  indicators: {
    rsi: { value: number };
    macd: { signal: 'bullish' | 'bearish' | 'neutral'; histogram: number };
    ema: { ema20: number; ema50: number };
  };
}

const DEMO_SYMBOLS: Array<{ symbol: string; basePrice: number; vol: number }> = [
  { symbol: 'BTCUSDT', basePrice: 65000, vol: 0.018 },
  { symbol: 'ETHUSDT', basePrice: 3400, vol: 0.022 },
  { symbol: 'SOLUSDT', basePrice: 165, vol: 0.035 },
  { symbol: 'XAUUSD',  basePrice: 2340, vol: 0.008 },
  { symbol: 'EURUSD',  basePrice: 1.085, vol: 0.005 },
  { symbol: 'GBPUSD',  basePrice: 1.265, vol: 0.006 },
  { symbol: 'AAPL',    basePrice: 195, vol: 0.012 },
  { symbol: 'TSLA',    basePrice: 245, vol: 0.028 },
  { symbol: 'NVDA',    basePrice: 920, vol: 0.030 },
  { symbol: 'SPY',     basePrice: 520, vol: 0.010 },
];

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function todaySeed(): number {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

/**
 * Generate a deterministic OHLCV series for a single symbol.
 * @param symbol Demo symbol to generate
 * @param bars Number of bars to produce
 * @param seed Random seed (defaults to today)
 */
export function generateMockOHLCV(symbol: string, bars: number = 200, seed?: number): MockOHLCV[] {
  const def = DEMO_SYMBOLS.find(s => s.symbol === symbol) ?? DEMO_SYMBOLS[0];
  const rng = seededRandom((seed ?? todaySeed()) ^ hashString(symbol));
  const series: MockOHLCV[] = [];

  let close = def.basePrice;
  const now = Date.now();
  const intervalMs = 60 * 60 * 1000;

  for (let i = bars - 1; i >= 0; i--) {
    const drift = (rng() - 0.5) * 2 * def.vol;
    const open = close;
    close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + rng() * def.vol * 0.3);
    const low = Math.min(open, close) * (1 - rng() * def.vol * 0.3);
    const volume = 1000 + Math.floor(rng() * 5000);

    series.unshift({
      time: now - i * intervalMs,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return series;
}

/**
 * Generate a deterministic set of demo signals across all demo symbols.
 * Re-seeds daily so the demo "moves" but is reproducible within a UTC day.
 */
export function generateMockSignals(seed?: number): MockSignal[] {
  const s = seed ?? todaySeed();
  const rng = seededRandom(s);
  return DEMO_SYMBOLS.map((def, idx) => {
    const direction: 'BUY' | 'SELL' = rng() > 0.5 ? 'BUY' : 'SELL';
    const isBuy = direction === 'BUY';
    const confidence = 60 + Math.floor(rng() * 30);
    const entry = def.basePrice * (1 + (rng() - 0.5) * def.vol);
    const slDist = entry * def.vol * 1.5;
    const tpDist = entry * def.vol * 2.5;
    const stopLoss = isBuy ? entry - slDist : entry + slDist;
    const tp1 = isBuy ? entry + tpDist : entry - tpDist;
    const tp2 = isBuy ? entry + tpDist * 1.7 : entry - tpDist * 1.7;
    const tp3 = isBuy ? entry + tpDist * 2.4 : entry - tpDist * 2.4;
    const rsi = isBuy ? 25 + rng() * 10 : 65 + rng() * 10;
    const macdHist = (isBuy ? 1 : -1) * (0.0001 + rng() * 0.001);

    return {
      id: `${def.symbol}-H1-${direction}-${s}-${idx}`,
      symbol: def.symbol,
      direction,
      confidence,
      entry,
      stopLoss,
      takeProfit: [tp1, tp2, tp3],
      timeframe: 'H1',
      timestamp: new Date().toISOString(),
      indicators: {
        rsi: { value: rsi },
        macd: { signal: isBuy ? 'bullish' : 'bearish', histogram: macdHist },
        ema: { ema20: entry * (isBuy ? 0.998 : 1.002), ema50: entry * (isBuy ? 0.994 : 1.006) },
      },
    };
  });
}

/**
 * True when the deploy is running in demo mode — no API keys, no DB.
 * The web app reads this and swaps the live data providers for the
 * deterministic generators above.
 */
export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.DEMO_MODE === 'true' || env.DEMO_MODE === '1') return true;
  return false;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

export const DEMO_SYMBOL_LIST: ReadonlyArray<string> = DEMO_SYMBOLS.map(d => d.symbol);
