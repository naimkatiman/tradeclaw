import { NextRequest, NextResponse } from 'next/server';
import { resolveLicense } from '@/lib/licenses';
import { listPremiumSignalsSince, getPremiumSignalsFor } from '@/lib/premium-signals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await resolveLicense(req);
  if (ctx.unlockedStrategies.size <= 1) {
    return NextResponse.json({ signals: [], locked: true });
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const sinceMs = sinceParam ? Number(sinceParam) : NaN;

  const signals = Number.isFinite(sinceMs) && sinceMs > 0
    ? await listPremiumSignalsSince(ctx, sinceMs)
    : await getPremiumSignalsFor(ctx, { limit: 50 });

  return NextResponse.json({
    signals,
    now: Date.now(),
    locked: false,
  });
}
