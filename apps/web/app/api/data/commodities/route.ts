import { NextRequest, NextResponse } from 'next/server';
import { fetchFreeGoldPrice, fetchFreeSilverPrice, fetchFreeGoldHistory } from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'prices'; // prices | history

  if (view === 'history') {
    const startYear = parseInt(searchParams.get('start') || '2000', 10);
    const endYear = parseInt(searchParams.get('end') || String(new Date().getFullYear()), 10);
    const history = await fetchFreeGoldHistory(startYear, endYear);
    return NextResponse.json({
      history,
      count: history.length,
      timestamp: new Date().toISOString(),
    });
  }

  const [gold, silver] = await Promise.allSettled([
    fetchFreeGoldPrice(),
    fetchFreeSilverPrice(),
  ]);

  const prices = [
    gold.status === 'fulfilled' ? gold.value : null,
    silver.status === 'fulfilled' ? silver.value : null,
  ].filter(Boolean);

  return NextResponse.json({
    prices,
    timestamp: new Date().toISOString(),
  });
}
