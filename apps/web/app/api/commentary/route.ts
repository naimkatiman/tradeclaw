import { NextResponse } from 'next/server';
import { generateDailyCommentary } from '../../lib/market-commentary';

export const revalidate = 3600;

export async function GET() {
  const commentary = generateDailyCommentary();
  return NextResponse.json(commentary, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
    },
  });
}
