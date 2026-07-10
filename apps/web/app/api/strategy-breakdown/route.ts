import { NextRequest, NextResponse } from 'next/server';
import { getStrategyBreakdown } from '../../../lib/leaderboard-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get('period') ?? 'all';
    const period: '7d' | '30d' | 'all' =
      rawPeriod === '7d' ? '7d' : rawPeriod === '30d' ? '30d' : 'all';

    const rows = await getStrategyBreakdown(period);
    // TradingView partner strategies stay dark pending partner sign-off
    // (plan open decision #4).
    const visible = rows.filter((r) => !(r.strategyId ?? '').startsWith('tv-'));

    return NextResponse.json(
      { period, rows: visible, generatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
