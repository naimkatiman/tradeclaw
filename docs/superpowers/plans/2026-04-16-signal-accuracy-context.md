# Signal Accuracy Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show per-signal accuracy metadata (win-rate window, sample size, data freshness timestamp) inline next to every signal card across the dashboard, demo, and alerts pages — so traders always know "accurate over what period?"

**Architecture:** Add a server-side `getAccuracyContext(symbol, timeframe)` function that queries `signal_history` for rolling stats per symbol+timeframe. Expose via a new `/api/signals/accuracy-context` endpoint. Render as a compact metadata badge (`AccuracyMeta`) on every signal card. The data is read-only and never blocks signal generation.

**Tech Stack:** Next.js API route, PostgreSQL (signal_history table), React component, existing `fetchWithLicense` client utility.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/web/lib/accuracy-context.ts` | Server-side query: rolling win-rate, sample size, freshness per symbol+timeframe |
| Create | `apps/web/app/api/signals/accuracy-context/route.ts` | GET endpoint exposing accuracy context |
| Create | `apps/web/app/components/accuracy-meta.tsx` | Client component: compact inline badge showing win-rate/sample/freshness |
| Modify | `apps/web/app/dashboard/DashboardClient.tsx` | Attach `AccuracyMeta` to each signal card |
| Modify | `apps/web/app/demo/DemoClient.tsx` | Attach `AccuracyMeta` to demo signal cards |
| Create | `apps/web/lib/__tests__/accuracy-context.test.ts` | Unit tests for the query logic |

---

### Task 1: Accuracy Context Query

**Files:**
- Create: `apps/web/lib/accuracy-context.ts`
- Test: `apps/web/lib/__tests__/accuracy-context.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/__tests__/accuracy-context.test.ts
import { computeAccuracyContext, type AccuracyContext } from '../accuracy-context';

// Minimal signal_history row shape for testing
function row(pair: string, tf: string, hit: boolean, ts: number) {
  return {
    pair,
    timeframe: tf,
    created_at: new Date(ts).toISOString(),
    outcomes: { '24h': { hit, pnlPct: hit ? 1.2 : -0.8 } },
  };
}

describe('computeAccuracyContext', () => {
  it('returns correct stats for a symbol with history', () => {
    const now = Date.now();
    const rows = [
      row('BTCUSD', 'H1', true, now - 3600_000),
      row('BTCUSD', 'H1', true, now - 7200_000),
      row('BTCUSD', 'H1', false, now - 10800_000),
    ];
    const ctx = computeAccuracyContext(rows, 'BTCUSD', 'H1');
    expect(ctx.winRate).toBeCloseTo(66.67, 0);
    expect(ctx.sampleSize).toBe(3);
    expect(ctx.windowLabel).toBe('24h');
    expect(ctx.oldestSampleTs).toBe(rows[2].created_at);
    expect(ctx.newestSampleTs).toBe(rows[0].created_at);
  });

  it('returns null when no matching rows exist', () => {
    const ctx = computeAccuracyContext([], 'XAUUSD', 'H4');
    expect(ctx).toBeNull();
  });

  it('ignores rows with null 24h outcome', () => {
    const now = Date.now();
    const rows = [
      row('ETHUSD', 'M15', true, now - 1000),
      { pair: 'ETHUSD', timeframe: 'M15', created_at: new Date(now).toISOString(), outcomes: { '24h': null } },
    ];
    const ctx = computeAccuracyContext(rows as any, 'ETHUSD', 'M15');
    expect(ctx!.sampleSize).toBe(1);
    expect(ctx!.winRate).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/accuracy-context.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../accuracy-context'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/lib/accuracy-context.ts
export interface AccuracyContext {
  winRate: number;       // 0-100
  sampleSize: number;    // resolved signal count
  windowLabel: string;   // "24h" — which outcome window we used
  oldestSampleTs: string; // ISO timestamp of oldest sample
  newestSampleTs: string; // ISO timestamp of newest sample
}

interface HistoryRow {
  pair: string;
  timeframe: string;
  created_at: string;
  outcomes: {
    '24h': { hit: boolean; pnlPct: number } | null;
  };
}

/**
 * Pure function: compute accuracy context from pre-fetched rows.
 * Filters to matching symbol+timeframe, uses 24h outcome window.
 */
export function computeAccuracyContext(
  rows: HistoryRow[],
  symbol: string,
  timeframe: string,
): AccuracyContext | null {
  const matched = rows.filter(
    (r) =>
      r.pair.toUpperCase() === symbol.toUpperCase() &&
      r.timeframe === timeframe &&
      r.outcomes['24h'] != null,
  );

  if (matched.length === 0) return null;

  const wins = matched.filter((r) => r.outcomes['24h']!.hit).length;
  const sorted = matched.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return {
    winRate: (wins / matched.length) * 100,
    sampleSize: matched.length,
    windowLabel: '24h',
    oldestSampleTs: sorted[0].created_at,
    newestSampleTs: sorted[sorted.length - 1].created_at,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/accuracy-context.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/accuracy-context.ts apps/web/lib/__tests__/accuracy-context.test.ts
git commit -m "feat(accuracy): add computeAccuracyContext pure function with tests"
```

---

### Task 2: API Endpoint

**Files:**
- Create: `apps/web/app/api/signals/accuracy-context/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// apps/web/app/api/signals/accuracy-context/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { computeAccuracyContext } from '@/lib/accuracy-context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const timeframe = req.nextUrl.searchParams.get('timeframe');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  // Read from signal_history — same source as track-record
  const { readHistoryAsync } = await import('@/lib/signal-history');
  const rows = await readHistoryAsync();
  const ctx = computeAccuracyContext(rows as any, symbol, timeframe ?? 'H1');

  if (!ctx) {
    return NextResponse.json({ accuracy: null });
  }

  return NextResponse.json({ accuracy: ctx });
}
```

- [ ] **Step 2: Smoke test locally**

Run: `curl 'http://localhost:3000/api/signals/accuracy-context?symbol=BTCUSD&timeframe=H1' | jq .`
Expected: JSON with `accuracy` object or `accuracy: null`

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/signals/accuracy-context/route.ts
git commit -m "feat(accuracy): add /api/signals/accuracy-context endpoint"
```

---

### Task 3: AccuracyMeta Component

**Files:**
- Create: `apps/web/app/components/accuracy-meta.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/app/components/accuracy-meta.tsx
'use client';

import { useEffect, useState } from 'react';

interface AccuracyData {
  winRate: number;
  sampleSize: number;
  windowLabel: string;
  oldestSampleTs: string;
  newestSampleTs: string;
}

interface AccuracyMetaProps {
  symbol: string;
  timeframe: string;
}

function formatAge(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return '<1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AccuracyMeta({ symbol, timeframe }: AccuracyMetaProps) {
  const [data, setData] = useState<AccuracyData | null>(null);

  useEffect(() => {
    fetch(`/api/signals/accuracy-context?symbol=${symbol}&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => setData(d.accuracy))
      .catch(() => {});
  }, [symbol, timeframe]);

  if (!data) return null;

  const rateColor =
    data.winRate >= 60
      ? 'text-emerald-400'
      : data.winRate >= 50
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
      <span className={rateColor}>{data.winRate.toFixed(0)}% win</span>
      <span className="text-zinc-700">|</span>
      <span>n={data.sampleSize}</span>
      <span className="text-zinc-700">|</span>
      <span>{data.windowLabel}</span>
      <span className="text-zinc-700">|</span>
      <span>latest {formatAge(data.newestSampleTs)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/components/accuracy-meta.tsx
git commit -m "feat(accuracy): add AccuracyMeta inline component"
```

---

### Task 4: Wire Into Dashboard Signal Cards

**Files:**
- Modify: `apps/web/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Read the dashboard to find the signal card render location**

Look for the signal list/grid section in `DashboardClient.tsx` — find where individual signal items are rendered (likely a `.map()` over signals array).

- [ ] **Step 2: Add AccuracyMeta import and render below each signal card's header**

Add `import { AccuracyMeta } from '../components/accuracy-meta';` at the top.

Inside each signal card (after the symbol/direction/confidence line), add:

```tsx
<AccuracyMeta symbol={signal.symbol} timeframe={signal.timeframe} />
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev -w apps/web`, navigate to `http://localhost:3000/dashboard`
Expected: Each signal card shows a small line like "67% win | n=42 | 24h | latest 2h ago"

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/dashboard/DashboardClient.tsx
git commit -m "feat(accuracy): show AccuracyMeta on dashboard signal cards"
```

---

### Task 5: Wire Into Demo Signal Cards

**Files:**
- Modify: `apps/web/app/demo/DemoClient.tsx`

- [ ] **Step 1: Add AccuracyMeta to demo cards**

Import and render `<AccuracyMeta symbol={signal.symbol} timeframe={signal.timeframe} />` in the demo signal card rendering section. For demo mode, the API will return null if no real history exists — the component gracefully hides itself.

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/demo`
Expected: If signal_history has data, accuracy badges appear. If not, cards render cleanly without them.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/demo/DemoClient.tsx
git commit -m "feat(accuracy): show AccuracyMeta on demo signal cards"
```

---

### Task 6: Build & Verify

- [ ] **Step 1: Run full build**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 2: Final commit if any build fixes were needed**

```bash
git add -A && git commit -m "fix(accuracy): resolve build issues"
```
