import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      mode: 'unavailable',
      assets: [],
      error: 'Synthetic performance metrics have been removed. Use /api/leaderboard for recorded outcomes.',
    },
    { status: 410, headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
