/**
 * 5-minute in-memory cache for badge signals.
 * Prevents hammering the TA engine on every badge request.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  signal: {
    direction: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    rsi: number;
  };
  ts: number;
}

const cache = new Map<string, CacheEntry>();

export function getBadgeCache(key: string): CacheEntry['signal'] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.signal;
}

export function setBadgeCache(
  key: string,
  signal: CacheEntry['signal'],
): void {
  cache.set(key, { signal, ts: Date.now() });
}
