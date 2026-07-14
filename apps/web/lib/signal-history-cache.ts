import type { SignalHistoryRecord } from './signal-history';
import { redis, isRedisAvailable, ensureRedis, redisKey } from './redis';

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_KEY = redisKey('signal-history');

interface CacheEntry {
  rows: SignalHistoryRecord[];
  expiresAt: number;
}

interface InflightRead {
  generation: number;
  token: symbol;
  promise: Promise<SignalHistoryRecord[]>;
}

let memoryCache: CacheEntry | null = null;
let cacheGeneration = 0;
let inflight: InflightRead | null = null;

/**
 * Returns cached signal history. On first call (or after TTL expiry),
 * calls readHistoryAsync() and stores the result.
 * Concurrent callers share one in-flight promise (no thundering herd).
 *
 * Reads from Redis when available; falls back to an in-memory cache
 * so the app works without Redis in test/local environments.
 */
export async function getCachedHistory(): Promise<SignalHistoryRecord[]> {
  const generation = cacheGeneration;

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
          if (generation !== cacheGeneration) {
            return getCachedHistory();
          }
          memoryCache = parsed; // warm local memory
          return parsed.rows;
        }
        // Stale — remove it only if no invalidation superseded this read.
        if (generation === cacheGeneration) {
          await redis.del(CACHE_KEY);
        }
      }
    }
  } catch {
    // Redis unavailable — fall through to DB fetch
  }

  // Invalidation may have happened while Redis initialization or lookup was
  // pending. Retry at the current generation before touching the inflight slot.
  if (generation !== cacheGeneration) {
    return getCachedHistory();
  }

  // 3. Deduplicated DB fetch. A generation prevents an invalidated request
  // from being shared with, or overwriting, a newer request.
  if (inflight?.generation === generation) return inflight.promise;

  const requestToken = Symbol('signal-history-read');
  const promise = (async () => {
    try {
      const { readHistoryAsync } = await import('./signal-history');
      const rows = await readHistoryAsync();
      const entry: CacheEntry = { rows, expiresAt: Date.now() + TTL_MS };

      // Write back to Redis (best-effort).
      try {
        if (generation === cacheGeneration && isRedisAvailable() && redis) {
          await redis.set(CACHE_KEY, JSON.stringify(entry), 'PX', TTL_MS);
          // Invalidation may have raced the write. Delete the old generation
          // again so this request cannot resurrect stale rows in Redis.
          if (generation !== cacheGeneration) {
            await redis.del(CACHE_KEY);
          }
        }
      } catch {
        // ignore Redis write errors
      }

      if (generation === cacheGeneration) {
        memoryCache = entry;
      }
      return rows;
    } catch (error) {
      // An expired snapshot is safer than turning a transient database outage
      // into a convincing zero-signal result. With no prior snapshot, surface
      // the read failure so API/UI callers can render an unavailable state.
      if (memoryCache) return memoryCache.rows;
      throw error;
    } finally {
      if (inflight?.token === requestToken) {
        inflight = null;
      }
    }
  })();

  inflight = { generation, token: requestToken, promise };
  return promise;
}

/** Force-expire the cache (call after new signals are recorded). */
export async function invalidateHistoryCache(): Promise<void> {
  cacheGeneration += 1;
  memoryCache = null;
  inflight = null;
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
