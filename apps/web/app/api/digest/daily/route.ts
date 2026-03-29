import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { signals } = await getTrackedSignals({});

    // Sort by confidence descending, take top 10
    const topSignals = [...signals]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
        entry: s.entry,
        stopLoss: s.stopLoss,
        takeProfit1: s.takeProfit1,
        takeProfit2: s.takeProfit2,
        timeframe: s.timeframe,
        timestamp: s.timestamp,
        indicators: {
          rsi: s.indicators.rsi.value,
          rsiSignal: s.indicators.rsi.signal,
          macd: s.indicators.macd.signal,
          emaTrend: s.indicators.ema.trend,
        },
      }));

    const buyCount = signals.filter(s => s.direction === 'BUY').length;
    const sellCount = signals.filter(s => s.direction === 'SELL').length;
    const avgConfidence = signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0;

    const digest = {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      summary: {
        totalSignals: signals.length,
        topSignalsCount: topSignals.length,
        buyCount,
        sellCount,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        marketBias: buyCount > sellCount ? 'BULLISH' : buyCount < sellCount ? 'BEARISH' : 'NEUTRAL',
      },
      topSignals,
      metadata: {
        source: 'TradeClaw AI Signal Engine',
        docs: 'https://tradeclaw.com/digest',
        apiDocs: 'https://tradeclaw.com/api-docs',
        repo: 'https://github.com/naimkatiman/tradeclaw',
      },
    };

    return NextResponse.json(digest, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}
