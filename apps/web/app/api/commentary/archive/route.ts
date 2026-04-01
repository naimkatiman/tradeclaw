import { NextResponse } from 'next/server';
import { getCommentaryArchive } from '../../../lib/market-commentary';

export async function GET() {
  const archive = getCommentaryArchive(7);
  return NextResponse.json(archive, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
    },
  });
}
