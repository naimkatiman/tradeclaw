import { NextResponse } from 'next/server';
import { getVoteStats } from '../../../../lib/votes';

export async function GET() {
  try {
    const stats = getVoteStats();
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
