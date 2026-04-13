import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync, computeLeaderboard } from '../../../lib/signal-history';
import { getLeaderboard } from '../../../lib/leaderboard-cache';

const VALID_STRATEGIES = new Set([
  'classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk',
]);

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
    const rawStrategy = searchParams.get('strategyId');
    const strategyFilter = rawStrategy && VALID_STRATEGIES.has(rawStrategy)
      ? rawStrategy
      : undefined;

    // Strategy-filtered variant recomputes from history; the unfiltered path
    // still uses the precomputed cache.
    const data = strategyFilter
      ? computeLeaderboard(await readHistoryAsync(), period, sortBy, strategyFilter)
      : await getLeaderboard(period, sortBy);

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
