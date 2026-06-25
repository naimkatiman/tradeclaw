/**
 * Redis client wrapper with graceful fallback.
 *
 * Uses ioredis when REDIS_URL is available; otherwise all operations
 * silently fall back to in-memory or no-op behavior. This keeps the
 * app functional in local-dev and test environments without a Redis
 * server running.
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let redis: Redis | null = null;
let redisAvailable = false;

function createRedisClient(): Redis | null {
  // Skip Redis entirely when the URL is explicitly empty
  if (process.env.REDIS_URL === '') return null;

  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: () => null, // fail fast — don't retry indefinitely
    });

    client.on('error', (err) => {
      // Log once then swallow to prevent crashing the process
      if (redisAvailable) {
        console.warn('[redis] connection error, falling back to no-cache:', err.message);
        redisAvailable = false;
      }
    });

    return client;
  } catch {
    return null;
  }
}

redis = createRedisClient();

/** Ensure the client is connected before using it. */
export async function ensureRedis(): Promise<boolean> {
  if (!redis || redisAvailable) return redisAvailable;
  try {
    await redis.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

/** Returns true if Redis is reachable right now. */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/** Exported client — callers MUST check `isRedisAvailable()` first. */
export { redis };

/** Prefix helper for project-scoped keys. */
export function redisKey(name: string): string {
  return `tc:${name}`;
}
