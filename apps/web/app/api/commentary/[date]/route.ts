import { NextRequest, NextResponse } from 'next/server';
import { generateDailyCommentary } from '../../../lib/market-commentary';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const commentary = generateDailyCommentary(date);
  return NextResponse.json(commentary, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
