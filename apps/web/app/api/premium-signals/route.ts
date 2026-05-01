import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessContext } from '../../../lib/tier';
import { listPremiumSignalsSince, getPremiumSignalsFor } from '../../../lib/premium-signals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const access = await resolveAccessContext(req);
  if (access.unlockedStrategies.size <= 1) {
    return NextResponse.json({ signals: [], locked: true });
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;

  const signals = Number.isFinite(sinceMs) && sinceMs > 0
    ? await listPremiumSignalsSince(access, sinceMs)
    : await getPremiumSignalsFor(access, { limit: 50 });

  return NextResponse.json({
    signals,
    now: Date.now(),
    locked: false,
  });
}
