# Precomputed Outcome History & ATR Calibration Cache Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Precompute per-symbol outcome history and ATR calibration in the background so backtests and risk settings load instantly instead of recalculating on every view.

**Architecture:** Two in-memory caches exist today but warm lazily: `atr-calibration-cache.ts` (1-hour TTL, no prewarm) and the raw `readHistoryAsync()` call (no cache at all — hits Postgres every request). This plan adds: (1) a `signal-history-cache.ts` module that holds a server-side LRU with a 10-minute TTL, (2) a background prewarm job triggered by `instrumentation.ts` on startup, (3) a `/api/cron/prewarm` route that can be hit by the Railway cron to refresh both caches mid-day, (4) updates to the leaderboard and accuracy endpoints to read from cache instead of Postgres directly. **Production signal path in `tracked-signals.ts` is not touched — this plan only affects read paths.**

**Tech Stack:** Node.js in-process cache (Map + TTL), Next.js instrumentation hook, existing `refreshAtrCalibration()` from `atr-calibration-cache.ts`, existing `readHistoryAsync()` from `signal-history.ts`.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/web/lib/signal-history-cache.ts` | Cached wrapper around `readHistoryAsync()` with 10-min TTL |
| Modify | `apps/web/instrumentation.ts` | Call prewarm on startup |
| Create | `apps/web/app/api/cron/prewarm/route.ts` | POST endpoint to refresh both caches (called by Railway cron) |
| Modify | `apps/web/app/api/leaderboard/route.ts` | Read from `signal-history-cache` instead of direct DB call |
| Modify | `apps/web/app/api/signals/history/route.ts` | Read from `signal-history-cache` instead of direct DB call |
| Create | `apps/web/lib/__tests__/signal-history-cache.test.ts` | Unit tests for cache TTL and invalidation |

---

### Task 1: Signal History Cache Module

**Files:**
- Create: `apps/web/lib/signal-history-cache.ts`
- Test: `apps/web/lib/__tests__/signal-history-cache.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/lib/__tests__/signal-history-cache.test.ts
// Uses Jest fake timers to test TTL without real waits

import {
  getCachedHistory,
  invalidateHistoryCache,
  _setCacheForTest,
} from '../signal-history-cache';

describe('signal-history-cache', () => {
  beforeEach(() => invalidateHistoryCache());

  it('returns injected test data immediately', async () => {
    const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as any;
    _setCacheForTest(fakeRows);
    const result = await getCachedHistory();
    expect(result).toEqual(fakeRows);
  });

  it('returns empty array when cache is cold and no db (test env)', async () => {
    // In test env readHistoryAsync is mocked to return []
    const result = await getCachedHistory();
    expect(Array.isArray(result)).toBe(true);
  });

  it('invalidation clears the cache', async () => {
    const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as any;
    _setCacheForTest(fakeRows);
    invalidateHistoryCache();
    // After invalidation getCachedHistory will call readHistoryAsync (mocked to [])
    const result = await getCachedHistory();
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/signal-history-cache.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../signal-history-cache'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/lib/signal-history-cache.ts
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
```

- [ ] **Step 4: Add Jest mock for signal-history module**

Create `apps/web/lib/__mocks__/signal-history.ts`:

```typescript
// apps/web/lib/__mocks__/signal-history.ts
export async function readHistoryAsync() {
  return [];
}
```

- [ ] **Step 5: Run tests**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/signal-history-cache.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/signal-history-cache.ts apps/web/lib/__tests__/signal-history-cache.test.ts apps/web/lib/__mocks__/signal-history.ts
git commit -m "feat(perf): add signal-history-cache with 10min TTL and test helper"
```

---

### Task 2: Prewarm Cron Route

**Files:**
- Create: `apps/web/app/api/cron/prewarm/route.ts`

- [ ] **Step 1: Write the prewarm endpoint**

```typescript
// apps/web/app/api/cron/prewarm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedHistory, invalidateHistoryCache } from '@/lib/signal-history-cache';
import { refreshAtrCalibration } from '@/app/lib/atr-calibration-cache';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();

  // Force-refresh signal history cache
  invalidateHistoryCache();
  const rows = await getCachedHistory();

  // Refresh ATR calibration cache using fresh history
  const calibrations = await refreshAtrCalibration();

  return NextResponse.json({
    ok: true,
    historyRows: rows.length,
    calibratedSymbols: calibrations.size,
    durationMs: Date.now() - start,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/cron/prewarm/route.ts
git commit -m "feat(perf): add /api/cron/prewarm endpoint for cache refresh"
```

---

### Task 3: Wire Prewarm Into instrumentation.ts

**Files:**
- Modify: `apps/web/instrumentation.ts`

- [ ] **Step 1: Read current instrumentation.ts**

Read `apps/web/instrumentation.ts` to find the `register()` function and where existing cron self-scheduling is done.

- [ ] **Step 2: Add prewarm call on startup**

Inside the `register()` function, after the existing startup logic, add:

```typescript
// Prewarm caches on startup (non-blocking)
if (process.env.NEXT_RUNTIME === 'nodejs') {
  // Dynamic imports to avoid pulling DB modules into edge runtime
  Promise.all([
    import('./lib/signal-history-cache').then(({ getCachedHistory }) => getCachedHistory()),
    import('./app/lib/atr-calibration-cache').then(({ refreshAtrCalibration }) => refreshAtrCalibration()),
  ]).catch(() => undefined);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/instrumentation.ts
git commit -m "feat(perf): prewarm signal history and ATR caches on app startup"
```

---

### Task 4: Use Cache in Read Endpoints

**Files:**
- Modify: `apps/web/app/api/signals/history/route.ts`
- Modify: `apps/web/app/api/leaderboard/route.ts` (if it calls `readHistoryAsync` directly)

- [ ] **Step 1: Read history route**

Open `apps/web/app/api/signals/history/route.ts`. Find the call to `readHistoryAsync()`.

- [ ] **Step 2: Replace readHistoryAsync with getCachedHistory**

Change:
```typescript
import { readHistoryAsync } from '@/lib/signal-history';
// ...
const rows = await readHistoryAsync();
```

To:
```typescript
import { getCachedHistory } from '@/lib/signal-history-cache';
// ...
const rows = await getCachedHistory();
```

- [ ] **Step 3: Do the same for the leaderboard route**

Open `apps/web/app/api/leaderboard/route.ts`. If it calls `readHistoryAsync()`, replace with `getCachedHistory()` from `@/lib/signal-history-cache`.

- [ ] **Step 4: Invalidate cache after new signals are recorded**

In `apps/web/lib/signal-history.ts`, find the `recordSignalsAsync` function. After the DB insert, add:

```typescript
import { invalidateHistoryCache } from './signal-history-cache';
// after successful insert:
invalidateHistoryCache();
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/signals/history/route.ts apps/web/app/api/leaderboard/route.ts apps/web/lib/signal-history.ts
git commit -m "feat(perf): use getCachedHistory in history and leaderboard routes; invalidate on write"
```

---

### Task 5: Build & Verify

- [ ] **Step 1: Run full test suite**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npx jest --passWithNoTests
```
Expected: All tests pass.

- [ ] **Step 2: Run full build**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Measure improvement locally**

With `npm run dev`, open browser devtools Network tab, hit `/api/signals/history` twice:
- First call: cold (hits DB)
- Second call within 10 min: should be ~10-50ms (from cache)

- [ ] **Step 4: Final commit if build fixes needed**

```bash
git add -A && git commit -m "fix(perf): resolve build issues in cache refactor"
```
