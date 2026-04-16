# TradeClaw Pro Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse pricing to Free + Pro ($29/mo), wire tier gating into signal delivery, build automated social media posting pipeline, and prepare for public launch.

**Architecture:** Tier gating infrastructure already exists in `apps/web/lib/tier.ts` (TIER_SYMBOLS, TIER_DELAY_MS, TIER_HISTORY_DAYS, filterSignalByTier) but is NOT wired into any API route — signals currently return everything to everyone. This plan wires the gates, updates pricing, adds OG card generation, builds a social post approval queue, and adds daily/weekly summary crons. Stripe checkout + webhooks + Telegram invite are already fully functional.

**Tech Stack:** Next.js 16, PostgreSQL (raw SQL via `pg`), Stripe, `@vercel/og` (new), Telegram Bot API, Claude Chrome (browser agent for X posting)

**Spec:** `docs/superpowers/specs/2026-04-16-tradeclaw-pro-launch-design.md`

---

## File Map

### Modified files
- `apps/web/lib/stripe.ts` — Remove elite/custom tiers, update Pro price to $29
- `apps/web/lib/tier.ts` — Expand Pro symbols to all, Pro history to unlimited, add premium confidence gate
- `apps/web/app/api/signals/route.ts` — Wire tier filtering + delay into signal responses
- `apps/web/app/pricing/page.tsx` — Collapse to 2-tier layout
- `apps/web/lib/tracked-signals.ts` — Insert pending social posts on signal recording
- `apps/web/app/api/cron/sync/route.ts` — Register daily/weekly social cron slots
- `apps/web/app/track-record/TrackRecordClient.tsx` — Add monthly toggle, per-symbol breakdown
- `apps/web/app/track-record/page.tsx` — Add OG metadata
- `README.md` — Rewrite for OSS positioning

### New files
- `apps/web/migrations/011_social_post_queue.sql` — Queue table for social posts
- `apps/web/lib/social-queue.ts` — CRUD for social_post_queue
- `apps/web/app/api/og/signal/route.tsx` — Signal card OG image
- `apps/web/app/api/og/summary/route.tsx` — Daily/weekly summary card OG image
- `apps/web/app/api/og/track-record/route.tsx` — Track record page OG image
- `apps/web/app/admin/social-queue/page.tsx` — Admin social queue page (server)
- `apps/web/app/admin/social-queue/social-queue-client.tsx` — Admin social queue (client)
- `apps/web/app/api/admin/social-queue/route.ts` — List/approve/reject API
- `apps/web/app/api/social/next/route.ts` — Claude Chrome: fetch next approved post
- `apps/web/app/api/social/posted/route.ts` — Claude Chrome: mark post as posted
- `apps/web/app/api/cron/social/daily/route.ts` — Daily EOD summary cron
- `apps/web/app/api/cron/social/weekly/route.ts` — Weekly summary cron
- `docs/claude-chrome-playbook.md` — Posting instructions for Claude Chrome

---

## Phase 1: Paywall Foundation

### Task 1: Update Stripe tier definitions

**Files:**
- Modify: `apps/web/lib/stripe.ts:20-105`

- [ ] **Step 1: Update TIER_DEFINITIONS to 2 tiers and Pro price to $29**

Replace the `TIER_DEFINITIONS` array in `apps/web/lib/stripe.ts`. Keep the `Tier` type union and `TIER_LEVEL` unchanged (elite/custom stay for DB backward compat — no new users can reach them). Only change the runtime array:

```typescript
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start learning and validating signals at no cost.',
    monthlyPriceLabel: 'Free',
    annualPriceLabel: '',
    kind: 'free',
    features: [
      '3 symbols: XAUUSD, BTCUSD, EURUSD',
      '15-minute delayed signals',
      'TP1 target only',
      'Public Telegram channel',
      'Last 24h signal history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time premium signals with full analytics.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr — save $58',
    kind: 'stripe',
    features: [
      'All traded symbols',
      'Real-time signal delivery',
      'Premium high-confidence signals + MTF confluence',
      'TP1, TP2, TP3 + Stop Loss + Trailing SL',
      'Private Pro Telegram group',
      'Full signal history + CSV export',
      '7-day free trial',
    ],
  },
];
```

- [ ] **Step 2: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web 2>&1 | tail -20`

Expected: Build succeeds. The `Tier` type still includes `'elite' | 'custom'` and `TIER_LEVEL` still maps them — existing DB rows and webhook handlers work. Only the pricing page array changed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/stripe.ts
git commit -m "feat: collapse pricing to Free + Pro ($29/mo)"
```

---

### Task 2: Update tier gating config

**Files:**
- Modify: `apps/web/lib/tier.ts:8-46`

- [ ] **Step 1: Expand Pro symbols and history**

Update `TIER_SYMBOLS` and `TIER_HISTORY_DAYS` in `apps/web/lib/tier.ts`:

```typescript
const ALL_SYMBOLS = [
  'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD',
  'NZDUSD', 'USDCHF',
];

export const TIER_SYMBOLS: Record<Tier, string[]> = {
  free: ['XAUUSD', 'BTCUSD', 'EURUSD'],
  pro: ALL_SYMBOLS,
  elite: ALL_SYMBOLS,
  custom: ALL_SYMBOLS,
};

export const TIER_HISTORY_DAYS: Record<Tier, number | null> = {
  free: 1,
  pro: null,   // unlimited
  elite: null,
  custom: null,
};
```

- [ ] **Step 2: Add premium confidence threshold for Pro**

Add a new export below `TIER_DELAY_MS` in `apps/web/lib/tier.ts`:

```typescript
/**
 * Pro-tier signals include higher-confidence MTF confluence signals
 * that free users don't see. This threshold gates the "premium" band.
 */
export const PRO_PREMIUM_MIN_CONFIDENCE = 85;
```

- [ ] **Step 3: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/tier.ts
git commit -m "feat: expand Pro tier to all symbols + unlimited history"
```

---

### Task 3: Wire tier filtering into /api/signals

**Files:**
- Modify: `apps/web/app/api/signals/route.ts`

This is the critical gap: `filterSignalByTier` exists in `tier.ts` but is never called. `/api/signals` returns all signals to all users.

- [ ] **Step 1: Add tier imports**

At the top of `apps/web/app/api/signals/route.ts`, add:

```typescript
import { readSessionFromRequest } from '../../../lib/user-session';
import { getUserTier, filterSignalByTier, TIER_DELAY_MS } from '../../../lib/tier';
```

- [ ] **Step 2: Resolve user tier at request start**

Inside the `GET` handler, after the filter variables are set (around line 16), add:

```typescript
    // Resolve user tier for gating
    const session = readSessionFromRequest(request);
    const tier = session?.userId
      ? await getUserTier(session.userId)
      : 'free' as const;
    const delayMs = TIER_DELAY_MS[tier];
```

- [ ] **Step 3: Apply tier filtering to the live signals path**

In the live signals path (after `mapped` array is built and regime-filtered, around line 72), add before the response:

```typescript
      // Tier-based gating: symbol filter, TP masking, delay
      mapped = mapped
        .map(s => filterSignalByTier(s, tier))
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (delayMs > 0) {
        const cutoff = Date.now() - delayMs;
        mapped = mapped.filter(s => new Date(s.timestamp).getTime() <= cutoff);
      }
```

- [ ] **Step 4: Apply tier filtering to the fallback TA engine path**

In the fallback path (after `const signals = filterSignalsByRegime(rawSignals, regimeMap)`, around line 102), rename and gate:

```typescript
    let gatedSignals = signals
      .map(s => filterSignalByTier(s, tier))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (delayMs > 0) {
      const cutoff = Date.now() - delayMs;
      gatedSignals = gatedSignals.filter(s => new Date(s.timestamp).getTime() <= cutoff);
    }
```

Update the response below to use `gatedSignals` instead of `signals` (in both `count` and `signals` fields).

- [ ] **Step 5: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 6: Test locally**

Start dev server. Test:
- `curl http://localhost:3000/api/signals` — no session = free tier. Response should only contain XAUUSD, BTCUSD, EURUSD symbols. TP2/TP3 should be 0. Signals older than 15 min only.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/signals/route.ts
git commit -m "feat: wire tier-based signal gating into /api/signals"
```

---

### Task 4: Collapse pricing page to 2 tiers

**Files:**
- Modify: `apps/web/app/pricing/page.tsx`

- [ ] **Step 1: Simplify Feature interface**

Remove `elite` and `custom` from the interface:

```typescript
interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}
```

- [ ] **Step 2: Replace FEATURES array**

```typescript
const FEATURES: Feature[] = [
  { label: 'Signal delivery', free: '15-min delay', pro: 'Real-time' },
  { label: 'Symbols covered', free: '3 symbols', pro: 'All traded symbols' },
  { label: 'Telegram group', free: '@tradeclawwin (public)', pro: 'Private Pro group' },
  { label: 'TP / SL levels', free: 'TP1 only', pro: 'TP1, TP2, TP3 + SL + Trailing' },
  { label: 'Indicators', free: 'RSI, EMA', pro: 'Full suite + MTF confluence' },
  { label: 'Signal quality', free: 'Standard', pro: 'Premium high-confidence' },
  { label: 'Signal history', free: 'Last 24h', pro: 'Full history + CSV export' },
  { label: 'Support', free: 'Community', pro: 'Email (24h)' },
  { label: 'Free trial', free: false, pro: '7 days' },
];
```

- [ ] **Step 3: Update grid layout to 2 columns**

Change `lg:grid-cols-4` to `sm:grid-cols-2` and reduce `max-w-6xl` to `max-w-3xl`:

```tsx
<div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
```

- [ ] **Step 4: Update comparison table headers and rows**

Remove Elite and Custom columns from `<thead>` and `<tbody>`. Only render `feature.free` and `feature.pro`.

- [ ] **Step 5: Remove FREE_SYMBOLS and PRO_SYMBOLS constants**

These are now unused (features array uses plain strings). Delete the constants at lines 6-7.

- [ ] **Step 6: Verify build + visual check**

Run build. Start dev server, visit `http://localhost:3000/pricing` — should show exactly 2 cards.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/pricing/page.tsx
git commit -m "feat: collapse pricing page to Free + Pro ($29/mo)"
```

---

### Task 5: Create Stripe products (manual)

No code changes — manual Stripe dashboard + Railway env.

- [ ] **Step 1: Create Stripe products**

In Stripe dashboard:
1. Create product "TradeClaw Pro Monthly" — $29/mo recurring, 7-day trial
2. Create product "TradeClaw Pro Annual" — $290/yr recurring, 7-day trial
3. Copy the two price IDs

- [ ] **Step 2: Update Railway env vars**

```
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_yyy
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
```

Archive (don't delete) old elite price IDs.

- [ ] **Step 3: Verify checkout flow**

Visit `tradeclaw.win/pricing`, click "Start 7-Day Trial" → should redirect to Stripe Checkout at $29/mo.

---

## Phase 2: Track Record Polish

### Task 6: Add period toggles and per-symbol breakdown

**Files:**
- Modify: `apps/web/app/track-record/TrackRecordClient.tsx`

- [ ] **Step 1: Extend Period type**

```typescript
type Period = '7d' | '30d' | '90d' | 'all';
```

- [ ] **Step 2: Add '90d' button to period selector**

Find the period selector buttons and add `'90d'` between `'30d'` and `'all'`. Label it "90D".

- [ ] **Step 3: Add per-symbol breakdown table**

Below the existing stats/charts section, add:

```tsx
{leaderboard && leaderboard.assets.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Per-Symbol Breakdown</h3>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
            <th className="py-3 pl-4 pr-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Symbol</th>
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Signals</th>
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Hit 4h</th>
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Hit 24h</th>
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Avg P/L</th>
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Total P/L</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.assets.map((a, i) => (
            <tr key={a.pair} className={`border-b border-[var(--border)] ${i % 2 ? 'bg-[var(--glass-bg)]' : ''}`}>
              <td className="py-3 pl-4 pr-2 font-medium text-[var(--foreground)]">{a.pair}</td>
              <td className="px-2 py-3 text-center">{a.totalSignals}</td>
              <td className="px-2 py-3 text-center">{(a.hitRate4h * 100).toFixed(1)}%</td>
              <td className="px-2 py-3 text-center">{(a.hitRate24h * 100).toFixed(1)}%</td>
              <td className={`px-2 py-3 text-center ${a.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {a.avgPnl >= 0 ? '+' : ''}{a.avgPnl.toFixed(2)}%
              </td>
              <td className={`px-2 py-3 text-center font-medium ${a.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {a.totalPnl >= 0 ? '+' : ''}{a.totalPnl.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify build + visual check**

Run build. Visit `/track-record` — 90D toggle appears, per-symbol table renders below charts.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/track-record/TrackRecordClient.tsx
git commit -m "feat: add 90-day toggle and per-symbol breakdown to track record"
```

---

### Task 7: OG images — install dependency + track record card

**Files:**
- Modify: `apps/web/package.json` (via npm install)
- Create: `apps/web/app/api/og/track-record/route.tsx`
- Modify: `apps/web/app/track-record/page.tsx`

- [ ] **Step 1: Install @vercel/og**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm install @vercel/og -w apps/web
```

- [ ] **Step 2: Create track record OG image route**

Create `apps/web/app/api/og/track-record/route.tsx`:

```tsx
import { ImageResponse } from '@vercel/og';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await query<{ total: string; wins: string; win_rate: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric
          / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate
    FROM signal_history
    WHERE is_simulated = false AND created_at >= NOW() - INTERVAL '30 days'
  `);

  const s = rows[0] ?? { total: '0', wins: '0', win_rate: '0' };

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1200px', height: '630px', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 24, color: '#34d399', marginBottom: 16, letterSpacing: '0.1em' }}>TRADECLAW — VERIFIED TRACK RECORD</div>
        <div style={{ display: 'flex', gap: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 'bold' }}>{s.total}</div>
            <div style={{ fontSize: 20, color: '#9ca3af' }}>Signals (30d)</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 'bold', color: '#34d399' }}>{s.win_rate}%</div>
            <div style={{ fontSize: 20, color: '#9ca3af' }}>Win Rate</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 'bold' }}>{s.wins}</div>
            <div style={{ fontSize: 20, color: '#9ca3af' }}>Wins</div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 18, color: '#6b7280' }}>tradeclaw.win/track-record — open-source, transparent, verifiable</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

- [ ] **Step 3: Wire OG image into track record page metadata**

In `apps/web/app/track-record/page.tsx`, update metadata to include openGraph and twitter images:

```typescript
export const metadata: Metadata = {
  title: 'Verified Signal Track Record — TradeClaw',
  description: 'Transparent, verified trading signal performance. Win rates, P&L, and per-symbol breakdown.',
  openGraph: {
    title: 'TradeClaw — Verified Track Record',
    description: 'Transparent, verified trading signal performance.',
    images: [{ url: '/api/og/track-record', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/api/og/track-record'] },
};
```

- [ ] **Step 4: Verify build + test OG**

Run build. Visit `http://localhost:3000/api/og/track-record` — should render a 1200x630 PNG.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/og/track-record/ apps/web/app/track-record/page.tsx apps/web/package.json
git commit -m "feat: track record OG image + metadata"
```

---

## Phase 3: Card Generator + Approval Queue

### Task 8: Signal card OG image

**Files:**
- Create: `apps/web/app/api/og/signal/route.tsx`

- [ ] **Step 1: Create signal card route**

Create `apps/web/app/api/og/signal/route.tsx`:

```tsx
import { ImageResponse } from '@vercel/og';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const signalId = searchParams.get('id');
  if (!signalId) return new Response('Missing id', { status: 400 });

  const rows = await query<{
    pair: string; direction: string; confidence: number;
    entry_price: string; tp1: string | null; sl: string | null;
    created_at: string; timeframe: string;
  }>('SELECT pair, direction, confidence, entry_price, tp1, sl, created_at, timeframe FROM signal_history WHERE id = $1', [signalId]);

  const sig = rows[0];
  if (!sig) return new Response('Not found', { status: 404 });

  const isBuy = sig.direction === 'BUY';
  const dirColor = isBuy ? '#34d399' : '#f87171';
  const dirBg = isBuy ? '#064e3b' : '#7f1d1d';
  const decimals = sig.pair.includes('JPY') ? 3 : 5;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '1200px', height: '630px', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 20, color: '#34d399', letterSpacing: '0.1em' }}>TRADECLAW</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#6b7280' }}>{sig.timeframe} — {new Date(sig.created_at).toUTCString().slice(0, 22)} UTC</div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold' }}>{sig.pair}</div>
            <div style={{ display: 'flex', marginTop: 12, fontSize: 32, fontWeight: 'bold', color: dirColor, backgroundColor: dirBg, padding: '8px 24px', borderRadius: 8 }}>{sig.direction}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 14, color: '#9ca3af' }}>ENTRY</div>
              <div style={{ fontSize: 36, fontWeight: 'bold' }}>{Number(sig.entry_price).toFixed(decimals)}</div>
            </div>
            {sig.tp1 && <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ fontSize: 14, color: '#9ca3af' }}>TP1</div><div style={{ fontSize: 28, color: '#34d399' }}>{Number(sig.tp1).toFixed(decimals)}</div></div>}
            {sig.sl && <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ fontSize: 14, color: '#9ca3af' }}>SL</div><div style={{ fontSize: 28, color: '#f87171' }}>{Number(sig.sl).toFixed(decimals)}</div></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>CONFIDENCE</div>
            <div style={{ fontSize: 56, fontWeight: 'bold', color: sig.confidence >= 80 ? '#34d399' : '#fbbf24' }}>{sig.confidence}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 16, color: '#6b7280' }}>tradeclaw.win/track-record — open-source AI trading signals</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

- [ ] **Step 2: Verify build + test**

Run build. Test with a real signal ID from DB.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/og/signal/
git commit -m "feat: signal card OG image generator"
```

---

### Task 9: Summary card OG image

**Files:**
- Create: `apps/web/app/api/og/summary/route.tsx`

- [ ] **Step 1: Create summary card route**

Create `apps/web/app/api/og/summary/route.tsx`:

```tsx
import { ImageResponse } from '@vercel/og';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') === 'weekly' ? 'weekly' : 'daily';
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const interval = period === 'weekly' ? '7 days' : '1 day';

  const rows = await query<{ total: string; wins: string; losses: string; win_rate: string; total_pnl: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL AND (outcome_24h->>'hit')::boolean = false)::text AS losses,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate,
      COALESCE(ROUND(SUM((outcome_24h->>'pnlPct')::numeric) FILTER (WHERE outcome_24h IS NOT NULL), 2)::text, '0') AS total_pnl
    FROM signal_history
    WHERE is_simulated = false AND created_at >= ($1::date - $2::interval) AND created_at < $1::date + INTERVAL '1 day'
  `, [dateStr, interval]);

  const s = rows[0] ?? { total: '0', wins: '0', losses: '0', win_rate: '0', total_pnl: '0' };
  const pnl = Number(s.total_pnl);
  const pnlColor = pnl >= 0 ? '#34d399' : '#f87171';
  const title = period === 'weekly' ? 'WEEKLY SUMMARY' : 'DAILY P/L';

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '1200px', height: '630px', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 20, color: '#34d399', letterSpacing: '0.1em', marginBottom: 8 }}>TRADECLAW — {title}</div>
        <div style={{ display: 'flex', fontSize: 18, color: '#6b7280', marginBottom: 32 }}>{dateStr}</div>
        <div style={{ display: 'flex', gap: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 'bold', color: pnlColor }}>{pnl >= 0 ? '+' : ''}{s.total_pnl}%</div>
            <div style={{ fontSize: 18, color: '#9ca3af' }}>Total P/L</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 'bold' }}>{s.win_rate}%</div>
            <div style={{ fontSize: 18, color: '#9ca3af' }}>Win Rate</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#34d399' }}>{s.wins}</div>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#6b7280' }}>/</div>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#f87171' }}>{s.losses}</div>
            </div>
            <div style={{ fontSize: 18, color: '#9ca3af' }}>Wins / Losses</div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 16, color: '#6b7280' }}>tradeclaw.win/track-record — open-source, transparent, verifiable</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

- [ ] **Step 2: Verify build + test**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/og/summary/
git commit -m "feat: daily/weekly summary card OG image"
```

---

### Task 10: Social post queue — migration + CRUD

**Files:**
- Create: `apps/web/migrations/011_social_post_queue.sql`
- Create: `apps/web/lib/social-queue.ts`

- [ ] **Step 1: Write migration**

Create `apps/web/migrations/011_social_post_queue.sql`:

```sql
CREATE TABLE social_post_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('signal', 'daily_summary', 'weekly_summary')),
  signal_id     TEXT REFERENCES signal_history(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  image_url     TEXT,
  copy          TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'rejected')),
  post_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  posted_at     TIMESTAMPTZ
);

CREATE INDEX idx_social_queue_status ON social_post_queue (status) WHERE status IN ('pending', 'approved');
CREATE INDEX idx_social_queue_created ON social_post_queue (created_at DESC);
```

- [ ] **Step 2: Run migration**

```bash
psql "$DATABASE_URL" -f apps/web/migrations/011_social_post_queue.sql
```

- [ ] **Step 3: Create CRUD module**

Create `apps/web/lib/social-queue.ts`:

```typescript
import { query, queryOne, execute } from './db-pool';

export interface SocialPost {
  id: string;
  kind: 'signal' | 'daily_summary' | 'weekly_summary';
  signalId: string | null;
  payload: Record<string, unknown>;
  imageUrl: string | null;
  copy: string;
  status: 'pending' | 'approved' | 'posted' | 'rejected';
  postUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
}

interface Row {
  id: string; kind: string; signal_id: string | null;
  payload: Record<string, unknown>; image_url: string | null;
  copy: string; status: string; post_url: string | null;
  created_at: string; approved_at: string | null; posted_at: string | null;
}

function toPost(r: Row): SocialPost {
  return {
    id: r.id, kind: r.kind as SocialPost['kind'], signalId: r.signal_id,
    payload: r.payload, imageUrl: r.image_url, copy: r.copy,
    status: r.status as SocialPost['status'], postUrl: r.post_url,
    createdAt: r.created_at, approvedAt: r.approved_at, postedAt: r.posted_at,
  };
}

export async function enqueueSignalPost(
  signalId: string, copy: string, imageUrl: string, payload: Record<string, unknown> = {},
): Promise<SocialPost> {
  const rows = await query<Row>(
    `INSERT INTO social_post_queue (kind, signal_id, copy, image_url, payload) VALUES ('signal', $1, $2, $3, $4) RETURNING *`,
    [signalId, copy, imageUrl, JSON.stringify(payload)],
  );
  return toPost(rows[0]);
}

export async function enqueueSummaryPost(
  kind: 'daily_summary' | 'weekly_summary', copy: string, imageUrl: string, payload: Record<string, unknown> = {},
): Promise<SocialPost> {
  const rows = await query<Row>(
    `INSERT INTO social_post_queue (kind, copy, image_url, payload, status) VALUES ($1, $2, $3, $4, 'approved') RETURNING *`,
    [kind, copy, imageUrl, JSON.stringify(payload)],
  );
  return toPost(rows[0]);
}

export async function listPending(limit = 50): Promise<SocialPost[]> {
  const rows = await query<Row>(
    `SELECT * FROM social_post_queue WHERE status IN ('pending', 'approved') ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(toPost);
}

export async function approvePost(id: string): Promise<void> {
  await execute(`UPDATE social_post_queue SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'pending'`, [id]);
}

export async function rejectPost(id: string): Promise<void> {
  await execute(`UPDATE social_post_queue SET status = 'rejected' WHERE id = $1 AND status = 'pending'`, [id]);
}

export async function fetchNextApproved(): Promise<SocialPost | null> {
  const row = await queryOne<Row>(`SELECT * FROM social_post_queue WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1`);
  return row ? toPost(row) : null;
}

export async function markPosted(id: string, postUrl: string): Promise<void> {
  await execute(`UPDATE social_post_queue SET status = 'posted', posted_at = NOW(), post_url = $2 WHERE id = $1`, [id, postUrl]);
}

export async function updateCopy(id: string, copy: string): Promise<void> {
  await execute(`UPDATE social_post_queue SET copy = $2 WHERE id = $1 AND status = 'pending'`, [id, copy]);
}
```

- [ ] **Step 4: Verify build**

- [ ] **Step 5: Commit**

```bash
git add apps/web/migrations/011_social_post_queue.sql apps/web/lib/social-queue.ts
git commit -m "feat: social post queue table + CRUD module"
```

---

### Task 11: Auto-enqueue social posts on signal recording

**Files:**
- Modify: `apps/web/lib/tracked-signals.ts`

- [ ] **Step 1: Add enqueue after recording**

Import at top:

```typescript
import { enqueueSignalPost } from './social-queue';
```

After the `recordSignalsAsync(toRecord)` call, add:

```typescript
    // Enqueue social posts for new signals (fire-and-forget)
    for (const sig of toRecord) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
      const imageUrl = `${baseUrl}/api/og/signal?id=${sig.id}`;
      const decimals = sig.symbol.includes('JPY') ? 3 : 5;
      const entry = typeof sig.entry === 'number' ? sig.entry.toFixed(decimals) : sig.entry;
      const copy = [
        sig.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}',
        `${sig.symbol} ${sig.direction} @ ${entry}`,
        sig.takeProfit1 ? `| TP1 ${Number(sig.takeProfit1).toFixed(decimals)}` : '',
        sig.stopLoss ? `| SL ${Number(sig.stopLoss).toFixed(decimals)}` : '',
        `| ${sig.confidence}% confidence`,
        `\n\nTrack live: ${baseUrl}/track-record`,
      ].filter(Boolean).join(' ');

      enqueueSignalPost(sig.id, copy, imageUrl, {
        symbol: sig.symbol, direction: sig.direction,
        confidence: sig.confidence, timeframe: sig.timeframe,
      }).catch(() => {});
    }
```

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/tracked-signals.ts
git commit -m "feat: auto-enqueue social posts on signal recording"
```

---

### Task 12: Admin social queue dashboard

**Files:**
- Create: `apps/web/app/api/admin/social-queue/route.ts`
- Create: `apps/web/app/admin/social-queue/page.tsx`
- Create: `apps/web/app/admin/social-queue/social-queue-client.tsx`

- [ ] **Step 1: Create admin API route**

Create `apps/web/app/api/admin/social-queue/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { listPending, approvePost, rejectPost, updateCopy } from '../../../../lib/social-queue';

function isAdmin(request: NextRequest): boolean {
  return request.cookies.get('tc_admin')?.value === 'true';
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const posts = await listPending(100);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as { action: string; id: string; copy?: string };
  if (!body.id || !body.action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  switch (body.action) {
    case 'approve': await approvePost(body.id); break;
    case 'reject': await rejectPost(body.id); break;
    case 'update_copy':
      if (typeof body.copy !== 'string') return NextResponse.json({ error: 'copy required' }, { status: 400 });
      await updateCopy(body.id, body.copy);
      break;
    default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create server page**

Create `apps/web/app/admin/social-queue/page.tsx`:

```tsx
import { SocialQueueClient } from './social-queue-client';

export const metadata = { title: 'Social Queue — Admin' };
export const dynamic = 'force-dynamic';

export default function SocialQueuePage() {
  return <SocialQueueClient />;
}
```

- [ ] **Step 3: Create client component**

Create `apps/web/app/admin/social-queue/social-queue-client.tsx` with: list of pending/approved posts, card image preview, approve/reject buttons, copy editor. Follow the admin pattern from `apps/web/app/admin/licenses/licenses-client.tsx`. Use existing design tokens (`var(--foreground)`, `var(--border)`, `var(--glass-bg)`, etc.).

Key elements:
- Fetch `GET /api/admin/social-queue` on mount
- Each post card shows: status badge, kind tag, timestamp, copy text, image preview (via imageUrl), approve/reject buttons for pending items
- Approve button: `POST /api/admin/social-queue { action: 'approve', id }`
- Reject button: `POST /api/admin/social-queue { action: 'reject', id }`
- Refresh list after each action

- [ ] **Step 4: Verify build + visual check**

Visit `/admin/social-queue` as admin.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/social-queue/ apps/web/app/api/admin/social-queue/
git commit -m "feat: admin social post queue dashboard"
```

---

### Task 13: Claude Chrome bridge API

**Files:**
- Create: `apps/web/app/api/social/next/route.ts`
- Create: `apps/web/app/api/social/posted/route.ts`

- [ ] **Step 1: Create /api/social/next**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchNextApproved } from '../../../../lib/social-queue';

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.SOCIAL_AGENT_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const post = await fetchNextApproved();
  return NextResponse.json({ post });
}
```

- [ ] **Step 2: Create /api/social/posted**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { markPosted } from '../../../../lib/social-queue';

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.SOCIAL_AGENT_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as { id?: string; postUrl?: string };
  if (!body.id || !body.postUrl) return NextResponse.json({ error: 'id and postUrl required' }, { status: 400 });
  await markPosted(body.id, body.postUrl);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Generate and set SOCIAL_AGENT_TOKEN**

```bash
openssl rand -hex 32
# Set as SOCIAL_AGENT_TOKEN on Railway web service
```

- [ ] **Step 4: Verify build**

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/social/
git commit -m "feat: Claude Chrome bridge API (next + posted)"
```

---

### Task 14: Claude Chrome playbook

**Files:**
- Create: `docs/claude-chrome-playbook.md`

- [ ] **Step 1: Write playbook**

Create `docs/claude-chrome-playbook.md` with: setup (X logged in, bearer token, base URL), polling loop (GET /api/social/next every 60s, post to X, POST /api/social/posted), content type handling (signal vs daily vs weekly), error handling (skip cycle if no post, retry on failure, rate limit wait).

- [ ] **Step 2: Commit**

```bash
git add docs/claude-chrome-playbook.md
git commit -m "docs: Claude Chrome social posting playbook"
```

---

## Phase 4: Automated Summaries

### Task 15: Daily EOD summary cron

**Files:**
- Create: `apps/web/app/api/cron/social/daily/route.ts`

- [ ] **Step 1: Create daily cron route**

Create `apps/web/app/api/cron/social/daily/route.ts`. Pattern: same `isAuthorized` guard as other cron routes (check `CRON_SECRET`). Logic:

1. Query `signal_history` for today's resolved signals (24h outcomes)
2. If 0 resolved signals, return `{ skipped: true }`
3. Compute: total, wins, losses, win rate, total P/L
4. Build copy text: "Today on TradeClaw: {total} signals resolved, {wins}W / {losses}L ({win_rate}%), P/L: {total_pnl}%. Track live: tradeclaw.win/track-record #TradeClaw"
5. Build image URL: `{baseUrl}/api/og/summary?period=daily&date={today}`
6. Call `enqueueSummaryPost('daily_summary', copy, imageUrl, stats)` — inserts as pre-approved
7. Return `{ ok: true, postId }`

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/cron/social/daily/
git commit -m "feat: daily EOD summary cron for social posting"
```

---

### Task 16: Weekly summary cron

**Files:**
- Create: `apps/web/app/api/cron/social/weekly/route.ts`

- [ ] **Step 1: Create weekly cron route**

Same pattern as daily, but:
- Query for past 7 days
- Also query top and worst performing symbol
- Copy includes: weekly recap header, stats, best/worst, link to track record
- Call `enqueueSummaryPost('weekly_summary', ...)`

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/cron/social/weekly/
git commit -m "feat: weekly summary cron for social posting"
```

---

### Task 17: Register social crons in sync route

**Files:**
- Modify: `apps/web/app/api/cron/sync/route.ts`

- [ ] **Step 1: Add social cron time slots**

After the SMS alerts block (around line 77), add:

```typescript
  // 5. Daily social summary — once at 00:00 UTC
  if (hour === 0 && minute < 10) {
    results.socialDaily = await callInternal('/api/cron/social/daily', request);
  }

  // 6. Weekly social summary — Sunday at 18:00 UTC
  const dayOfWeek = new Date().getUTCDay();
  if (dayOfWeek === 0 && hour === 18 && minute < 10) {
    results.socialWeekly = await callInternal('/api/cron/social/weekly', request);
  }
```

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/cron/sync/route.ts
git commit -m "feat: register daily/weekly social crons in sync route"
```

---

## Phase 5: Telegram + OSS Polish

### Task 18: Public Telegram delayed signal push

**Files:**
- Modify: `apps/web/app/api/cron/telegram/route.ts`

- [ ] **Step 1: Read the existing telegram cron**

Read `apps/web/app/api/cron/telegram/route.ts` to understand current broadcast logic.

- [ ] **Step 2: Add delayed public channel push**

After existing subscriber broadcast, add a block that:
1. Queries `signal_history` for signals 15+ min old with `telegram_posted_at IS NULL` and `created_at >= NOW() - INTERVAL '2 hours'`
2. For each, sends formatted message to `TELEGRAM_PUBLIC_CHANNEL_ID` via the Telegram bot
3. Updates `telegram_posted_at = NOW()` on success

- [ ] **Step 3: Set TELEGRAM_PUBLIC_CHANNEL_ID env var on Railway**

- [ ] **Step 4: Verify build**

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/cron/telegram/route.ts
git commit -m "feat: auto-push delayed signals to public Telegram channel"
```

---

### Task 19: README rewrite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README**

Position TradeClaw as open-source AI signal framework with hosted Pro tier. Key sections:
- What it does (TA indicators, MTF confluence, signal recording, outcome tracking)
- Self-host instructions (git clone, .env, docker compose up)
- Architecture overview (apps/web, packages/telegram-bot, packages/strategies)
- TradeClaw Pro features (real-time, all symbols, premium signals, private TG, full history)
- Pricing ($29/mo, 7-day trial)
- License (MIT)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for OSS positioning + Pro launch"
```

---

### Task 20: Landing page copy update

**Files:**
- Modify: `apps/web/app/components/landing/ABHero.tsx` (or equivalent hero component)

- [ ] **Step 1: Read current hero component**

- [ ] **Step 2: Update hero copy**

Lead with transparency and open-source:
- Headline: "Open-source AI trading signals. Every trade verified."
- Subheadline: "TradeClaw generates BUY/SELL signals using multi-timeframe technical analysis. Every signal is recorded, tracked, and published — wins and losses. Start free, upgrade to Pro for real-time delivery."
- Primary CTA: "View Track Record" → /track-record
- Secondary CTA: "Start Free" → /dashboard

- [ ] **Step 3: Verify build + visual check**

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/landing/
git commit -m "feat: update landing page copy for OSS + Pro positioning"
```

---

## Environment Variables Checklist

**New env vars on Railway `web` service:**

| Var | Value | Notes |
|-----|-------|-------|
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_xxx` | New $29/mo Stripe price |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | `price_yyy` | New $290/yr Stripe price |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` | `price_xxx` | Client-side for checkout |
| `SOCIAL_AGENT_TOKEN` | `openssl rand -hex 32` | Bearer token for Claude Chrome |
| `TELEGRAM_PUBLIC_CHANNEL_ID` | `-100xxxxxxxxxx` | Chat ID of @tradeclawwin |

**Archive (don't delete):**
`STRIPE_ELITE_MONTHLY_PRICE_ID`, `STRIPE_ELITE_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID`

---

## Deployment

After each phase, deploy to Railway (GitHub auto-deploy is OFF):

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
npm run build -w apps/web
git push origin main
railway up --detach
```
