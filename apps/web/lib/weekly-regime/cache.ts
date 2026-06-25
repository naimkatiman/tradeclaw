/**
 * Weekly Regime Card cache.
 *
 * Mirrors `lib/leaderboard-cache.ts`: reads from Redis when available, falls
 * back to an in-memory `Map` so the app works without Redis in test/local envs.
 *
 * TTL: from now until Sunday 23:59 KL of the card's week (clamped >= 1000ms),
 * so a cached card naturally expires when its week ends.
 */

import 'server-only';

import { redis, isRedisAvailable, ensureRedis, redisKey } from '../redis';
import { cacheTtlMsFor } from './discipline';
import type { WeeklyRegimeCard } from './types';

interface CachedCard {
  card: WeeklyRegimeCard;
  expiresAt: number;
}

const memoryCache = new Map<string, CachedCard>();

function cacheKey(weekStart: string): string {
  return redisKey(`weekly-regime:${weekStart}`);
}

async function getRedisCache<T>(key: string): Promise<T | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
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

async function delRedisKey(key: string): Promise<void> {
  try {
    if (isRedisAvailable() && redis) {
      await redis.del(key);
    }
  } catch {
    // ignore
  }
}

/** Return the cached card for a week, or null on miss/expiry. */
export async function getCachedCard(weekStart: string): Promise<WeeklyRegimeCard | null> {
  const mem = memoryCache.get(weekStart);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.card;
  }

  const redisData = await getRedisCache<CachedCard>(cacheKey(weekStart));
  if (redisData && redisData.expiresAt > Date.now()) {
    memoryCache.set(weekStart, redisData);
    return redisData.card;
  }

  return null;
}

/** Cache a card with a TTL that expires at Sunday 23:59 KL of its week. */
export async function setCachedCard(card: WeeklyRegimeCard): Promise<void> {
  const now = new Date();
  const ttlMs = cacheTtlMsFor(card, now);
  const entry: CachedCard = { card, expiresAt: now.getTime() + ttlMs };
  memoryCache.set(card.week_start, entry);
  await setRedisCache(cacheKey(card.week_start), entry, ttlMs);
}

/** Drop a week's card from both memory and Redis. */
export async function invalidateCard(weekStart: string): Promise<void> {
  memoryCache.delete(weekStart);
  await delRedisKey(cacheKey(weekStart));
}
