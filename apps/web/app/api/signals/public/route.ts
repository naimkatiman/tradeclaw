import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
import { toTeaser } from '../../../../lib/signal-teaser';
import { getStrategiesForTier } from '../../../../lib/tier';

/**
 * GET /api/signals/public
 *
 * Anonymous teaser feed for the marketing landing. Callers get
 * symbol/direction/confidence/timestamp only — no id, no entry, no
 * stop, no targets. Safe to cache publicly. Scraping a full page
 * of these reveals nothing actionable.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { signals } = await getTrackedSignals({
      ctx: { unlockedStrategies: getStrategiesForTier('free') },
    });
    const teasers = signals.map(toTeaser);
    return NextResponse.json(
      { count: teasers.length, signals: teasers },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ count: 0, signals: [] }, { status: 200 });
  }
}
