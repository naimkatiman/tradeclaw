import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync } from '../../../lib/signal-history';
import { getLeaderboard } from '../../../lib/leaderboard-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawPeriod = searchParams.get('period') ?? '30d';
    const period: '7d' | '30d' | 'all' =
      rawPeriod === '7d' ? '7d' : rawPeriod === 'all' ? 'all' : '30d';

    const rawSort = searchParams.get('sort') ?? 'hitRate';
    const sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence' =
      rawSort === 'totalSignals' ? 'totalSignals'
      : rawSort === 'avgConfidence' ? 'avgConfidence'
      : 'hitRate';

    const pairFilter = searchParams.get('pair')?.toUpperCase();

    // Serve from precomputed cache (resolves outcomes + computes on miss)
    const data = await getLeaderboard(period, sortBy);

    if (pairFilter) {
      const asset = data.assets.find(a => a.pair === pairFilter);
      if (!asset) {
        return NextResponse.json({ error: `No data for pair: ${pairFilter}` }, { status: 404 });
      }

      const history = await readHistoryAsync();
      const pairRecords = history
        .filter(r => r.pair === pairFilter)
        .slice(0, 50);

      return NextResponse.json({ asset, records: pairRecords }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
