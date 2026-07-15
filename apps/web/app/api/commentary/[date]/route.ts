import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      available: false,
      commentary: null,
      date,
      reason: 'No traceable commentary source is configured.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
