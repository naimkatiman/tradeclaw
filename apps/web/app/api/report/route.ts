import { NextResponse } from 'next/server';
import { getWeeklyPulse } from '../../../lib/weekly-pulse';

export const revalidate = 3600;

// Weekly Pulse: real, resolved-signal stats for the current ISO week, computed
// from signal_history through the canonical isCountedResolved predicate. This
// replaced a mulberry32 PRNG that fabricated win rate / signal count / top
// asset unconditionally. When fewer than WEEKLY_PULSE_MIN signals have resolved
// the payload sets hasEnoughData=false and the page shows an honest empty state.
export async function GET() {
  try {
    const pulse = await getWeeklyPulse();
    return NextResponse.json(pulse, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
