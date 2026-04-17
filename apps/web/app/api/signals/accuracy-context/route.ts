import { NextRequest, NextResponse } from 'next/server';
import { computeAccuracyContext } from '@/lib/accuracy-context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const timeframe = req.nextUrl.searchParams.get('timeframe');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  // Read from signal_history — same source as track-record
  const { readHistoryAsync } = await import('@/lib/signal-history');
  const rows = await readHistoryAsync();
  const ctx = computeAccuracyContext(rows as any, symbol, timeframe ?? 'H1');

  if (!ctx) {
    return NextResponse.json({ accuracy: null });
  }

  return NextResponse.json({ accuracy: ctx });
}
