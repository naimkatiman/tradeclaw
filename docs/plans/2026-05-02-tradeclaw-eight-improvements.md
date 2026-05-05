# TradeClaw — Eight Improvements Implementation Plan

> **Phase 6 layered with:** [`2026-05-02-countdown-timer.md`](./2026-05-02-countdown-timer.md). This plan ships the global `DelayCountdown` ticker; that plan ships per-card `LockedSignalStub` countdowns. Both are live and complementary.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the eight open improvements from the May 2 + Apr 30 daily-intel briefs without bundling concerns.

**Architecture:** Eight independent phases, one per feature. Each phase ships its own commit, stays under the 15-file commit cap, and is verifiable in isolation. Phases are ordered smallest-blast-radius first so a stop-mid-plan still leaves the repo in a coherent state.

**Tech Stack:** Next.js 16 (App Router) on Railway, Postgres, Resend (email), iron-session-style HMAC cookies (`USER_SESSION_COOKIE`), SSE price stream at `/api/prices/stream`, existing `usePriceStream` hook, browser Web Notifications API via `lib/notifications.ts`.

---

## Phase ordering and rationale

| # | Phase | Why this position |
|---|-------|-------------------|
| 1 | BASE_PRICES → SSE-fed cache (alerts page) | Smallest diff. Fixes silent bug. No new infra. |
| 2 | Live outcome badges on dashboard cards | Pure UI compute over existing SSE stream. |
| 3 | Embed CTA on `/track-record` | Reuses existing `EmbedButton` and `/api/og/track-record`. |
| 4 | Paper-trade close → browser push | Adds notification call to existing close handler. |
| 5 | Share-track-record CTA on win-close | Builds on phase 4's close hook. |
| 6 | Free-tier delay countdown | Pure client widget; reads existing tier. |
| 7 | Win-streak auto-card after 3+ wins | Reads paper-trading stats; new component + share URL. |
| 8 | Magic-link email auth fallback | Largest — new DB table, new routes, email template. Last so its review doesn't block earlier wins. |

Each phase MUST be its own commit. Do NOT bundle phases.

---

## Phase 1 — BASE_PRICES → live cache on alerts page

### Task 1.1: Wire `usePriceStream` into the alert-create modal

**Files:**
- Modify: `apps/web/app/alerts/page.tsx:55-71` (replace `BASE_PRICES` constant with live SSE-fed price)
- Modify: `apps/web/app/alerts/page.tsx` top imports (add `usePriceStream`)

- [ ] **Step 1: Read current state of [alerts/page.tsx](apps/web/app/alerts/page.tsx)**

Confirm `BASE_PRICES` lives at lines 55-59 and is read at line 71 inside `CreateAlertModal`.

- [ ] **Step 2: Replace `BASE_PRICES` with `usePriceStream`**

Replace lines 55-71 (the `BASE_PRICES` const + the `currentPrice` derivation) with a hook that reads live prices for all `SUPPORTED_SYMBOLS`. Add the hook import at the top of the file (next to other lib hook imports). Code:

```tsx
// at top with other imports
import { usePriceStream } from '../../lib/hooks/use-price-stream';

// remove the BASE_PRICES const (lines 55-59) entirely.

// inside CreateAlertModal, replace `const currentPrice = ...` with:
const { prices } = usePriceStream(SUPPORTED_SYMBOLS);
const livePrice = prices.get(symbol)?.price;
const currentPrice = prefillPrice ?? livePrice ?? 0;
```

The render at line ~167 (`{currentPrice > 0 && (...)}` "current: ...") already gates on `> 0`, so the modal cleanly shows nothing when SSE has not yet delivered a tick — better than showing a six-month-stale fake price.

- [ ] **Step 3: Verify the page builds**

Run: `npm --workspace apps/web run build`
Expected: PASS, no TS errors.

- [ ] **Step 4: Manual smoke test in dev**

Run: `npm --workspace apps/web run dev`
Open `/alerts`, click "+ New alert", change the symbol dropdown.
Expected: the "(current: …)" label updates within 2-15 seconds of opening the modal as the SSE stream delivers ticks. Stays empty for the first ~1 second (acceptable; the old behavior showed a stale fake price during that window AND forever after).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/alerts/page.tsx
git commit -m "fix(alerts): replace stale BASE_PRICES fallback with live SSE-fed prices"
```

---

## Phase 2 — Live outcome badges on dashboard cards

### Task 2.1: Add a pure outcome-classifier helper

**Files:**
- Create: `apps/web/lib/signal-outcome.ts`
- Create: `apps/web/lib/__tests__/signal-outcome.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/signal-outcome.test.ts
import { describe, it, expect } from 'vitest';
import { classifySignalOutcome } from '../signal-outcome';

describe('classifySignalOutcome', () => {
  const buy = { direction: 'BUY' as const, entry: 100, stopLoss: 95, takeProfit1: 105, takeProfit2: 110, takeProfit3: 120 };
  const sell = { direction: 'SELL' as const, entry: 100, stopLoss: 105, takeProfit1: 95, takeProfit2: 90, takeProfit3: 80 };

  it('returns active with progress 0 when price equals entry', () => {
    expect(classifySignalOutcome(buy, 100)).toEqual({ status: 'active', progressPct: 0, hitTarget: null });
  });
  it('returns tp1_hit when BUY price is between TP1 and TP2', () => {
    expect(classifySignalOutcome(buy, 106)).toMatchObject({ status: 'tp1_hit', hitTarget: 'TP1' });
  });
  it('returns tp2_hit when BUY price is between TP2 and TP3', () => {
    expect(classifySignalOutcome(buy, 112)).toMatchObject({ status: 'tp2_hit', hitTarget: 'TP2' });
  });
  it('returns tp3_hit when BUY price is at or above TP3', () => {
    expect(classifySignalOutcome(buy, 121)).toMatchObject({ status: 'tp3_hit', hitTarget: 'TP3' });
  });
  it('returns stopped when BUY price is at or below SL', () => {
    expect(classifySignalOutcome(buy, 94)).toMatchObject({ status: 'stopped', hitTarget: 'SL' });
  });
  it('handles SELL direction symmetrically — TP1 hit when price drops to TP1', () => {
    expect(classifySignalOutcome(sell, 94)).toMatchObject({ status: 'tp1_hit', hitTarget: 'TP1' });
  });
  it('handles SELL stop — price moves up past SL', () => {
    expect(classifySignalOutcome(sell, 106)).toMatchObject({ status: 'stopped', hitTarget: 'SL' });
  });
  it('returns null for status when livePrice is missing', () => {
    expect(classifySignalOutcome(buy, null)).toEqual({ status: 'unknown', progressPct: 0, hitTarget: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web exec vitest run lib/__tests__/signal-outcome.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement [apps/web/lib/signal-outcome.ts](apps/web/lib/signal-outcome.ts)**

```ts
// apps/web/lib/signal-outcome.ts
export interface SignalLevels {
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
}

export type OutcomeStatus =
  | 'active'
  | 'tp1_hit'
  | 'tp2_hit'
  | 'tp3_hit'
  | 'stopped'
  | 'unknown';

export interface SignalOutcome {
  status: OutcomeStatus;
  /** 0-100, signed for SL distance (negative = drawdown). Capped at ±100. */
  progressPct: number;
  hitTarget: 'TP1' | 'TP2' | 'TP3' | 'SL' | null;
}

export function classifySignalOutcome(
  s: SignalLevels,
  livePrice: number | null | undefined,
): SignalOutcome {
  if (livePrice == null || !Number.isFinite(livePrice)) {
    return { status: 'unknown', progressPct: 0, hitTarget: null };
  }

  const isBuy = s.direction === 'BUY';
  const reached = (target: number) =>
    isBuy ? livePrice >= target : livePrice <= target;
  const stopHit =
    isBuy ? livePrice <= s.stopLoss : livePrice >= s.stopLoss;

  if (stopHit) return { status: 'stopped', progressPct: -100, hitTarget: 'SL' };
  if (reached(s.takeProfit3)) return { status: 'tp3_hit', progressPct: 100, hitTarget: 'TP3' };
  if (reached(s.takeProfit2)) return { status: 'tp2_hit', progressPct: 75, hitTarget: 'TP2' };
  if (reached(s.takeProfit1)) return { status: 'tp1_hit', progressPct: 50, hitTarget: 'TP1' };

  // Active — compute % of distance to TP1 (positive) or to SL (negative)
  const target = isBuy ? s.takeProfit1 : s.takeProfit1;
  const stop = s.stopLoss;
  const distToTp1 = Math.abs(target - s.entry);
  const distToSl = Math.abs(s.entry - stop);
  const moved = livePrice - s.entry;
  const movedSigned = isBuy ? moved : -moved; // positive = in our favor

  let progressPct: number;
  if (movedSigned >= 0) {
    progressPct = distToTp1 > 0 ? Math.min(50, (movedSigned / distToTp1) * 50) : 0;
  } else {
    progressPct = distToSl > 0 ? Math.max(-99, (movedSigned / distToSl) * 100) : 0;
  }

  return { status: 'active', progressPct: Number(progressPct.toFixed(1)), hitTarget: null };
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm --workspace apps/web exec vitest run lib/__tests__/signal-outcome.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit (intermediate — helper only)**

```bash
git add apps/web/lib/signal-outcome.ts apps/web/lib/__tests__/signal-outcome.test.ts
git commit -m "feat(signals): add classifySignalOutcome helper for live TP/SL state"
```

### Task 2.2: Render the badge on each dashboard signal card

**Files:**
- Modify: `apps/web/app/dashboard/DashboardClient.tsx` (around line 437-440, where TP/SL pills are rendered, add an outcome badge above the entry block)

- [ ] **Step 1: Read [DashboardClient.tsx:425-460](apps/web/app/dashboard/DashboardClient.tsx#L425-L460)** to confirm the card-render block surrounding the TP1/TP2/TP3/SL pills.

- [ ] **Step 2: Add a small `OutcomeBadge` inline component near the top of `DashboardClient.tsx`** (just below the `OnboardingBanner` component definition, around line 70):

```tsx
import { classifySignalOutcome, type OutcomeStatus } from '@/lib/signal-outcome';

const OUTCOME_STYLE: Record<OutcomeStatus, { label: string; cls: string; icon: string }> = {
  tp3_hit:  { label: 'TP3 hit',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: '✅' },
  tp2_hit:  { label: 'TP2 hit',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: '✅' },
  tp1_hit:  { label: 'TP1 hit',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: '✅' },
  stopped:  { label: 'Stopped',  cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40',          icon: '🛑' },
  active:   { label: 'Active',   cls: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',          icon: '⏳' },
  unknown:  { label: '—',         cls: 'bg-transparent text-zinc-500 border-transparent',          icon: '·' },
};

function OutcomeBadge({ status, progressPct }: { status: OutcomeStatus; progressPct: number }) {
  const s = OUTCOME_STYLE[status];
  if (status === 'unknown') return null;
  const showPct = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${s.cls}`}
      title={status === 'active' ? `Progress to TP1: ${progressPct}%` : s.label}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}{showPct && progressPct !== 0 ? ` ${progressPct > 0 ? '+' : ''}${progressPct}%` : ''}
    </span>
  );
}
```

- [ ] **Step 3: Mount the badge on the live signal card.** Find the JSX block in `DashboardClient.tsx` that renders the four pills (TP1/TP2/TP3/SL — around line 437-440). Just above that block, insert:

```tsx
{(() => {
  const live = prices.get(signal.symbol)?.price ?? null;
  const outcome = classifySignalOutcome(signal, live);
  return <OutcomeBadge status={outcome.status} progressPct={outcome.progressPct} />;
})()}
```

`prices` is already destructured from `usePriceStream` higher up the component (the dashboard already calls it — confirm with a grep before inserting).

- [ ] **Step 4: Verify build + types**

Run: `npm --workspace apps/web run build`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: `npm --workspace apps/web run dev`
Open `/dashboard`. For at least one signal whose entry < live price for BUY (or > live for SELL), the badge should read `✅ TP1 hit`, etc. Most live signals should show `⏳ Active <signed pct>%`. Wait 30 seconds; the badge should re-render as prices tick.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): live TP/SL outcome badge on each signal card"
```

---

## Phase 3 — Embed CTA on `/track-record`

### Task 3.1: Generalize `EmbedButton` to accept any embed URL

**Files:**
- Modify: `apps/web/app/components/embed-button.tsx` (make `pair` optional; add `embedPath` + `label` props)

- [ ] **Step 1: Read current [embed-button.tsx](apps/web/app/components/embed-button.tsx)** — already viewed above; just generalize the props.

- [ ] **Step 2: Update the props interface and the iframe URL builder**

Replace the existing component with this version (preserves the per-pair call site):

```tsx
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface Props {
  /** Per-pair signal embed (legacy use). Mutually exclusive with embedPath. */
  pair?: string;
  /** Explicit embed path (e.g. '/embed/track-record'). Mutually exclusive with pair. */
  embedPath?: string;
  /** Button label override. Default: "Embed". */
  label?: string;
  /** iframe dimensions. Defaults: 320 x 420 for pair, 600 x 360 for track-record. */
  width?: number;
  height?: number;
}

function CodeSnippet({ code }: { code: string }) { /* unchanged */ }

export function EmbedButton({ pair, embedPath, label = 'Embed', width, height }: Props) {
  const [open, setOpen] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.com';

  const path = embedPath ?? (pair ? `/embed/${pair}` : '/embed');
  const w = width ?? (pair ? 320 : 600);
  const h = height ?? (pair ? 420 : 360);

  const iframeCode = `<iframe src="${origin}${path}?theme=dark" width="${w}" height="${h}" frameborder="0" scrolling="no" style="border-radius:12px;overflow:hidden;"></iframe>`;
  const scriptCode = pair
    ? `<script src="${origin}/api/embed?pair=${pair}" data-pair="${pair}" data-theme="dark" data-width="${w}" data-height="${h}"></script>`
    : null;

  return (
    /* keep existing JSX, but use the `label` prop in the trigger button.
       In the popover body, only render the script-tag snippet when scriptCode !== null. */
    /* … existing JSX, with these two changes:
         <button … >{label}</button>
         {scriptCode && <CodeSnippet code={scriptCode} />}
    */
  );
}
```

(Keep the existing JSX structure intact — only the label and the conditional script-snippet block change.)

- [ ] **Step 3: Verify the legacy call site at [signal/[id]/page.tsx:351](apps/web/app/signal/[id]/page.tsx#L351) still type-checks** — `<EmbedButton pair={signal.symbol} />` is still valid with the new optional props.

- [ ] **Step 4: Build**

Run: `npm --workspace apps/web run build`
Expected: PASS.

- [ ] **Step 5: Commit (intermediate)**

```bash
git add apps/web/app/components/embed-button.tsx
git commit -m "refactor(embed): generalize EmbedButton to accept any embed path"
```

### Task 3.2: Create the `/embed/track-record` route

**Files:**
- Create: `apps/web/app/embed/track-record/page.tsx`

- [ ] **Step 1: Implement the embed page**

Reuse the existing OG/track-record query shape (see [/api/og/track-record/route.tsx](apps/web/app/api/og/track-record/route.tsx) for the exact SQL — copy it; do NOT import that file because it returns an `ImageResponse`).

```tsx
// apps/web/app/embed/track-record/page.tsx
import { query } from '../../../lib/db-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface Stats { total: number; wins: number; winRate: number; totalPnl: number }

async function loadStats(): Promise<Stats> {
  const rows = await query<{ total: string; wins: string; win_rate: string; total_pnl: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric
          / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate,
      COALESCE(ROUND(SUM((outcome_24h->>'pnlPct')::numeric) FILTER (WHERE outcome_24h IS NOT NULL), 2)::text, '0') AS total_pnl
    FROM signal_history
    WHERE is_simulated = false AND created_at >= NOW() - INTERVAL '30 days'
  `);
  const r = rows[0] ?? { total: '0', wins: '0', win_rate: '0', total_pnl: '0' };
  return { total: +r.total, wins: +r.wins, winRate: +r.win_rate, totalPnl: +r.total_pnl };
}

export default async function TrackRecordEmbedPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const { theme } = await searchParams;
  const dark = theme !== 'light';
  const s = await loadStats();
  const pnlColor = s.totalPnl >= 0 ? '#10b981' : '#f43f5e';

  return (
    <main
      style={{
        background: dark ? '#0b0b0b' : '#fafafa',
        color: dark ? '#e5e5e5' : '#0a0a0a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
          TradeClaw — verified track record (30d)
        </div>
        <a href="https://tradeclaw.win/track-record" target="_blank" rel="noopener" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none' }}>
          tradeclaw.win →
        </a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flex: 1 }}>
        <Stat label="Signals resolved" value={s.total.toString()} />
        <Stat label="Wins" value={s.wins.toString()} />
        <Stat label="Win rate" value={`${s.winRate}%`} />
        <Stat label="Σ PnL" value={`${s.totalPnl >= 0 ? '+' : ''}${s.totalPnl}%`} valueColor={pnlColor} />
      </div>
    </main>
  );
}

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valueColor ?? 'inherit', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the route renders**

Run: `npm --workspace apps/web run dev`
Open `http://localhost:3000/embed/track-record?theme=dark`
Expected: 4-stat embed renders with live numbers.

- [ ] **Step 3: Commit (intermediate)**

```bash
git add apps/web/app/embed/track-record/page.tsx
git commit -m "feat(embed): public /embed/track-record page for iframe distribution"
```

### Task 3.3: Mount `EmbedButton` on the Track Record page

**Files:**
- Modify: `apps/web/app/track-record/TrackRecordClient.tsx` (add the button to the page header)

- [ ] **Step 1: Read [TrackRecordClient.tsx](apps/web/app/track-record/TrackRecordClient.tsx)** to find the header/title section.

- [ ] **Step 2: Import and place the button** in the header row (next to the page title or in the top-right action area):

```tsx
import { EmbedButton } from '../components/embed-button';

// in the header JSX, near the title:
<EmbedButton embedPath="/embed/track-record" label="Embed this" width={600} height={360} />
```

- [ ] **Step 3: Build + smoke**

Run: `npm --workspace apps/web run build`
Open `/track-record` in dev. Click "Embed this", confirm the iframe snippet copies to clipboard and the URL is `/embed/track-record`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/track-record/TrackRecordClient.tsx
git commit -m "feat(track-record): add Embed CTA so traders can paste live proof anywhere"
```

---

## Phase 4 — Paper-trade close → browser push notification

### Task 4.1: Detect paper-position close on the client and fire push

**Files:**
- Modify: `apps/web/app/paper-trading/page.tsx` (add a close-detection effect)

**Approach:** Server cron (`/api/cron/manage-positions` / `position-monitor`) auto-closes positions when TP/SL hit. The client already polls portfolio state. We diff the polled response: any position present in the previous snapshot but absent (or moved to `closedTrades`) in the current snapshot fires `sendAlertTriggeredNotification` with the close reason and PnL.

- [ ] **Step 1: Read [paper-trading/page.tsx](apps/web/app/paper-trading/page.tsx)** to find the existing portfolio polling effect — typically `useEffect` that calls `fetch('/api/paper-trading')` or `/api/paper-trading/stats`. Note the state variable name (likely `portfolio` or `positions`).

- [ ] **Step 2: Add a ref-tracked diff effect**

Just below the existing portfolio-fetch effect, add:

```tsx
import { sendAlertTriggeredNotification } from '../../lib/notifications';

// inside the component:
const lastPositionsRef = useRef<Map<string, { symbol: string; direction: 'BUY' | 'SELL'; entryPrice: number }>>(new Map());

useEffect(() => {
  if (!portfolio) return;
  const current = new Map(portfolio.positions.map(p => [p.id, { symbol: p.symbol, direction: p.direction, entryPrice: p.entryPrice }]));
  const prev = lastPositionsRef.current;

  // Find positions that were in prev but are gone now → likely closed
  for (const [id, info] of prev) {
    if (current.has(id)) continue;
    // Look up the corresponding closed trade for the close reason and PnL
    const closedTrade = portfolio.closedTrades.find(t => t.positionId === id);
    if (!closedTrade) continue;
    sendAlertTriggeredNotification({
      title: `Paper trade closed: ${info.symbol} ${info.direction}`,
      body: `${closedTrade.exitReason ?? 'closed'} — PnL ${closedTrade.pnlPct >= 0 ? '+' : ''}${closedTrade.pnlPct.toFixed(2)}%`,
      tag: `paper-close-${id}`,
      url: '/paper-trading',
    });
  }

  lastPositionsRef.current = current;
}, [portfolio]);
```

- [ ] **Step 3: Confirm the [`Trade` interface](apps/web/lib/paper-trading.ts)** has `positionId`, `exitReason`, and `pnlPct` fields. If `positionId` doesn't exist on the trade row, fall back to matching on `(symbol, openedAt)` — but check the schema before assuming.

- [ ] **Step 4: Confirm `sendAlertTriggeredNotification` signature** in [lib/notifications.ts:43](apps/web/lib/notifications.ts#L43). Adjust the param shape to match (the snippet above assumes `{ title, body, tag, url }` — verify and rename fields if the actual signature uses `message` or `pair`).

- [ ] **Step 5: Build + smoke**

Run: `npm --workspace apps/web run build`
In dev, open `/paper-trading`, open a small position with a tight TP, wait for the cron close (or trigger via `/api/cron/position-monitor`), confirm a browser push fires.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/paper-trading/page.tsx
git commit -m "feat(paper-trading): browser push notification when a paper position closes"
```

---

## Phase 5 — Share-track-record CTA on win-close

### Task 5.1: Show a one-time toast when a paper close was a winner

**Files:**
- Create: `apps/web/app/components/win-share-toast.tsx`
- Modify: `apps/web/app/paper-trading/page.tsx` (extend the close-detection effect from phase 4)

- [ ] **Step 1: Create the toast component**

```tsx
// apps/web/app/components/win-share-toast.tsx
'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export interface WinShareToastProps {
  symbol: string;
  pnlPct: number;
  onDismiss: () => void;
}

export function WinShareToast({ symbol, pnlPct, onDismiss }: WinShareToastProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const t = setTimeout(onDismiss, 12_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/track-record?utm_source=win-share`
    : 'https://tradeclaw.win/track-record';
  const tweet = `Just closed ${symbol} for +${pnlPct.toFixed(2)}% on TradeClaw 📈\n\n${url}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 shadow-2xl backdrop-blur">
      <div className="text-sm font-semibold text-emerald-300 mb-1">Win — {symbol} +{pnlPct.toFixed(2)}%</div>
      <div className="text-xs text-zinc-300 mb-3">Brag about it. Free distribution.</div>
      <div className="flex gap-2">
        <a
          href={xHref}
          target="_blank"
          rel="noopener"
          className="flex-1 text-center text-xs font-mono py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25"
        >
          Share on X
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex-1 text-xs font-mono py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10"
        >
          {copied ? <><Check className="inline h-3 w-3" /> Copied</> : 'Copy link'}
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" className="px-2 text-zinc-500 hover:text-zinc-200">×</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the toast into the paper-trading page**

In `paper-trading/page.tsx`, add state for the latest win and surface the toast:

```tsx
import { WinShareToast } from '../components/win-share-toast';

const [winToast, setWinToast] = useState<{ symbol: string; pnlPct: number } | null>(null);

// inside the existing close-detection effect from Phase 4, when a closedTrade has pnlPct > 0:
if (closedTrade.pnlPct > 0) {
  setWinToast({ symbol: info.symbol, pnlPct: closedTrade.pnlPct });
}

// at the end of the JSX:
{winToast && (
  <WinShareToast
    symbol={winToast.symbol}
    pnlPct={winToast.pnlPct}
    onDismiss={() => setWinToast(null)}
  />
)}
```

- [ ] **Step 3: Build + smoke**

Open a position, simulate a win-close, confirm the toast appears with X share link.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/win-share-toast.tsx apps/web/app/paper-trading/page.tsx
git commit -m "feat(paper-trading): post-win share toast surfacing /track-record link"
```

---

## Phase 6 — Free-tier delay countdown ticker

### Task 6.1: Tick component that displays "next update in M:SS"

**Files:**
- Create: `apps/web/app/components/delay-countdown.tsx`
- Modify: `apps/web/app/dashboard/DashboardClient.tsx` (mount the ticker behind a tier check)

- [ ] **Step 1: Implement the ticker**

```tsx
// apps/web/app/components/delay-countdown.tsx
'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  /** Cycle length in ms. Free tier = 15 * 60 * 1000. */
  cycleMs: number;
  /** Anchor the cycle to a fixed wall-clock so all free users tick in sync. */
  anchorMs?: number;
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DelayCountdown({ cycleMs, anchorMs = 0 }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const elapsed = (now - anchorMs) % cycleMs;
  const remaining = cycleMs - elapsed;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400" title="Free tier — signals refresh on a 15-minute cycle. Upgrade to Pro for real-time.">
      <Clock className="h-3 w-3" />
      Next update in <span className="text-emerald-300 tabular-nums">{format(remaining)}</span>
    </span>
  );
}
```

- [ ] **Step 2: Mount on dashboard for free tier only**

In `DashboardClient.tsx`, locate where the user's tier is read (likely from a `/api/auth/session` fetch or a context). The page already reads tier — search the file for `tier === 'free'` or `userTier`. Mount the ticker in the hero/stats row:

```tsx
import { DelayCountdown } from '../components/delay-countdown';
import { TIER_DELAY_MS } from '@/lib/tier';

// inside the JSX, gated on free tier:
{tier === 'free' && <DelayCountdown cycleMs={TIER_DELAY_MS.free} />}
```

If the dashboard doesn't already track tier client-side, fetch it once via `/api/auth/session` on mount and store in local state. Do NOT add a new dependency.

- [ ] **Step 3: Build + smoke**

Run dev, sign in as a free user (or with no `PRO_EMAILS` match), confirm the ticker appears and counts down. Sign in as a Pro user, confirm it does not appear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/delay-countdown.tsx apps/web/app/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): free-tier countdown ticker showing time to next signal refresh"
```

---

## Phase 7 — Win-streak shareable card

### Task 7.1: Add a streak detector reading paper-trading stats

**Files:**
- Create: `apps/web/lib/streak.ts`
- Create: `apps/web/lib/__tests__/streak.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/streak.test.ts
import { describe, it, expect } from 'vitest';
import { currentWinStreak } from '../streak';

const t = (pnlPct: number, closedAt = Date.now()) => ({ pnlPct, closedAt });

describe('currentWinStreak', () => {
  it('returns 0 when there are no closed trades', () => {
    expect(currentWinStreak([])).toBe(0);
  });
  it('returns 0 when most recent trade was a loss', () => {
    expect(currentWinStreak([t(-1), t(2), t(3)].sort((a, b) => b.closedAt - a.closedAt))).toBe(0);
  });
  it('returns the count of consecutive wins from the most recent trade', () => {
    const trades = [
      t(2, 5), t(3, 4), t(1, 3), t(-0.5, 2), t(4, 1),
    ];
    // most recent (closedAt=5) backwards: +2, +3, +1, -0.5 → streak of 3
    expect(currentWinStreak(trades)).toBe(3);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm --workspace apps/web exec vitest run lib/__tests__/streak.test.ts`

- [ ] **Step 3: Implement [streak.ts](apps/web/lib/streak.ts)**

```ts
// apps/web/lib/streak.ts
export interface ClosedTradeLike { pnlPct: number; closedAt: number }

export function currentWinStreak(trades: ClosedTradeLike[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].sort((a, b) => b.closedAt - a.closedAt);
  let streak = 0;
  for (const t of sorted) {
    if (t.pnlPct > 0) streak++;
    else break;
  }
  return streak;
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit (intermediate)**

```bash
git add apps/web/lib/streak.ts apps/web/lib/__tests__/streak.test.ts
git commit -m "feat(stats): currentWinStreak helper for paper-trading consecutive wins"
```

### Task 7.2: Card component + auto-trigger after 3+ wins

**Files:**
- Create: `apps/web/app/components/win-streak-card.tsx`
- Modify: `apps/web/app/paper-trading/page.tsx` (mount the card when streak ≥ 3 — gated by localStorage so it shows once per streak peak)

- [ ] **Step 1: Implement the card**

```tsx
// apps/web/app/components/win-streak-card.tsx
'use client';

import { useState } from 'react';
import { Check, Flame } from 'lucide-react';

export interface WinStreakCardProps {
  streak: number;
  totalPnlPct: number;
  onDismiss: () => void;
}

export function WinStreakCard({ streak, totalPnlPct, onDismiss }: WinStreakCardProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/track-record?utm_source=win-streak-${streak}`
    : 'https://tradeclaw.win/track-record';
  const tweet = `🔥 ${streak} paper trades in a row, +${totalPnlPct.toFixed(2)}% combined.\n\nReceipts: ${url}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onDismiss}>
      <div className="max-w-md w-full bg-[#0d0d0d] border border-emerald-500/30 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-emerald-300 mb-3">
          <Flame className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{streak}-trade win streak</h2>
        </div>
        <div className="text-sm text-zinc-300 mb-4">+{totalPnlPct.toFixed(2)}% combined PnL. Share the receipt before the next trade.</div>
        <div className="flex gap-2">
          <a href={xHref} target="_blank" rel="noopener" className="flex-1 text-center py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/25">
            Share on X
          </a>
          <button onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-200 text-sm font-semibold hover:bg-white/10">
            {copied ? <><Check className="inline h-3.5 w-3.5" /> Copied</> : 'Copy link'}
          </button>
        </div>
        <button onClick={onDismiss} className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300">Dismiss</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `/paper-trading` page**

```tsx
import { currentWinStreak } from '@/lib/streak';
import { WinStreakCard } from '../components/win-streak-card';

const [streakCard, setStreakCard] = useState<{ streak: number; pnl: number } | null>(null);

useEffect(() => {
  if (!portfolio) return;
  const streak = currentWinStreak(portfolio.closedTrades.map(t => ({ pnlPct: t.pnlPct, closedAt: new Date(t.closedAt).getTime() })));
  if (streak < 3) return;
  // Show once per streak peak — key by streak length so a 4th win re-triggers
  const seenKey = `tc_streak_${streak}_seen`;
  if (typeof window !== 'undefined' && localStorage.getItem(seenKey)) return;

  const lastN = portfolio.closedTrades
    .slice(0, streak)
    .reduce((acc, t) => acc + t.pnlPct, 0);
  setStreakCard({ streak, pnl: lastN });
  if (typeof window !== 'undefined') localStorage.setItem(seenKey, '1');
}, [portfolio]);

// in JSX:
{streakCard && (
  <WinStreakCard
    streak={streakCard.streak}
    totalPnlPct={streakCard.pnl}
    onDismiss={() => setStreakCard(null)}
  />
)}
```

- [ ] **Step 3: Build + smoke**

Manually backfill 3+ winning paper trades (or call `/api/paper-trading/follow-signal` with cooperative prices) and confirm the card appears once.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/win-streak-card.tsx apps/web/app/paper-trading/page.tsx
git commit -m "feat(paper-trading): auto-surface shareable win-streak card after 3+ consecutive wins"
```

---

## Phase 8 — Magic-link email auth fallback

### Task 8.1: DB migration for one-time tokens

**Files:**
- Create: `apps/web/migrations/020_magic_link_tokens.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 020_magic_link_tokens.sql
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token_hash    TEXT PRIMARY KEY,           -- sha256(token), hex
  email         TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_email ON magic_link_tokens(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);

-- Hard rate limit: most recent 5 unconsumed tokens per email
COMMENT ON TABLE magic_link_tokens IS 'One-time signin tokens. token_hash is sha256 hex; raw token is emailed but never stored.';
```

- [ ] **Step 2: Apply locally**

Run: `psql $DATABASE_URL -f apps/web/migrations/020_magic_link_tokens.sql`
Expected: `CREATE TABLE` + `CREATE INDEX`.

- [ ] **Step 3: Commit (intermediate)**

```bash
git add apps/web/migrations/020_magic_link_tokens.sql
git commit -m "feat(auth): magic-link tokens schema"
```

### Task 8.2: Token issue / verify library

**Files:**
- Create: `apps/web/lib/magic-link.ts`
- Create: `apps/web/lib/__tests__/magic-link.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/magic-link.test.ts
import { describe, it, expect } from 'vitest';
import { hashToken, generateRawToken, isExpired, MAGIC_LINK_TTL_MS } from '../magic-link';

describe('magic-link primitives', () => {
  it('generateRawToken produces 32-byte url-safe strings', () => {
    const t = generateRawToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(t.length).toBeGreaterThanOrEqual(40);
  });
  it('hashToken is deterministic and 64 hex chars', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
  it('isExpired flips past TTL', () => {
    const past = new Date(Date.now() - MAGIC_LINK_TTL_MS - 1000);
    const now = new Date();
    expect(isExpired(past)).toBe(true);
    expect(isExpired(now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm --workspace apps/web exec vitest run lib/__tests__/magic-link.test.ts`

- [ ] **Step 3: Implement [magic-link.ts](apps/web/lib/magic-link.ts)**

```ts
// apps/web/lib/magic-link.ts
import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { query } from './db-pool';

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 min

export function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export async function issueMagicLink(email: string): Promise<{ raw: string }> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
  await query(
    `INSERT INTO magic_link_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)`,
    [tokenHash, email.toLowerCase().trim(), expiresAt],
  );
  return { raw };
}

export interface ConsumeResult {
  ok: boolean;
  email?: string;
  reason?: 'not_found' | 'expired' | 'consumed';
}

export async function consumeMagicLink(raw: string): Promise<ConsumeResult> {
  const tokenHash = hashToken(raw);
  const rows = await query<{ email: string; expires_at: string; consumed_at: string | null }>(
    `SELECT email, expires_at, consumed_at FROM magic_link_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  if (rows.length === 0) return { ok: false, reason: 'not_found' };
  const row = rows[0];
  if (row.consumed_at) return { ok: false, reason: 'consumed' };
  if (isExpired(new Date(row.expires_at))) return { ok: false, reason: 'expired' };
  await query(
    `UPDATE magic_link_tokens SET consumed_at = NOW() WHERE token_hash = $1 AND consumed_at IS NULL`,
    [tokenHash],
  );
  return { ok: true, email: row.email };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit (intermediate)**

```bash
git add apps/web/lib/magic-link.ts apps/web/lib/__tests__/magic-link.test.ts
git commit -m "feat(auth): magic-link token issue/consume library"
```

### Task 8.3: API routes — start + verify

**Files:**
- Create: `apps/web/app/api/auth/magic-link/start/route.ts`
- Create: `apps/web/app/api/auth/magic-link/verify/route.ts`

- [ ] **Step 1: Implement the start route**

```ts
// apps/web/app/api/auth/magic-link/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { issueMagicLink } from '../../../../../lib/magic-link';
import { sendEmail as sendResendEmail } from '../../../../../lib/email-sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const recentByEmail = new Map<string, number>();

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalized = (email ?? '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const last = recentByEmail.get(normalized) ?? 0;
  if (Date.now() - last < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ ok: true }, { status: 200 }); // do not reveal rate-limit
  }
  recentByEmail.set(normalized, Date.now());

  const { raw } = await issueMagicLink(normalized);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const link = `${base}/api/auth/magic-link/verify?token=${encodeURIComponent(raw)}`;

  await sendResendEmail({
    to: normalized,
    subject: 'Your TradeClaw sign-in link',
    html: `
      <p>Click to sign in to TradeClaw. This link expires in 15 minutes and works once.</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
```

> **Important:** confirm the exact signature of `sendEmail` in [`apps/web/lib/email-sender.ts`](apps/web/lib/email-sender.ts) — the function may take a different param shape (e.g. `{ to, subject, body }` or positional). Adapt the call site to whatever it actually exports. Do NOT introduce a new email path; reuse the existing Resend integration.

- [ ] **Step 2: Implement the verify route**

```ts
// apps/web/app/api/auth/magic-link/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink } from '../../../../../lib/magic-link';
import { getUserByEmail } from '../../../../../lib/db';
import { createSessionToken, sessionCookieOptions, USER_SESSION_COOKIE } from '../../../../../lib/user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.redirect(new URL('/signin?error=missing_token', req.url));

  const result = await consumeMagicLink(token);
  if (!result.ok || !result.email) {
    return NextResponse.redirect(new URL(`/signin?error=${result.reason ?? 'invalid'}`, req.url));
  }

  // Find or create the user. Reuse existing helpers — do not duplicate user creation logic.
  let user = await getUserByEmail(result.email);
  if (!user) {
    const { createUser } = await import('../../../../../lib/db');
    user = await createUser({ email: result.email });
  }

  const sessionToken = createSessionToken(user.id);
  const res = NextResponse.redirect(new URL('/dashboard', req.url));
  res.cookies.set(USER_SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
```

> **Important:** verify that [`apps/web/lib/db.ts`](apps/web/lib/db.ts) exports both `getUserByEmail` and `createUser` (or equivalent). The recon found `getUserByEmail` at line 110. If `createUser` is named differently (e.g. `insertUser`, `upsertUser`), use that name and pass whatever fields it requires. Do NOT add columns to the users table — reuse the schema from [001_monetization.sql](apps/web/migrations/001_monetization.sql).

- [ ] **Step 3: Build**

Run: `npm --workspace apps/web run build`
Expected: PASS. If TS errors arise from the user/email helpers, that's the signal to read `db.ts` and use the actual exports.

- [ ] **Step 4: Commit (intermediate)**

```bash
git add apps/web/app/api/auth/magic-link/
git commit -m "feat(auth): magic-link start + verify API routes"
```

### Task 8.4: Signin form + email input

**Files:**
- Modify: `apps/web/app/signin/page.tsx` (add an email form below the Google button)

- [ ] **Step 1: Add the email form to the signin page**

Just below the existing Google sign-in button block, add:

```tsx
const [emailInput, setEmailInput] = useState('');
const [magicSent, setMagicSent] = useState(false);
const [magicErr, setMagicErr] = useState<string | null>(null);
const [magicBusy, setMagicBusy] = useState(false);

async function sendMagicLink(e: React.FormEvent) {
  e.preventDefault();
  setMagicBusy(true);
  setMagicErr(null);
  try {
    const res = await fetch('/api/auth/magic-link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to send link');
    }
    setMagicSent(true);
  } catch (err) {
    setMagicErr(err instanceof Error ? err.message : 'Failed');
  } finally {
    setMagicBusy(false);
  }
}

// in JSX, below the Google sign-in button, separated by a divider:
<div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
  <span className="flex-1 h-px bg-white/10" /> or <span className="flex-1 h-px bg-white/10" />
</div>
{magicSent ? (
  <div className="text-sm text-emerald-300 text-center">Check your inbox — link sent.</div>
) : (
  <form onSubmit={sendMagicLink} className="space-y-2">
    <input
      type="email"
      required
      value={emailInput}
      onChange={(e) => setEmailInput(e.target.value)}
      placeholder="you@example.com"
      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
    />
    <button
      type="submit"
      disabled={magicBusy}
      className="w-full py-2.5 rounded-lg bg-white/8 border border-white/15 text-sm font-semibold text-zinc-100 hover:bg-white/12 disabled:opacity-50"
    >
      {magicBusy ? 'Sending…' : 'Email me a sign-in link'}
    </button>
    {magicErr && <div className="text-xs text-rose-400">{magicErr}</div>}
  </form>
)}
```

- [ ] **Step 2: Build + smoke**

Open `/signin`. Submit a valid email. Inbox should receive the link (set `RESEND_API_KEY` in `.env.local` first). Click the link — confirm it lands on `/dashboard` with a session cookie set.

Verify the error path: visit `/api/auth/magic-link/verify?token=garbage` → redirects to `/signin?error=not_found`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/signin/page.tsx
git commit -m "feat(auth): magic-link email form on /signin as Google OAuth fallback"
```

---

## Verification across the whole plan

After each phase, run **at minimum**:

- `npm --workspace apps/web run build` — must be green
- `npm --workspace apps/web exec vitest run` — for phases 2, 7, 8

After all 8 phases:

- Visit each touched page in dev (`/alerts`, `/dashboard`, `/track-record`, `/embed/track-record`, `/paper-trading`, `/signin`) and exercise the new behavior.
- Confirm 8 commits land in `git log` with no bundled concerns.
- Push to remote and run `railway up --detach` from `tradeclaw/` per the workspace deploy convention.

---

## Out of scope (deferred — log in project CLAUDE.md if encountered)

- Removing `BASE_PRICES` from `lib/price-alerts.ts` (server) and `lib/paper-trading.ts` (server). Both already prefer live `getLivePrices()` and only fall back to the constant. Touching them risks server-side regressions and is not part of the user-visible bug.
- Wiring magic-link into the existing `/welcome` and `/start` onboarding flows.
- Adding rate limiting persistence for magic-link issue (current is in-memory; sufficient for single-Railway-replica deploys, document if/when you scale out).
- A signed/cached OG image for win-streak shares (current uses query-string only; adequate for v1).
