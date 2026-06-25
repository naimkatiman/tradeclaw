import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessContext, TIER_DELAY_MS } from '../../../lib/tier';
import {
  listPremiumSignalsSince,
  getPremiumSignalsFor,
  getDelayedPremiumSignals,
} from '../../../lib/premium-signals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const access = await resolveAccessContext(req);
  const isFree = access.tier === 'free';

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;

  let signals;
  if (isFree) {
    // Free tier sees delayed premium signals (30-min delay per ROADMAP 2.6)
    signals = await getDelayedPremiumSignals(TIER_DELAY_MS.free, { limit: 50 });
    // Apply free-tier field masking — hide live risk levels for delayed signals
    signals = signals.map((s) => ({
      ...s,
      stopLoss: null,
      takeProfit2: null,
      takeProfit3: null,
    }));
  } else {
    signals = Number.isFinite(sinceMs) && sinceMs > 0
      ? await listPremiumSignalsSince(access, sinceMs)
      : await getPremiumSignalsFor(access, { limit: 50 });
  }

  return NextResponse.json({
    signals,
    now: Date.now(),
    locked: false,
    delayed: isFree,
  });
}
