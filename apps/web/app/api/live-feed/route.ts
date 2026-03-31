import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../lib/tracked-signals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { signals } = await getTrackedSignals({});

    const latest = signals
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
        entry: s.entry,
        tp: s.tp,
        sl: s.sl,
        timeframe: s.timeframe,
        timestamp: s.timestamp,
      }));

    return NextResponse.json(
      {
        signals: latest,
        count: latest.length,
        updatedAt: new Date().toISOString(),
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
      { signals: [], count: 0, updatedAt: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
