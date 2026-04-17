import type { SignalHistoryRecord } from './signal-history';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  rows: SignalHistoryRecord[];
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<SignalHistoryRecord[]> | null = null;

/**
 * Returns cached signal history. On first call (or after TTL expiry),
 * calls readHistoryAsync() and stores the result.
 * Concurrent callers share one in-flight promise (no thundering herd).
 */
export async function getCachedHistory(): Promise<SignalHistoryRecord[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.rows;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { readHistoryAsync } = await import('./signal-history');
      const rows = await readHistoryAsync();
      cache = { rows, expiresAt: Date.now() + TTL_MS };
      return rows;
    } catch {
      return cache?.rows ?? [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Force-expire the cache (call after new signals are recorded). */
export function invalidateHistoryCache(): void {
  cache = null;
}

/** Test helper — inject rows directly without hitting DB. */
export function _setCacheForTest(rows: SignalHistoryRecord[]): void {
  cache = { rows, expiresAt: Date.now() + TTL_MS };
}
