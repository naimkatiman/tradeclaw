import { NextResponse } from 'next/server';
import { fetchGateState, getGateMode } from '../../../../lib/full-risk-gates';

// Public gate observability. Returns the current regime-aware gate snapshot
// used by /api/signals recording pipeline. Safe to expose — everything here
// is derivable from signal_history (which already powers the public track
// record) and the dominant regime (which powers /regime).
export async function GET() {
  try {
    const [state, mode] = [await fetchGateState(), getGateMode()];
    return NextResponse.json(
      {
        mode,
        gatesAllow: state.gatesAllow,
        reason: state.reason,
        regime: state.regime,
        streakLossCount: state.streakLossCount,
        currentDrawdownPct: state.currentDrawdownPct,
        dataPoints: state.dataPoints,
        thresholds: state.thresholds,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'gate state unavailable' }, { status: 500 });
  }
}
