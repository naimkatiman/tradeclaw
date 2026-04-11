/**
 * In-memory leaderboard snapshot cache.
 *
 * Precomputes leaderboard data after outcome resolution and serves it
 * instantly by period key. Avoids recomputing on every API request.
 *
 * TTL: 2 minutes (matches the stale-while-revalidate window).
 * Invalidated explicitly when new outcomes are recorded.
 */

import {
  readHistoryAsync,
  computeLeaderboard,
  resolveRealOutcomes,
  type LeaderboardData,
} from './signal-history';

interface CachedSnapshot {
  data: LeaderboardData;
  expiresAt: number;
}

const TTL_MS = 2 * 60 * 1000; // 2 minutes
const cache = new Map<string, CachedSnapshot>();

let refreshInFlight = false;

function cacheKey(period: '7d' | '30d' | 'all', sortBy: string): string {
  return `${period}:${sortBy}`;
}

/**
 * Get leaderboard data from cache if fresh, otherwise recompute.
 * Returns cached data instantly when available.
 */
export async function getLeaderboard(
  period: '7d' | '30d' | 'all',
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence',
): Promise<LeaderboardData> {
  const key = cacheKey(period, sortBy);
  const cached = cache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
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

    for (const period of ['7d', '30d', 'all'] as const) {
      for (const sortBy of ['hitRate', 'totalSignals', 'avgConfidence'] as const) {
        const data = computeLeaderboard(history, period, sortBy);
        cache.set(cacheKey(period, sortBy), { data, expiresAt: now + TTL_MS });
      }
    }
  } finally {
    refreshInFlight = false;
  }
}

async function refreshAndGet(
  period: '7d' | '30d' | 'all',
  sortBy: 'hitRate' | 'totalSignals' | 'avgConfidence',
): Promise<LeaderboardData> {
  await refreshLeaderboardCache();
  const key = cacheKey(period, sortBy);
  const cached = cache.get(key);
  if (cached) return cached.data;

  // Fallback: compute directly (should not happen)
  const history = await readHistoryAsync();
  return computeLeaderboard(history, period, sortBy);
}

/** Invalidate all cached snapshots — call when new outcomes are recorded. */
export function invalidateLeaderboardCache(): void {
  cache.clear();
}
