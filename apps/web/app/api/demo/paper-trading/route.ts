import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      mode: 'unavailable',
      positions: [],
      error: 'Synthetic portfolio balances have been removed. Sign in to use the persistent paper-trading account.',
    },
    { status: 410, headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
