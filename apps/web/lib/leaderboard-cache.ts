/**
 * Leaderboard snapshot cache.
 *
 * Precomputes leaderboard data after outcome resolution and serves it
 * instantly by period key. Reads from Redis when available; falls back
 * to in-memory Maps so the app works without Redis in test/local envs.
 *
 * TTL: 2 minutes (matches the stale-while-revalidate window).
 * Invalidated explicitly when new outcomes are recorded.
 */

import {
  readHistoryAsync,
  computeLeaderboard,
  computeStrategyBreakdown,
  resolveRealOutcomes,
  type LeaderboardData,
  type StrategyBreakdownRow,
} from './signal-history';
import { redis, isRedisAvailable, ensureRedis, redisKey } from './redis';

interface CachedSnapshot {
  data: LeaderboardData;
  expiresAt: number;
}

interface CachedBreakdown {
  data: StrategyBreakdownRow[];
  expiresAt: number;
}

const TTL_MS = 2 * 60 * 1000; // 2 minutes
const memoryCache = new Map<string, CachedSnapshot>();
const memoryBreakdownCache = new Map<string, CachedBreakdown>();

let refreshInFlight = false;

function cacheKey(period: string, sortBy: string): string {
  return redisKey(`leaderboard:${period}:${sortBy}`);
}

function breakdownKey(period: string): string {
  return redisKey(`leaderboard:breakdown:${period}`);
}

async function getRedisCache<T>(key: string): Promise<T | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return null;
  }
}

async function setRedisCache(key: string, value: unknown, ttlMs: number): Promise<void> {
  try {
    if (isRedisAvailable() && redis) {
      await redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    }
  } catch {
    // ignore
  }
}

async function delRedisPattern(pattern: string): Promise<void> {
  try {
    if (isRedisAvailable() && redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Get leaderboard data from cache if fresh, otherwise recompute.
 * Returns cached data instantly when available.
 */
export async function getLeaderboard(
  period: '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all',
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence',
): Promise<LeaderboardData> {
  const memKey = `${period}:${sortBy}`;
  const mem = memoryCache.get(memKey);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.data;
  }

  const redisData = await getRedisCache<CachedSnapshot>(cacheKey(period, sortBy));
  if (redisData && redisData.expiresAt > Date.now()) {
    memoryCache.set(memKey, redisData);
    return redisData.data;
  }

  // Cache miss — recompute (deduplicated)
  return refreshAndGet(period, sortBy);
}

/**
 * Resolve outcomes + recompute all period variants + cache them.
 * Called from outcome checker cron or on cache miss.
 */
export async function refreshLeaderboardCache(): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;

  try {
    await resolveRealOutcomes();
    const history = await readHistoryAsync();
    const now = Date.now();

    for (const period of ['7d', '30d', '90d', '180d', '1y', '5y', 'all'] as const) {
      for (const sortBy of ['hitRate', 'totalSignals', 'avgConfidence'] as const) {
        const data = computeLeaderboard(history, period, sortBy);
        const entry: CachedSnapshot = { data, expiresAt: now + TTL_MS };
        memoryCache.set(`${period}:${sortBy}`, entry);
        await setRedisCache(cacheKey(period, sortBy), entry, TTL_MS);
      }

      // Also refresh breakdowns
      const breakdownData = computeStrategyBreakdown(history, period);
      const breakdownEntry: CachedBreakdown = { data: breakdownData, expiresAt: now + TTL_MS };
      memoryBreakdownCache.set(period, breakdownEntry);
      await setRedisCache(breakdownKey(period), breakdownEntry, TTL_MS);
    }
  } finally {
    refreshInFlight = false;
  }
}

async function refreshAndGet(
  period: '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all',
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence',
): Promise<LeaderboardData> {
  await refreshLeaderboardCache();
  const mem = memoryCache.get(`${period}:${sortBy}`);
  if (mem) return mem.data;

  // Fallback: compute directly (should not happen)
  const history = await readHistoryAsync();
  return computeLeaderboard(history, period, sortBy);
}

/** Invalidate all cached snapshots — call when new outcomes are recorded. */
export async function invalidateLeaderboardCache(): Promise<void> {
  memoryCache.clear();
  memoryBreakdownCache.clear();
  await delRedisPattern(redisKey('leaderboard:*'));
}

export async function getStrategyBreakdown(
  period: '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all',
): Promise<StrategyBreakdownRow[]> {
  const mem = memoryBreakdownCache.get(period);
  if (mem && Date.now() < mem.expiresAt) return mem.data;

  const redisData = await getRedisCache<CachedBreakdown>(breakdownKey(period));
  if (redisData && redisData.expiresAt > Date.now()) {
    memoryBreakdownCache.set(period, redisData);
    return redisData.data;
  }

  const history = await readHistoryAsync();
  const data = computeStrategyBreakdown(history, period);
  const entry: CachedBreakdown = { data, expiresAt: Date.now() + TTL_MS };
  memoryBreakdownCache.set(period, entry);
  await setRedisCache(breakdownKey(period), entry, TTL_MS);
  return data;
}
