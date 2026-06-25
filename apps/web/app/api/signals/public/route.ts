import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
import { toTeaser } from '../../../../lib/signal-teaser';
import { getStrategiesForTier } from '../../../../lib/tier';
import { redis, isRedisAvailable, redisKey } from '../../../../lib/redis';

const CACHE_TTL_SECONDS = 60;
const CACHE_KEY = redisKey('signals:public:teasers');

interface TeaserCache {
  count: number;
  signals: ReturnType<typeof toTeaser>[];
  cachedAt: number;
}

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
    // Try Redis cache first
    if (isRedisAvailable() && redis) {
      try {
        const raw = await redis.get(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as TeaserCache;
          const ageSeconds = (Date.now() - parsed.cachedAt) / 1000;
          if (ageSeconds < CACHE_TTL_SECONDS) {
            return NextResponse.json(
              { count: parsed.count, signals: parsed.signals, cached: true },
              { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
            );
          }
        }
      } catch {
        // Cache read failure is non-fatal
      }
    }

    const { signals } = await getTrackedSignals({
      ctx: { unlockedStrategies: getStrategiesForTier('free') },
    });
    const teasers = signals.map(toTeaser);
    const response = { count: teasers.length, signals: teasers };

    // Write to Redis cache
    if (isRedisAvailable() && redis) {
      try {
        const cachePayload: TeaserCache = {
          count: response.count,
          signals: teasers,
          cachedAt: Date.now(),
        };
        await redis.set(CACHE_KEY, JSON.stringify(cachePayload), 'EX', CACHE_TTL_SECONDS);
      } catch {
        // Cache write failure is non-fatal
      }
    }

    return NextResponse.json(
      response,
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ count: 0, signals: [] }, { status: 200 });
  }
}
