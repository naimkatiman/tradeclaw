import { NextResponse } from 'next/server';
import { readHistoryAsync } from '../../../../lib/signal-history';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const now = Date.now();
    const history = (await readHistoryAsync()).filter(
      (signal) => !signal.isSimulated
        && !signal.gateBlocked
        && Number.isFinite(signal.timestamp)
        && signal.timestamp <= now,
    );
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const lastHour = history.filter((s) =>
      now - s.timestamp < oneHour,
    );
    const last24h = history.filter((s) =>
      now - s.timestamp < oneDay,
    );

    // Count by pair
    const pairCount: Record<string, number> = {};
    for (const s of last24h) {
      pairCount[s.pair] = (pairCount[s.pair] ?? 0) + 1;
    }
    const topPair = Object.entries(pairCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Active assets (pairs with signals in last 24h)
    const activeAssets = Object.keys(pairCount).length;

    // Last signal time
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const lastSignalTime = sorted[0]?.timestamp
      ? new Date(sorted[0].timestamp).toISOString()
      : null;

    // Hourly breakdown (last 24 hours)
    const hourlyBuckets: number[] = Array(24).fill(0);
    for (const s of last24h) {
      const hoursAgo = Math.floor((now - s.timestamp) / oneHour);
      if (hoursAgo >= 0 && hoursAgo < 24) {
        hourlyBuckets[23 - hoursAgo]++;
      }
    }

    return NextResponse.json(
      {
        available: history.length > 0,
        signalsLastHour: lastHour.length,
        signalsLast24h: last24h.length,
        activeAssets,
        topPair,
        lastSignalTime,
        hourlyBuckets,
        methodology: 'Counts recorded, non-simulated, non-gate-blocked signal candidates by their persisted timestamps.',
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    console.error('live/stats: recorded signal history unavailable', error);
    return NextResponse.json(
      {
        available: false,
        signalsLastHour: null,
        signalsLast24h: null,
        activeAssets: null,
        topPair: null,
        lastSignalTime: null,
        hourlyBuckets: [],
        error: 'recorded_signal_history_unavailable',
      },
      {
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
