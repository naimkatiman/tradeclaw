import { NextRequest, NextResponse } from 'next/server';
import { getStrategyBreakdown } from '../../../lib/leaderboard-cache';
import { resolveLicense, FREE_STRATEGY } from '../../../lib/licenses';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get('period') ?? 'all';
    const period: '7d' | '30d' | 'all' =
      rawPeriod === '7d' ? '7d' : rawPeriod === '30d' ? '30d' : 'all';

    const ctx = await resolveLicense(request);
    const rows = await getStrategyBreakdown(period);
    const visible = rows.filter((r) =>
      ctx.unlockedStrategies.has(r.strategyId ?? FREE_STRATEGY),
    );

    return NextResponse.json(
      { period, rows: visible, generatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
