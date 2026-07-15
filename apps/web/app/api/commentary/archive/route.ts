import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      available: false,
      entries: [],
      reason: 'No traceable commentary source is configured.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
