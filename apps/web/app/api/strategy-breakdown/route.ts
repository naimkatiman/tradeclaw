import { NextRequest, NextResponse } from 'next/server';
import { getStrategyBreakdown } from '../../../lib/leaderboard-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get('period') ?? 'all';
    const period: '7d' | '30d' | 'all' =
      rawPeriod === '7d' ? '7d' : rawPeriod === '30d' ? '30d' : 'all';

    const rows = await getStrategyBreakdown(period);

    return NextResponse.json(
      { period, rows, generatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
