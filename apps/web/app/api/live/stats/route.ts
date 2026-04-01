import { NextResponse } from 'next/server';
import { readHistory } from '../../../../lib/signal-history';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const history = readHistory();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const lastHour = history.filter((s) => now - s.timestamp < oneHour);
    const last24h = history.filter((s) => now - s.timestamp < oneDay);

    // Count by pair
    const pairCount: Record<string, number> = {};
    for (const s of last24h) {
      pairCount[s.pair] = (pairCount[s.pair] ?? 0) + 1;
    }
    const topPair = Object.entries(pairCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'BTCUSD';

    // Active assets (pairs with signals in last 24h)
    const activeAssets = Object.keys(pairCount).length;

    // Last signal time
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const lastSignalTime = sorted[0]?.timestamp
      ? new Date(sorted[0].timestamp).toISOString()
      : new Date().toISOString();

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
        signalsLastHour: lastHour.length,
        signalsLast24h: last24h.length,
        activeAssets,
        topPair,
        lastSignalTime,
        hourlyBuckets,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        signalsLastHour: 0,
        signalsLast24h: 0,
        activeAssets: 0,
        topPair: 'BTCUSD',
        lastSignalTime: new Date().toISOString(),
        hourlyBuckets: Array(24).fill(0),
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
