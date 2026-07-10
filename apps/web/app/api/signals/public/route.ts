import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
import { redis, isRedisAvailable, redisKey } from '../../../../lib/redis';
import type { TradingSignal } from '../../../lib/signals';

const CACHE_TTL_SECONDS = 60;
const CACHE_KEY = redisKey('signals:public:full');

interface PublicCache {
  count: number;
  signals: TradingSignal[];
  cachedAt: number;
}

/**
 * GET /api/signals/public
 *
 * Anonymous signal feed. The teaser masking is retired — everything is free
 * for everyone, so anonymous callers get the same full signal payload
 * (entry, SL, TPs, indicators) as /api/signals. Path kept for existing
 * consumers. Safe to cache publicly.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Try Redis cache first
    if (isRedisAvailable() && redis) {
      try {
        const raw = await redis.get(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PublicCache;
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

    const { signals } = await getTrackedSignals({});
    const response = { count: signals.length, signals };

    // Write to Redis cache
    if (isRedisAvailable() && redis) {
      try {
        const cachePayload: PublicCache = {
          count: response.count,
          signals,
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
