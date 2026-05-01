import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessContext } from '@/lib/tier';
import { fetchLayoutChart } from '@/lib/chart-img';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FREE_STRATEGY = 'classic';

/**
 * Tier-gated TradingView layout chart proxy.
 * GET /api/premium-signals/chart?symbol=XAUUSD&tf=H1&layout=hafiz
 *
 * Requires any unlocked premium strategy (Pro+ tier). Returns PNG bytes
 * streamed from chart-img.com. Session cookies from Railway env (TRADINGVIEW_SESSION_*).
 */
export async function GET(req: NextRequest) {
  const access = await resolveAccessContext(req);
  const premium = [...access.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (premium.length === 0) {
    return NextResponse.json({ error: 'locked' }, { status: 403 });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') ?? 'XAUUSD';
  const timeframe = url.searchParams.get('tf') ?? 'H1';
  const layout = url.searchParams.get('layout') ?? undefined;

  const result = await fetchLayoutChart({ symbol, timeframe, layout });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.bytes, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
