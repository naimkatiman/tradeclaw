import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { signals } = await getTrackedSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });

    if (signals.length === 0) {
      return NextResponse.json(
        { error: 'No signals available', signalOfTheDay: null },
        { status: 200 },
      );
    }

    // Find the highest confidence signal
    const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
    const best = sorted[0];

    const signalOfTheDay = {
      id: best.id,
      symbol: best.symbol,
      direction: best.direction,
      confidence: best.confidence,
      entry: best.entry,
      stopLoss: best.stopLoss,
      takeProfit1: best.takeProfit1,
      takeProfit2: best.takeProfit2,
      takeProfit3: best.takeProfit3,
      timeframe: best.timeframe,
      timestamp: best.timestamp,
      indicators: {
        rsi: { value: best.indicators.rsi.value, signal: best.indicators.rsi.signal },
        macd: { signal: best.indicators.macd.signal },
        ema: { trend: best.indicators.ema.trend },
      },
      reason: `${best.symbol} shows the strongest setup today with ${best.confidence}% confidence. ` +
        `RSI at ${best.indicators.rsi.value.toFixed(1)} (${best.indicators.rsi.signal}), ` +
        `MACD ${best.indicators.macd.signal}, EMA trend ${best.indicators.ema.trend}. ` +
        `${best.direction === 'BUY' ? 'Bullish' : 'Bearish'} bias across indicators.`,
    };

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      totalSignalsAnalyzed: signals.length,
      signalOfTheDay,
      shareUrl: `https://tradeclaw.com/signal/${best.symbol}-${best.timeframe}-${best.direction}`,
      metadata: {
        source: 'TradeClaw AI Signal Engine',
        docs: 'https://tradeclaw.com/today',
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get signal of the day' }, { status: 500 });
  }
}
