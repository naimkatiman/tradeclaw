/**
 * Tiny in-memory rolling-window rate limiter.
 *
 * Suitable for small free-tier quota caps (e.g. 10/day) where perfect
 * global accuracy across a multi-process deploy does not matter — each
 * process holds its own Map, and the worst case is a Pro-worthy user
 * bypassing quota by a factor equal to the process count. For a 10/day
 * cap on a 1-instance Railway deploy, that's fine.
 *
 * For anything that must be globally enforced, swap this for Redis or a
 * DB-backed counter. This module's surface was chosen so that swap is a
 * one-file change: callers pass a key + window config and get back a
 * decision. No caller touches the underlying store.
 */

interface RateWindow {
  max: number;
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  used: number;
  remaining: number;
}

const store: Map<string, number[]> = new Map();

/**
 * Records a call attempt at `now` (if allowed) and returns the decision.
 * Timestamps older than the window are pruned on every check so the
 * store does not grow unboundedly.
 */
export function check(
  key: string,
  window: RateWindow,
  now: number = Date.now(),
): RateDecision {
  const cutoff = now - window.windowMs;
  const hits = store.get(key) ?? [];
  // Prune in place by slicing to a fresh array — avoids O(n^2) splicing.
  const fresh: number[] = [];
  for (const t of hits) {
    if (t > cutoff) fresh.push(t);
  }

  if (fresh.length >= window.max) {
    store.set(key, fresh);
    return { allowed: false, used: fresh.length, remaining: 0 };
  }

  fresh.push(now);
  store.set(key, fresh);
  return {
    allowed: true,
    used: fresh.length,
    remaining: window.max - fresh.length,
  };
}

/** Test-only: clears the in-memory store. */
export function __resetForTest(): void {
  store.clear();
}
