import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { signals } = await getTrackedSignalsForRequest(req, {
      minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    });

    const latest = signals
      .filter((signal) =>
        signal.dataQuality === 'real' &&
        (signal.direction === 'BUY' || signal.direction === 'SELL') &&
        Number.isFinite(signal.confidence) &&
        signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE &&
        signal.confidence <= 100 &&
        !Number.isNaN(Date.parse(signal.timestamp)),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
        entry: s.entry,
        tp: s.takeProfit1,
        sl: s.stopLoss,
        timeframe: s.timeframe,
        timestamp: s.timestamp,
        dataQuality: 'real' as const,
      }));

    return NextResponse.json(
      {
        available: latest.length > 0,
        signals: latest,
        count: latest.length,
        latestSignalAt: latest[0]?.timestamp ?? null,
        fetchedAt: new Date().toISOString(),
        reason: latest.length > 0 ? null : 'no-eligible-recorded-signal',
        note: 'Eligible real-quality recorded signals only; no publication cadence or broker execution is claimed.',
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        available: false,
        signals: [],
        count: 0,
        latestSignalAt: null,
        fetchedAt: new Date().toISOString(),
        reason: 'signal-source-unavailable',
        note: 'No fallback signals or fresh-looking update timestamp were substituted.',
      },
      {
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
