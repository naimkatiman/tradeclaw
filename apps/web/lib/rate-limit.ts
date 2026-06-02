/**
 * Rolling-window rate limiter with Redis-backed global enforcement.
 *
 * When REDIS_URL is available, uses a Redis sorted set per key for a
 * true global sliding window across all server instances. Falls back
 * to an in-memory Map when Redis is unreachable or not configured,
 * preserving local-dev and test compatibility.
 */

import { redis, isRedisAvailable, ensureRedis, redisKey } from './redis';

interface RateWindow {
  max: number;
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  used: number;
  remaining: number;
}

const memoryStore: Map<string, number[]> = new Map();

function checkInMemory(key: string, window: RateWindow, now: number): RateDecision {
  const cutoff = now - window.windowMs;
  const hits = memoryStore.get(key) ?? [];
  const fresh: number[] = [];
  for (const t of hits) {
    if (t > cutoff) fresh.push(t);
  }

  if (fresh.length >= window.max) {
    memoryStore.set(key, fresh);
    return { allowed: false, used: fresh.length, remaining: 0 };
  }

  fresh.push(now);
  memoryStore.set(key, fresh);
  return {
    allowed: true,
    used: fresh.length,
    remaining: window.max - fresh.length,
  };
}

async function checkRedis(key: string, window: RateWindow, now: number): Promise<RateDecision> {
  const r = redis!;
  const rk = redisKey(`rate-limit:${key}`);
  const cutoff = now - window.windowMs;

  // Remove expired entries, count remaining, add current atomically
  const pipeline = r.multi();
  pipeline.zremrangebyscore(rk, 0, cutoff);
  pipeline.zcard(rk);
  const results = await pipeline.exec();

  const count = (results?.[1]?.[1] as number) ?? 0;

  if (count >= window.max) {
    return { allowed: false, used: count, remaining: 0 };
  }

  // Use a unique member so two calls at the exact same millisecond don't collapse
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  await r.zadd(rk, now, member);
  await r.pexpire(rk, window.windowMs);

  return {
    allowed: true,
    used: count + 1,
    remaining: window.max - count - 1,
  };
}

/**
 * Records a call attempt at `now` (if allowed) and returns the decision.
 * Timestamps older than the window are pruned on every check so the
 * store does not grow unboundedly.
 */
export async function check(
  key: string,
  window: RateWindow,
  now: number = Date.now(),
): Promise<RateDecision> {
  // E2E-only bypass: never set in production. Gated on a dedicated var so the
  // real limiter still runs everywhere else (incl. unit tests + Railway prod).
  if (process.env.E2E_DISABLE_RATE_LIMIT === '1') {
    return { allowed: true, used: 0, remaining: window.max };
  }

  try {
    await ensureRedis();
    if (isRedisAvailable() && redis) {
      return await checkRedis(key, window, now);
    }
  } catch {
    // Redis error — fall through to in-memory
  }

  return checkInMemory(key, window, now);
}

/** Test-only: clears the in-memory store. */
export function __resetForTest(): void {
  memoryStore.clear();
}
