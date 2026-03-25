import { NextRequest, NextResponse } from 'next/server';

const TIMEFRAMES = ['M5', 'M15', 'H1', 'H4', 'D1'] as const;
type Timeframe = typeof TIMEFRAMES[number];

const SYMBOLS = [
  { symbol: 'XAUUSD', basePrice: 2180, volatility: 15 },
  { symbol: 'XAGUSD', basePrice: 24.80, volatility: 0.3 },
  { symbol: 'BTCUSD', basePrice: 87500, volatility: 2000 },
  { symbol: 'ETHUSD', basePrice: 3400, volatility: 100 },
  { symbol: 'EURUSD', basePrice: 1.0830, volatility: 0.005 },
  { symbol: 'GBPUSD', basePrice: 1.2640, volatility: 0.006 },
  { symbol: 'USDJPY', basePrice: 151.20, volatility: 0.8 },
  { symbol: 'AUDUSD', basePrice: 0.6540, volatility: 0.004 },
];

interface TimeframeSignal {
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL';
  confidence: number;
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
  ema: 'up' | 'down' | 'sideways';
  bb: 'upper' | 'middle' | 'lower';
  stoch: number;
  score: number; // -3 to +3 factor score
}

interface MTFAnalysis {
  symbol: string;
  timeframes: TimeframeSignal[];
  confluence: number; // 0-100 confluence score
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  alignedTimeframes: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function analyzeTimeframe(symbol: string, tf: Timeframe, baseSeed: number): TimeframeSignal {
  const tfWeight = TIMEFRAMES.indexOf(tf);
  const seed = baseSeed + tfWeight * 137;

  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  const r4 = seededRandom(seed + 3);
  const r5 = seededRandom(seed + 4);
  const r6 = seededRandom(seed + 5);

  // Generate correlated signals (higher TF influences lower TF)
  const bullBias = r1 > 0.45; // Slight bullish bias for demonstration
  const direction: 'BUY' | 'SELL' = bullBias ? 'BUY' : 'SELL';

  const rsi = bullBias
    ? Math.round(25 + r2 * 25)  // 25-50 oversold range
    : Math.round(55 + r2 * 25); // 55-80 overbought range

  const macd: 'bullish' | 'bearish' | 'neutral' = bullBias
    ? r3 > 0.2 ? 'bullish' : 'neutral'
    : r3 > 0.2 ? 'bearish' : 'neutral';

  const ema: 'up' | 'down' | 'sideways' = bullBias
    ? r4 > 0.25 ? 'up' : 'sideways'
    : r4 > 0.25 ? 'down' : 'sideways';

  const bb: 'upper' | 'middle' | 'lower' = bullBias
    ? r5 > 0.5 ? 'lower' : 'middle'
    : r5 > 0.5 ? 'upper' : 'middle';

  const stoch = bullBias
    ? Math.round(10 + r6 * 25)
    : Math.round(65 + r6 * 25);

  // Calculate factor score (-3 to +3 per factor, 6 factors total => -18 to +18, normalized)
  let score = 0;
  score += rsi < 30 ? 3 : rsi < 50 ? 1 : rsi > 70 ? -3 : -1;
  score += macd === 'bullish' ? 2 : macd === 'bearish' ? -2 : 0;
  score += ema === 'up' ? 2 : ema === 'down' ? -2 : 0;
  score += bb === 'lower' ? 1 : bb === 'upper' ? -1 : 0;
  score += stoch < 20 ? 2 : stoch > 80 ? -2 : 0;
  score += direction === 'BUY' ? 1 : -1;

  const confidence = Math.round(55 + Math.abs(score) * 2.5 + seededRandom(seed + 10) * 10);

  return {
    timeframe: tf,
    direction,
    confidence: Math.min(95, confidence),
    rsi,
    macd,
    ema,
    bb,
    stoch,
    score,
  };
}

function computeConfluence(signals: TimeframeSignal[]): { confluence: number; direction: 'BUY' | 'SELL' | 'NEUTRAL'; aligned: number } {
  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const aligned = Math.max(buyCount, sellCount);
  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
  const maxScore = signals.length * 11; // max score per signal
  const confluence = Math.round((Math.abs(totalScore) / maxScore) * 100);

  return {
    confluence: Math.min(100, confluence),
    direction: buyCount > sellCount ? 'BUY' : sellCount > buyCount ? 'SELL' : 'NEUTRAL',
    aligned,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolFilter = searchParams.get('symbol')?.toUpperCase();

  const targetSymbols = symbolFilter
    ? SYMBOLS.filter(s => s.symbol === symbolFilter)
    : SYMBOLS;

  if (symbolFilter && targetSymbols.length === 0) {
    return NextResponse.json(
      { error: `Unknown symbol: ${symbolFilter}` },
      { status: 400 }
    );
  }

  // Use minute-level seed for semi-stable signals
  const baseSeed = Math.floor(Date.now() / 60000);

  const analyses: MTFAnalysis[] = targetSymbols.map(sym => {
    const symbolSeed = baseSeed + sym.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const timeframes = TIMEFRAMES.map(tf => analyzeTimeframe(sym.symbol, tf, symbolSeed));
    const { confluence, direction, aligned } = computeConfluence(timeframes);

    return {
      symbol: sym.symbol,
      timeframes,
      confluence,
      dominantDirection: direction,
      alignedTimeframes: aligned,
    };
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    count: analyses.length,
    analyses,
  });
}
