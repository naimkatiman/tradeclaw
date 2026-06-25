import { NextResponse } from 'next/server';
import { getWrappedStats } from '../../../lib/wrapped-stats';

// Real, platform-wide "year in review" for TradeClaw's tracked signals — total
// resolved signals, best/worst pair, accuracy trend, win streak, all from
// signal_history via isCountedResolved. Replaced a client-side seeded LCG that
// fabricated per-"user" stats (the product has no per-user trade ledger).
// hasEnoughData=false → the page shows an honest "not enough history yet" state.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentYear = new Date().getUTCFullYear();
    const parsed = Number(searchParams.get('year'));
    const year =
      Number.isInteger(parsed) && parsed >= 2020 && parsed <= currentYear ? parsed : currentYear;

    const stats = await getWrappedStats(year);
    return NextResponse.json(stats, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
