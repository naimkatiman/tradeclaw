import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD

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
=======
import { generateMultiTFSignal } from '../../lib/signal-generator';
import { SYMBOLS } from '../../lib/signals';

export const dynamic = 'force-dynamic';


interface TimeframeSignal {
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
>>>>>>> origin/main
  confidence: number;
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
  ema: 'up' | 'down' | 'sideways';
  bb: 'upper' | 'middle' | 'lower';
  stoch: number;
<<<<<<< HEAD
  score: number; // -3 to +3 factor score
=======
  score: number;
>>>>>>> origin/main
}

interface MTFAnalysis {
  symbol: string;
  timeframes: TimeframeSignal[];
<<<<<<< HEAD
  confluence: number; // 0-100 confluence score
=======
  confluence: number;
>>>>>>> origin/main
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  alignedTimeframes: number;
}

<<<<<<< HEAD
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
=======
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolFilter = searchParams.get('symbol')?.toUpperCase();

    const targetSymbols = symbolFilter
      ? SYMBOLS.filter(s => s.symbol === symbolFilter)
      : SYMBOLS;

    if (symbolFilter && targetSymbols.length === 0) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbolFilter}` },
        { status: 400 },
      );
    }

    const settled = await Promise.allSettled(
      targetSymbols.map(s => generateMultiTFSignal(s.symbol)),
    );

    const analyses: MTFAnalysis[] = [];

    for (const result of settled) {
      if (result.status !== 'fulfilled' || result.value === null) continue;

      const mtf = result.value;

      // Map each real TFDirection into the TimeframeSignal shape the panel expects
      const timeframes: TimeframeSignal[] = mtf.timeframes.map(tf => {
        // Use the primary indicators from the MTF result for summary values
        const ind = mtf.indicators;

        return {
          timeframe: tf.timeframe,
          direction: tf.direction,
          confidence: tf.confidence,
          rsi: ind.rsi.value,
          macd: ind.macd.signal,
          ema: ind.ema.trend,
          bb: ind.bollingerBands.position,
          stoch: ind.stochastic.k,
          score: tf.buyScore - tf.sellScore,
        };
      });

      // Compute confluence as a percentage based on agreement and confidence
      const buyCount = mtf.timeframes.filter(t => t.direction === 'BUY').length;
      const sellCount = mtf.timeframes.filter(t => t.direction === 'SELL').length;
      const aligned = Math.max(buyCount, sellCount);
      const totalTFs = mtf.timeframes.length;
      const alignmentRatio = totalTFs > 0 ? aligned / totalTFs : 0;
      const avgConfidence = totalTFs > 0
        ? mtf.timeframes.reduce((sum, t) => sum + t.confidence, 0) / totalTFs
        : 0;
      const confluence = Math.min(100, Math.round(alignmentRatio * avgConfidence + mtf.confluenceBonus));

      analyses.push({
        symbol: mtf.symbol,
        timeframes,
        confluence: Math.max(0, confluence),
        dominantDirection: mtf.dominantDirection,
        alignedTimeframes: aligned,
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: analyses.length,
      analyses,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
