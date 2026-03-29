import { NextRequest, NextResponse } from 'next/server';
import { generateMultiTFSignal } from '../../lib/signal-generator';
import { SYMBOLS } from '../../lib/signals';

export const dynamic = 'force-dynamic';


interface TimeframeSignal {
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
  ema: 'up' | 'down' | 'sideways';
  bb: 'upper' | 'middle' | 'lower';
  stoch: number;
  score: number;
}

interface MTFAnalysis {
  symbol: string;
  timeframes: TimeframeSignal[];
  confluence: number;
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  alignedTimeframes: number;
}

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
}
