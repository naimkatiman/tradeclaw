import { NextRequest, NextResponse } from 'next/server';
import { computeLeaderboard, recomputeOverall, type SignalHistoryRecord } from '../../../lib/signal-history';
import { getCachedHistory } from '../../../lib/signal-history-cache';
import { getLeaderboard } from '../../../lib/leaderboard-cache';
import { getResolvedSlice, parseScope } from '../../../lib/signal-slice';
import { parseCategoryFilter, symbolsForCategory } from '../../lib/symbol-config';

const VALID_STRATEGIES = new Set([
  'classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk',
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawPeriod = searchParams.get('period') ?? '30d';
    const period: '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all' =
      rawPeriod === '7d' ? '7d'
      : rawPeriod === '90d' ? '90d'
      : rawPeriod === '180d' ? '180d'
      : rawPeriod === '1y' ? '1y'
      : rawPeriod === '5y' ? '5y'
      : rawPeriod === 'all' ? 'all'
      : '30d';

    const rawSort = searchParams.get('sort') ?? 'hitRate';
    const sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence' =
      rawSort === 'totalSignals' ? 'totalSignals'
      : rawSort === 'avgConfidence' ? 'avgConfidence'
      : 'hitRate';

    const pairFilter = searchParams.get('pair')?.toUpperCase();
    const scope = parseScope(searchParams.get('scope'));
    const category = parseCategoryFilter(searchParams.get('category'));
    const rawStrategy = searchParams.get('strategyId');
    const strategyFilter = rawStrategy && VALID_STRATEGIES.has(rawStrategy)
      ? rawStrategy
      : undefined;

    let detailHistory: SignalHistoryRecord[] | null = null;

    // Strategy-filtered and free-scope variants recompute from history; the
    // unfiltered Pro path still uses the precomputed period:sort cache.
    const data = await (async () => {
      if (scope === 'free') {
        const slice = await getResolvedSlice({ scope, period });
        detailHistory = slice.periodFiltered;
        return computeLeaderboard(slice.periodFiltered, 'all', sortBy, strategyFilter);
      }
      if (strategyFilter) {
        return computeLeaderboard(await getCachedHistory(), period, sortBy, strategyFilter);
      }
      return getLeaderboard(period, sortBy);
    })();

    const responseData = !pairFilter && category !== 'all'
      ? (() => {
          const allowed = new Set(symbolsForCategory(category));
          const assets = data.assets.filter(a => allowed.has(a.pair));
          return {
            ...data,
            assets,
            overall: recomputeOverall(assets, data.overall.lastUpdated),
          };
        })()
      : data;

    if (pairFilter) {
      const asset = responseData.assets.find(a => a.pair === pairFilter);
      if (!asset) {
        return NextResponse.json({ error: `No data for pair: ${pairFilter}` }, { status: 404 });
      }

      const history = detailHistory ?? await getCachedHistory();
      const pairRecords = history
        .filter(r => r.pair === pairFilter)
        .slice(0, 50);

      return NextResponse.json({ asset, records: pairRecords }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
