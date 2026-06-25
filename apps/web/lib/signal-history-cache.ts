import type { SignalHistoryRecord } from './signal-history';
import { redis, isRedisAvailable, ensureRedis, redisKey } from './redis';

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_KEY = redisKey('signal-history');

interface CacheEntry {
  rows: SignalHistoryRecord[];
  expiresAt: number;
}

let memoryCache: CacheEntry | null = null;
let inflight: Promise<SignalHistoryRecord[]> | null = null;

/**
 * Returns cached signal history. On first call (or after TTL expiry),
 * calls readHistoryAsync() and stores the result.
 * Concurrent callers share one in-flight promise (no thundering herd).
 *
 * Reads from Redis when available; falls back to an in-memory cache
 * so the app works without Redis in test/local environments.
 */
export async function getCachedHistory(): Promise<SignalHistoryRecord[]> {
  // 1. Try in-memory first (fastest)
  if (memoryCache && Date.now() < memoryCache.expiresAt) {
    return memoryCache.rows;
  }

  // 2. Try Redis next
  try {
    await ensureRedis();
    if (isRedisAvailable() && redis) {
      const raw = await redis.get(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry;
        if (parsed.expiresAt > Date.now()) {
          memoryCache = parsed; // warm local memory
          return parsed.rows;
        }
        // Stale — remove it
        await redis.del(CACHE_KEY);
      }
    }
  } catch {
    // Redis unavailable — fall through to DB fetch
  }

  // 3. Deduplicated DB fetch
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { readHistoryAsync } = await import('./signal-history');
      const rows = await readHistoryAsync();
      const entry: CacheEntry = { rows, expiresAt: Date.now() + TTL_MS };

      // Write back to Redis (best-effort)
      try {
        if (isRedisAvailable() && redis) {
          await redis.set(CACHE_KEY, JSON.stringify(entry), 'PX', TTL_MS);
        }
      } catch {
        // ignore Redis write errors
      }

      memoryCache = entry;
      return rows;
    } catch {
      return memoryCache?.rows ?? [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Force-expire the cache (call after new signals are recorded). */
export async function invalidateHistoryCache(): Promise<void> {
  memoryCache = null;
  try {
    if (isRedisAvailable() && redis) {
      await redis.del(CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

/** Test helper — inject rows directly without hitting DB. */
export function _setCacheForTest(rows: SignalHistoryRecord[]): void {
  memoryCache = { rows, expiresAt: Date.now() + TTL_MS };
}
