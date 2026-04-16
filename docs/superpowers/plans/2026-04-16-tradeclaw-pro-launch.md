# TradeClaw Pro Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse monetization to Free + Pro ($29/mo), build automated social GTM pipeline, and ship TradeClaw Pro on tradeclaw.win.

**Architecture:** Raw SQL on PostgreSQL (Railway). No ORM — `pg` pool via `apps/web/lib/db-pool.ts`. Migrations are numbered SQL files in `apps/web/migrations/`. Auth is HMAC session cookie; tier stored in `users.tier`. Stripe handles checkout + webhooks. Signal generation via `signal-generator.ts` + `ta-engine.ts`, recorded to `signal_history` as side-effect of API hits.

**Tech Stack:** Next.js (App Router), PostgreSQL, Stripe, `@vercel/og` (satori), Telegram Bot API, Claude Chrome (browser agent for X posting).

**Design spec:** `docs/superpowers/specs/2026-04-16-tradeclaw-pro-launch-design.md`

---

## File Map

### Modified files
| File | Responsibility change |
|------|----------------------|
| `apps/web/lib/stripe.ts` | Remove elite/custom tiers, update Pro price to $29 |
| `apps/web/app/pricing/page.tsx` | 2 cards, 2-column comparison table |
| `apps/web/lib/tracked-signals.ts` | Add tier-aware signal shaping + queue writer |
| `apps/web/app/api/signals/route.ts` | Pass tier context through to signal pipeline |
| `apps/web/app/lib/signal-generator.ts` | Add Pro-only MTF confluence + scalp mode flag |
| `apps/web/instrumentation.ts` | Register daily/weekly social crons |
| `apps/web/app/track-record/page.tsx` | Polish with toggles, per-symbol breakdown |

### New files
| File | Responsibility |
|------|---------------|
| `apps/web/lib/tier-gate.ts` | Tier gating utility — shapes signal payloads per tier |
| `apps/web/lib/social-queue.ts` | DAL for `social_post_queue` table |
| `apps/web/migrations/011_social_post_queue.sql` | New table migration |
| `apps/web/app/api/og/signal/route.ts` | Signal card PNG generator |
| `apps/web/app/api/og/summary/route.ts` | Daily/weekly summary card PNG |
| `apps/web/app/api/og/brand.ts` | Shared brand constants (colors, fonts) |
| `apps/web/app/admin/social-queue/page.tsx` | Admin approval queue SSR page |
| `apps/web/app/admin/social-queue/social-queue-client.tsx` | Client-side queue UI |
| `apps/web/app/api/social/next/route.ts` | Claude Chrome bridge — GET next approved post |
| `apps/web/app/api/social/posted/route.ts` | Claude Chrome bridge — POST mark as posted |
| `apps/web/app/api/cron/social/daily/route.ts` | Daily EOD summary cron |
| `apps/web/app/api/cron/social/weekly/route.ts` | Weekly summary cron |
| `docs/claude-chrome-playbook.md` | Posting instructions for Claude Chrome agent |

---

## Phase 1: Paywall Foundation

### Task 1: Update TIER_DEFINITIONS and Stripe config

**Files:**
- Modify: `apps/web/lib/stripe.ts`

- [ ] **Step 1: Read current stripe.ts**

Verify current `TIER_DEFINITIONS` array has 4 entries (free, pro, elite, custom) and Pro is $19/mo.

- [ ] **Step 2: Update TIER_DEFINITIONS — keep only free + pro, change Pro to $29**

In `apps/web/lib/stripe.ts`, replace the entire `TIER_DEFINITIONS` array:

```typescript
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try TradeClaw with delayed signals on 3 symbols.',
    monthlyPriceLabel: 'Free',
    annualPriceLabel: '',
    features: [
      '3 symbols (XAU, BTC, EUR)',
      '15-minute delayed signals',
      'TP1 level only',
      '24-hour signal history',
      'Public Telegram @tradeclawwin',
      'Self-host from GitHub (MIT)',
    ],
    kind: 'free',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time signals, all symbols, private Telegram group.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr (save 17%)',
    features: [
      'Real-time signal delivery',
      'All traded symbols',
      'TP1, TP2, TP3 + SL + trailing',
      'Premium MTF confluence signals',
      'Full signal history + CSV export',
      'Private Pro Telegram group',
      '7-day free trial',
    ],
    kind: 'stripe',
  },
];
```

Keep the `Tier` type as-is (`'free' | 'pro' | 'elite' | 'custom'`) — the DB CHECK constraint still allows all four. We just hide elite/custom from the UI.

- [ ] **Step 3: Clean up resolveTierFromPriceId — remove elite env vars**

In `resolveTierFromPriceId()`, remove the elite price ID mappings. Keep only:

```typescript
export function resolveTierFromPriceId(priceId: string): Tier | null {
  const map: Record<string, Tier> = {};
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (proMonthly) map[proMonthly] = 'pro';
  if (proAnnual) map[proAnnual] = 'pro';
  return map[priceId] ?? null;
}
```

- [ ] **Step 4: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web`
Expected: Build succeeds. Any references to elite/custom tier definitions will still type-check because `Tier` type is unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/stripe.ts
git commit -m "feat: collapse tiers to Free + Pro \$29/mo, remove elite/custom from UI"
```

---

### Task 2: Update pricing page to 2 tiers

**Files:**
- Modify: `apps/web/app/pricing/page.tsx`

- [ ] **Step 1: Replace FEATURES array with Free vs Pro only**

Remove the `elite` and `custom` fields from the `Feature` interface and array:

```typescript
interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: Feature[] = [
  { label: 'Signal delivery', free: '15-min delay', pro: 'Real-time' },
  { label: 'Symbols covered', free: '3 (XAU, BTC, EUR)', pro: 'All traded symbols' },
  { label: 'TP / SL levels', free: 'TP1 only', pro: 'TP1, TP2, TP3 + SL + trailing' },
  { label: 'Signal quality', free: 'Standard', pro: 'Premium MTF confluence' },
  { label: 'Signal history', free: 'Last 24h', pro: 'Full history + CSV export' },
  { label: 'Telegram group', free: '@tradeclawwin (public)', pro: 'Private Pro group' },
  { label: 'Support', free: 'Community', pro: 'Email (24h)' },
  { label: 'Free trial', free: false, pro: '7 days' },
  { label: 'Open-source self-host', free: true, pro: true },
];
```

- [ ] **Step 2: Remove PRO_SYMBOLS and FREE_SYMBOLS constants**

Delete both — these are now inline in the FEATURES table.

- [ ] **Step 3: Update tierToCard — remove elite env var lookup**

```typescript
function tierToCard(def: TierDefinition): PlanCardProps {
  const priceId = def.id === 'pro'
    ? (process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '')
    : '';

  let ctaLabel = 'Start Free';
  let ctaHref = '/dashboard';

  if (def.kind === 'stripe') {
    ctaLabel = 'Start 7-Day Trial';
    ctaHref = priceId ? `/signin?priceId=${priceId}` : '/signin';
  }

  return {
    name: def.name,
    price: def.monthlyPriceLabel,
    annual: def.annualPriceLabel,
    description: def.tagline,
    highlights: def.features,
    ctaLabel,
    ctaHref,
    priceId,
    badge: def.id === 'pro' ? 'Most Popular' : undefined,
    accent: def.id === 'pro',
  };
}
```

- [ ] **Step 4: Update grid layout — 2 columns instead of 4**

Change the plan cards container:

```tsx
<div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
```

- [ ] **Step 5: Update comparison table — 2 data columns**

Replace `<thead>`:
```tsx
<tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
  <th className="py-3 pl-6 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
    Feature
  </th>
  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
    Free
  </th>
  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-emerald-400">
    Pro
  </th>
</tr>
```

Replace `<tbody>` row cells — remove `feature.elite` and `feature.custom` cells.

- [ ] **Step 6: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web`

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/pricing/page.tsx
git commit -m "feat: pricing page — 2 tiers (Free + Pro), remove elite/custom cards and columns"
```

---

### Task 3: Create tier gating utility

**Files:**
- Create: `apps/web/lib/tier-gate.ts`

- [ ] **Step 1: Create the tier gate module**

```typescript
import type { Tier } from './stripe';

/** Symbols available to free-tier users */
export const FREE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD'];

/** Signal delay in milliseconds for free-tier users (15 minutes) */
export const FREE_DELAY_MS = 15 * 60 * 1000;

/** Signal history window for free-tier users (24 hours) */
export const FREE_HISTORY_HOURS = 24;

export interface RawSignal {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry_price: number;
  tp1: number | null;
  tp2?: number | null;
  tp3?: number | null;
  sl: number | null;
  trailing_sl?: number | null;
  mode?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ShapedSignal extends RawSignal {
  /** Whether this signal was delayed for the caller */
  delayed: boolean;
}

/** Returns true if the tier has Pro-level access */
export function isPro(tier: Tier): boolean {
  return tier === 'pro' || tier === 'elite' || tier === 'custom';
}

/**
 * Shape a list of raw signals based on the caller's subscription tier.
 *
 * Free tier:
 * - Only FREE_SYMBOLS
 * - Signals younger than 15 min are dropped (delay gate)
 * - TP2, TP3, trailing_sl are nulled out
 * - Only swing mode (scalp signals dropped)
 *
 * Pro tier:
 * - All symbols, all modes, all TP/SL levels, no delay
 */
export function shapeSignalsForTier(
  signals: RawSignal[],
  tier: Tier,
): ShapedSignal[] {
  const now = Date.now();

  return signals
    .filter((s) => {
      // Symbol gate (free = 3 symbols only)
      if (!isPro(tier) && !FREE_SYMBOLS.includes(s.pair)) return false;

      // Mode gate (free = swing only, no scalp)
      if (!isPro(tier) && s.mode === 'scalp') return false;

      // Delay gate (free = drop signals < 15 min old)
      if (!isPro(tier)) {
        const age = now - new Date(s.created_at).getTime();
        if (age < FREE_DELAY_MS) return false;
      }

      return true;
    })
    .map((s) => {
      if (isPro(tier)) {
        return { ...s, delayed: false };
      }
      // Free tier: mask premium TP/SL levels
      return {
        ...s,
        tp2: null,
        tp3: null,
        trailing_sl: null,
        delayed: true,
      };
    });
}

/**
 * Returns the signal history cutoff timestamp for the given tier.
 * Free: 24h ago. Pro: null (no cutoff).
 */
export function historyWindowCutoff(tier: Tier): Date | null {
  if (isPro(tier)) return null;
  return new Date(Date.now() - FREE_HISTORY_HOURS * 60 * 60 * 1000);
}
```

- [ ] **Step 2: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web`

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/tier-gate.ts
git commit -m "feat: add tier-gate utility for Free/Pro signal shaping"
```

---

### Task 4: Wire tier gating into signal API

**Files:**
- Modify: `apps/web/app/api/signals/route.ts`
- Modify: `apps/web/lib/db.ts` (add `getUserTierBySession` if not present)

- [ ] **Step 1: Add tier lookup helper to db.ts**

Add at the bottom of `apps/web/lib/db.ts`:

```typescript
/** Get user tier from session token. Returns 'free' if no valid session. */
export async function getUserTierFromSession(
  sessionToken: string | null,
): Promise<Tier> {
  if (!sessionToken) return 'free';
  const session = verifySessionToken(sessionToken);
  if (!session) return 'free';
  const user = await getUserById(session.userId);
  return (user?.tier as Tier) ?? 'free';
}
```

Import `verifySessionToken` from `./user-session` and `Tier` from `./stripe` at the top of `db.ts`.

- [ ] **Step 2: Apply tier shaping in the signals route**

In `apps/web/app/api/signals/route.ts`, after the signals are fetched (both PRIMARY and FALLBACK paths), apply the tier gate before returning:

```typescript
import { shapeSignalsForTier } from '../../../lib/tier-gate';
import { getUserTierFromSession } from '../../../lib/db';
import { cookies } from 'next/headers';

// At the top of the GET handler, resolve tier:
const cookieStore = await cookies();
const sessionToken = cookieStore.get('tc_user_session')?.value ?? null;
const tier = await getUserTierFromSession(sessionToken);

// Before the final return, shape signals:
const shaped = shapeSignalsForTier(signals, tier);
return NextResponse.json({ signals: shaped, tier }, {
  headers: { 'Cache-Control': 'public, s-maxage=30' },
});
```

Note: The `Cache-Control: public` header means the CDN will serve the same response regardless of tier. This is a known trade-off for pre-launch — the CDN cache is only 30s and at near-zero traffic this is fine. Once traffic grows, switch to `private, s-maxage=30` or Vary on the session cookie.

- [ ] **Step 3: Verify build**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npm run build -w apps/web`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/signals/route.ts apps/web/lib/db.ts
git commit -m "feat: wire tier gating into /api/signals — Free gets delayed/filtered, Pro gets real-time"
```

---

### Task 5: Gate signal history by tier

**Files:**
- Modify: `apps/web/app/api/signals/history/route.ts` (or wherever signal history is served — check for `/api/track-record` or `/api/strategy-breakdown`)

- [ ] **Step 1: Find the history endpoint**

Search for the route that serves signal history:
```bash
grep -r "signal_history" apps/web/app/api/ --include="*.ts" -l
```

- [ ] **Step 2: Apply history window cutoff**

In the history query endpoint, import and use `historyWindowCutoff`:

```typescript
import { historyWindowCutoff } from '../../../../lib/tier-gate';
import { getUserTierFromSession } from '../../../../lib/db';

// Resolve tier from session
const cookieStore = await cookies();
const sessionToken = cookieStore.get('tc_user_session')?.value ?? null;
const tier = await getUserTierFromSession(sessionToken);

// Apply cutoff to query
const cutoff = historyWindowCutoff(tier);
const whereClause = cutoff
  ? `WHERE created_at >= $1`
  : '';
const params = cutoff ? [cutoff.toISOString()] : [];
```

Adjust the existing SQL query to include the `WHERE` clause.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build -w apps/web
git add -A && git commit -m "feat: gate signal history — Free sees 24h, Pro sees full history"
```

---

### Task 6: Premium signal tier — Pro gets MTF + scalp signals

**Files:**
- Modify: `apps/web/app/lib/signal-generator.ts`
- Modify: `apps/web/lib/tracked-signals.ts`

- [ ] **Step 1: Add `proOnly` flag to generated signals**

In `apps/web/app/lib/signal-generator.ts`, in `generateSignalsFromTA()`, after the signal object is constructed (around line 654-690), add a `proOnly` field:

```typescript
// After the signal is built, tag it:
const signal = {
  ...baseSignal,
  proOnly: mode === 'scalp' || (mtfConfirmed && confidence >= 80),
};
```

Logic: scalp-mode signals (M5/M15) are Pro-only. Swing signals with MTF confirmation AND confidence ≥80 are also tagged Pro-only (premium quality).

- [ ] **Step 2: In tracked-signals.ts, filter proOnly signals for free callers**

In `getTrackedSignals()`, after the existing filters, add:

```typescript
// After line ~127 (existing confidence floor logic):
// Pro-only signal gate
const callerTier = params.ctx?.tier ?? 'free';
const tierFiltered = filtered.filter((s) => {
  if (s.proOnly && callerTier !== 'pro' && callerTier !== 'elite' && callerTier !== 'custom') {
    return false;
  }
  return true;
});
```

- [ ] **Step 3: Update LicenseContext type to include tier**

In the `LicenseContext` type (or `GetTrackedSignalsParams`), add `tier?: Tier`:

```typescript
export interface GetTrackedSignalsParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
  ctx?: LicenseContext & { tier?: Tier };
}
```

- [ ] **Step 4: Pass tier through from API callers**

In `getTrackedSignalsForRequest()`, resolve tier from the request and include it in ctx:

```typescript
export async function getTrackedSignalsForRequest(
  request: Request,
  ...args
) {
  const ctx = resolveLicenseContext(request);
  // Add tier from session
  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionMatch = cookieHeader.match(/tc_user_session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;
  const { getUserTierFromSession } = await import('./db');
  const tier = await getUserTierFromSession(sessionToken);

  return getTrackedSignals({
    ...params,
    ctx: { ...ctx, tier },
  });
}
```

- [ ] **Step 5: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/lib/signal-generator.ts apps/web/lib/tracked-signals.ts
git commit -m "feat: Pro-only premium signals — MTF confluence + scalp mode gated by tier"
```

---

## Phase 2: Track Record Page

### Task 7: Track record API with time toggles and per-symbol breakdown

**Files:**
- Create or modify: `apps/web/app/api/track-record/route.ts`

- [ ] **Step 1: Find existing track record data source**

```bash
grep -r "track-record\|trackRecord\|TrackRecord" apps/web/app/ --include="*.ts" --include="*.tsx" -l
```

Read the client component to understand what data it currently fetches.

- [ ] **Step 2: Create/update the API route to support period + symbol params**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db-pool';
import { getUserTierFromSession } from '../../../lib/db';
import { historyWindowCutoff } from '../../../lib/tier-gate';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const period = searchParams.get('period') ?? 'all'; // daily | weekly | monthly | all
  const symbol = searchParams.get('symbol'); // optional filter

  // Tier-based history window
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('tc_user_session')?.value ?? null;
  const tier = await getUserTierFromSession(sessionToken);
  const tierCutoff = historyWindowCutoff(tier);

  // Period cutoff
  const periodMs: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const periodCutoff = period !== 'all' && periodMs[period]
    ? new Date(Date.now() - periodMs[period])
    : null;

  // Use the more restrictive cutoff
  const cutoff = tierCutoff && periodCutoff
    ? (tierCutoff > periodCutoff ? tierCutoff : periodCutoff)
    : tierCutoff ?? periodCutoff;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (cutoff) {
    conditions.push(`created_at >= $${paramIdx++}`);
    params.push(cutoff.toISOString());
  }
  if (symbol) {
    conditions.push(`pair = $${paramIdx++}`);
    params.push(symbol);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const rows = await query<{
    pair: string;
    direction: string;
    confidence: number;
    entry_price: number;
    tp1: number;
    sl: number;
    outcome_4h: unknown;
    outcome_24h: unknown;
    created_at: string;
  }>(
    `SELECT pair, direction, confidence, entry_price, tp1, sl,
            outcome_4h, outcome_24h, created_at
     FROM signal_history
     ${where}
     ORDER BY created_at DESC`,
    params,
  );

  // Compute stats
  const total = rows.length;
  const wins = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === true;
  }).length;
  const losses = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === false;
  }).length;
  const pending = total - wins - losses;
  const winRate = total > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(1) : '0.0';

  // Per-symbol breakdown
  const symbolMap = new Map<string, { wins: number; losses: number; total: number }>();
  for (const r of rows) {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    const entry = symbolMap.get(r.pair) ?? { wins: 0, losses: 0, total: 0 };
    entry.total++;
    if (o?.hit === true) entry.wins++;
    if (o?.hit === false) entry.losses++;
    symbolMap.set(r.pair, entry);
  }
  const bySymbol = Object.fromEntries(symbolMap);

  return NextResponse.json({
    period,
    tier,
    total,
    wins,
    losses,
    pending,
    winRate,
    bySymbol,
    signals: rows,
  });
}
```

- [ ] **Step 3: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/track-record/route.ts
git commit -m "feat: track-record API with period toggles + per-symbol breakdown + tier gating"
```

---

### Task 8: Track record UI polish

**Files:**
- Modify: `apps/web/app/track-record/` (the client component)

- [ ] **Step 1: Read the existing TrackRecordClient component**

```bash
find apps/web/app/track-record -name "*.tsx" -o -name "*.ts" | head -20
```

Read all files to understand current UI.

- [ ] **Step 2: Add period toggle tabs**

Add a tab bar at the top of the client component:

```tsx
const periods = ['daily', 'weekly', 'monthly', 'all'] as const;
const [period, setPeriod] = useState<typeof periods[number]>('weekly');

// In the fetch URL:
const res = await fetch(`/api/track-record?period=${period}${symbol ? `&symbol=${symbol}` : ''}`);
```

```tsx
<div className="flex gap-2 mb-6">
  {periods.map((p) => (
    <button
      key={p}
      onClick={() => setPeriod(p)}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
        period === p
          ? 'bg-emerald-500 text-black'
          : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500/40'
      }`}
    >
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Add per-symbol breakdown table**

```tsx
{data.bySymbol && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
      Per-Symbol Breakdown
    </h3>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
            <th className="py-2 px-4 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">Symbol</th>
            <th className="py-2 px-4 text-center text-xs font-medium uppercase text-[var(--text-secondary)]">Total</th>
            <th className="py-2 px-4 text-center text-xs font-medium uppercase text-emerald-400">Wins</th>
            <th className="py-2 px-4 text-center text-xs font-medium uppercase text-red-400">Losses</th>
            <th className="py-2 px-4 text-center text-xs font-medium uppercase text-[var(--text-secondary)]">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.bySymbol).map(([sym, stats]) => (
            <tr key={sym} className="border-b border-[var(--border)]">
              <td className="py-2 px-4 font-medium text-[var(--foreground)]">{sym}</td>
              <td className="py-2 px-4 text-center">{stats.total}</td>
              <td className="py-2 px-4 text-center text-emerald-400">{stats.wins}</td>
              <td className="py-2 px-4 text-center text-red-400">{stats.losses}</td>
              <td className="py-2 px-4 text-center">
                {((stats.wins / (stats.wins + stats.losses || 1)) * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 4: Ensure losses are shown as prominently as wins**

Verify the equity curve and stat cards show losses in red with the same visual weight as wins in green. No hiding, no downplaying.

- [ ] **Step 5: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/track-record/
git commit -m "feat: track-record page — period toggles, per-symbol breakdown, honest W/L display"
```

---

### Task 9: OG image for track-record social shares

**Files:**
- Create: `apps/web/app/api/og/brand.ts`
- Create: `apps/web/app/api/og/track-record/route.tsx`

- [ ] **Step 1: Install @vercel/og if not present**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw/apps/web && npm ls @vercel/og 2>/dev/null || npm install @vercel/og
```

- [ ] **Step 2: Create brand constants**

```typescript
// apps/web/app/api/og/brand.ts
export const OG_BRAND = {
  bg: '#0a0f0d',
  fg: '#e8e8e8',
  accent: '#10b981', // emerald-500
  muted: '#6b7280',
  cardBg: '#111916',
  border: '#1e2d26',
  logo: 'TradeClaw',
  tagline: 'Open-Source AI Signal Platform',
  width: 1200,
  height: 630,
} as const;
```

- [ ] **Step 3: Create track-record OG image route**

```tsx
// apps/web/app/api/og/track-record/route.tsx
import { ImageResponse } from '@vercel/og';
import { OG_BRAND } from '../brand';
import { query } from '../../../../lib/db-pool';

export const runtime = 'edge';

export async function GET() {
  // Fetch last 7 days of stats
  const rows = await query<{ outcome_4h: unknown; outcome_24h: unknown }>(
    `SELECT outcome_4h, outcome_24h FROM signal_history
     WHERE created_at >= NOW() - INTERVAL '7 days'`,
  );

  const total = rows.length;
  const wins = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === true;
  }).length;
  const losses = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === false;
  }).length;
  const winRate = wins + losses > 0
    ? ((wins / (wins + losses)) * 100).toFixed(1)
    : '—';

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_BRAND.width,
          height: OG_BRAND.height,
          background: OG_BRAND.bg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 24, color: OG_BRAND.accent, letterSpacing: '0.1em' }}>
          {OG_BRAND.logo}
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: OG_BRAND.fg, marginTop: 16 }}>
          Track Record — Last 7 Days
        </div>
        <div style={{ display: 'flex', gap: 60, marginTop: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: OG_BRAND.fg }}>{total}</div>
            <div style={{ fontSize: 20, color: OG_BRAND.muted }}>Signals</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: OG_BRAND.accent }}>{wins}</div>
            <div style={{ fontSize: 20, color: OG_BRAND.muted }}>Wins</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: '#ef4444' }}>{losses}</div>
            <div style={{ fontSize: 20, color: OG_BRAND.muted }}>Losses</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: OG_BRAND.fg }}>{winRate}%</div>
            <div style={{ fontSize: 20, color: OG_BRAND.muted }}>Win Rate</div>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 18, color: OG_BRAND.muted }}>
          tradeclaw.win/track-record — Fully open-source, every trade published live
        </div>
      </div>
    ),
    { width: OG_BRAND.width, height: OG_BRAND.height },
  );
}
```

- [ ] **Step 4: Add OG meta tags to track-record page**

In `apps/web/app/track-record/page.tsx`, add metadata export:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Record | TradeClaw',
  description: 'Live, verifiable trading signal performance. Every trade published — wins and losses.',
  openGraph: {
    title: 'TradeClaw Track Record',
    description: 'Live signal performance — fully open-source, every trade published.',
    images: [{ url: '/api/og/track-record', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClaw Track Record',
    images: ['/api/og/track-record'],
  },
};
```

- [ ] **Step 5: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/og/
git commit -m "feat: OG image for track-record social shares"
```

---

## Phase 3: Card Generator + Approval Queue

### Task 10: Create social_post_queue migration

**Files:**
- Create: `apps/web/migrations/011_social_post_queue.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 011_social_post_queue.sql
-- Social post queue for automated signal + summary posting via Claude Chrome

CREATE TABLE IF NOT EXISTS social_post_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            TEXT NOT NULL CHECK (kind IN ('signal', 'daily', 'weekly')),
  payload         JSONB NOT NULL,
  image_url       TEXT,
  copy            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'posted', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  posted_at       TIMESTAMPTZ,
  post_url        TEXT,
  channel         TEXT NOT NULL DEFAULT 'x'
                    CHECK (channel IN ('x', 'telegram'))
);

CREATE INDEX idx_social_queue_status ON social_post_queue (status, created_at);
CREATE INDEX idx_social_queue_kind ON social_post_queue (kind);
```

- [ ] **Step 2: Run migration against Railway Postgres**

```bash
psql "$DATABASE_URL" -f apps/web/migrations/011_social_post_queue.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX` x2.

- [ ] **Step 3: Commit**

```bash
git add apps/web/migrations/011_social_post_queue.sql
git commit -m "feat: add social_post_queue table for automated social posting"
```

---

### Task 11: Social queue DAL

**Files:**
- Create: `apps/web/lib/social-queue.ts`

- [ ] **Step 1: Create the data access layer**

```typescript
import { query, queryOne, execute } from './db-pool';

export interface SocialPost {
  id: string;
  kind: 'signal' | 'daily' | 'weekly';
  payload: Record<string, unknown>;
  image_url: string | null;
  copy: string;
  status: 'pending' | 'approved' | 'posted' | 'rejected';
  created_at: string;
  approved_at: string | null;
  posted_at: string | null;
  post_url: string | null;
  channel: 'x' | 'telegram';
}

/** Insert a new post into the queue */
export async function enqueuePost(params: {
  kind: SocialPost['kind'];
  payload: Record<string, unknown>;
  imageUrl?: string;
  copy: string;
  status?: SocialPost['status'];
  channel?: SocialPost['channel'];
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO social_post_queue (kind, payload, image_url, copy, status, channel)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      params.kind,
      JSON.stringify(params.payload),
      params.imageUrl ?? null,
      params.copy,
      params.status ?? 'pending',
      params.channel ?? 'x',
    ],
  );
  return rows[0].id;
}

/** Get pending posts for admin queue */
export async function getPendingPosts(): Promise<SocialPost[]> {
  return query<SocialPost>(
    `SELECT * FROM social_post_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC`,
  );
}

/** Get all posts (for admin view) */
export async function getAllPosts(limit = 50): Promise<SocialPost[]> {
  return query<SocialPost>(
    `SELECT * FROM social_post_queue
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
}

/** Approve a pending post */
export async function approvePost(id: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue
     SET status = 'approved', approved_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [id],
  );
}

/** Reject a pending post */
export async function rejectPost(id: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue SET status = 'rejected' WHERE id = $1`,
    [id],
  );
}

/** Get next approved post for Claude Chrome to pick up */
export async function getNextApprovedPost(): Promise<SocialPost | null> {
  return queryOne<SocialPost>(
    `SELECT * FROM social_post_queue
     WHERE status = 'approved'
     ORDER BY created_at ASC
     LIMIT 1`,
  );
}

/** Mark a post as posted by Claude Chrome */
export async function markAsPosted(id: string, postUrl: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue
     SET status = 'posted', posted_at = NOW(), post_url = $2
     WHERE id = $1`,
    [id, postUrl],
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/lib/social-queue.ts
git commit -m "feat: social-queue DAL — enqueue, approve, reject, fetch next, mark posted"
```

---

### Task 12: Signal card OG image generator

**Files:**
- Create: `apps/web/app/api/og/signal/route.tsx`

- [ ] **Step 1: Create the signal card image route**

```tsx
// apps/web/app/api/og/signal/route.tsx
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { OG_BRAND } from '../brand';
import { queryOne } from '../../../../lib/db-pool';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const signal = await queryOne<{
    pair: string;
    direction: string;
    confidence: number;
    entry_price: number;
    tp1: number;
    sl: number;
    timeframe: string;
    created_at: string;
  }>(
    `SELECT pair, direction, confidence, entry_price, tp1, sl, timeframe, created_at
     FROM signal_history WHERE id = $1`,
    [id],
  );

  if (!signal) return new Response('Signal not found', { status: 404 });

  const isBuy = signal.direction === 'BUY';
  const dirColor = isBuy ? OG_BRAND.accent : '#ef4444';
  const dirLabel = isBuy ? 'BUY' : 'SELL';
  const date = new Date(signal.created_at).toISOString().slice(0, 16).replace('T', ' ');

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_BRAND.width,
          height: OG_BRAND.height,
          background: OG_BRAND.bg,
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, color: OG_BRAND.accent, letterSpacing: '0.15em' }}>
            {OG_BRAND.logo}
          </div>
          <div style={{ fontSize: 16, color: OG_BRAND.muted }}>{date} UTC</div>
        </div>

        {/* Signal */}
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: dirColor,
              background: `${dirColor}15`,
              padding: '4px 16px',
              borderRadius: 8,
            }}
          >
            {dirLabel}
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, color: OG_BRAND.fg }}>
            {signal.pair}
          </div>
          <div style={{ fontSize: 24, color: OG_BRAND.muted }}>
            {signal.timeframe}
          </div>
        </div>

        {/* Levels */}
        <div style={{ display: 'flex', gap: 60, marginTop: 48 }}>
          <div>
            <div style={{ fontSize: 16, color: OG_BRAND.muted, marginBottom: 4 }}>ENTRY</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: OG_BRAND.fg }}>
              {Number(signal.entry_price).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, color: OG_BRAND.accent, marginBottom: 4 }}>TP1</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: OG_BRAND.accent }}>
              {Number(signal.tp1).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 4 }}>SL</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#ef4444' }}>
              {Number(signal.sl).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, color: OG_BRAND.muted, marginBottom: 4 }}>CONFIDENCE</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: OG_BRAND.fg }}>
              {Math.round(signal.confidence)}%
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', fontSize: 18, color: OG_BRAND.muted }}>
          tradeclaw.win — Open-source, every trade published live
        </div>
      </div>
    ),
    { width: OG_BRAND.width, height: OG_BRAND.height },
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/og/signal/
git commit -m "feat: signal card OG image generator — /api/og/signal?id=<signalId>"
```

---

### Task 13: Summary card OG image generator

**Files:**
- Create: `apps/web/app/api/og/summary/route.tsx`

- [ ] **Step 1: Create the summary card route**

```tsx
// apps/web/app/api/og/summary/route.tsx
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { OG_BRAND } from '../brand';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get('period') ?? 'daily';
  const total = request.nextUrl.searchParams.get('total') ?? '0';
  const wins = request.nextUrl.searchParams.get('wins') ?? '0';
  const losses = request.nextUrl.searchParams.get('losses') ?? '0';
  const winRate = request.nextUrl.searchParams.get('winRate') ?? '0';
  const pnl = request.nextUrl.searchParams.get('pnl') ?? '0';
  const date = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  const title = period === 'daily'
    ? `Daily Report — ${date}`
    : `Weekly Report — w/e ${date}`;

  const pnlNum = parseFloat(pnl);
  const pnlColor = pnlNum >= 0 ? OG_BRAND.accent : '#ef4444';
  const pnlPrefix = pnlNum >= 0 ? '+' : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_BRAND.width,
          height: OG_BRAND.height,
          background: OG_BRAND.bg,
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 20, color: OG_BRAND.accent, letterSpacing: '0.15em' }}>
          {OG_BRAND.logo}
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: OG_BRAND.fg, marginTop: 24 }}>
          {title}
        </div>

        <div style={{ display: 'flex', gap: 50, marginTop: 48 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: OG_BRAND.fg }}>{total}</div>
            <div style={{ fontSize: 18, color: OG_BRAND.muted }}>Signals</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: OG_BRAND.accent }}>{wins}</div>
            <div style={{ fontSize: 18, color: OG_BRAND.muted }}>Wins</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: '#ef4444' }}>{losses}</div>
            <div style={{ fontSize: 18, color: OG_BRAND.muted }}>Losses</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: OG_BRAND.fg }}>{winRate}%</div>
            <div style={{ fontSize: 18, color: OG_BRAND.muted }}>Win Rate</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: pnlColor }}>
              {pnlPrefix}{pnl}R
            </div>
            <div style={{ fontSize: 18, color: OG_BRAND.muted }}>P/L (R)</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 18, color: OG_BRAND.muted }}>
          tradeclaw.win/track-record — Fully open-source, every trade published live
        </div>
      </div>
    ),
    { width: OG_BRAND.width, height: OG_BRAND.height },
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/og/summary/
git commit -m "feat: summary card OG image generator — /api/og/summary?period=daily&total=X&..."
```

---

### Task 14: Queue writer — auto-enqueue signals to social queue

**Files:**
- Modify: `apps/web/lib/tracked-signals.ts`

- [ ] **Step 1: Add queue writer after signal recording**

In `getTrackedSignals()`, after the `recordSignalsAsync()` call, add a social queue enqueue step:

```typescript
import { enqueuePost } from './social-queue';

// After recordSignalsAsync(toRecord) call:
// Enqueue social posts for new signals (fire-and-forget)
for (const signal of toRecord) {
  const isBuy = signal.direction === 'BUY';
  const copy = `${isBuy ? 'BUY' : 'SELL'} ${signal.pair} @ ${Number(signal.entry_price).toFixed(2)} | TP1 ${Number(signal.tp1).toFixed(2)} | SL ${Number(signal.sl).toFixed(2)} | Confidence ${Math.round(signal.confidence)}%\n\nTrack live: tradeclaw.win/track-record`;
  const imageUrl = `/api/og/signal?id=${signal.id}`;

  enqueuePost({
    kind: 'signal',
    payload: {
      signalId: signal.id,
      pair: signal.pair,
      direction: signal.direction,
      confidence: signal.confidence,
      entry: signal.entry_price,
      tp1: signal.tp1,
      sl: signal.sl,
      timeframe: signal.timeframe,
    },
    imageUrl,
    copy,
    status: 'pending', // Signal posts require human approval
  }).catch(() => {
    // Fire-and-forget — don't let queue failures affect signal delivery
  });
}
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/lib/tracked-signals.ts
git commit -m "feat: auto-enqueue new signals to social_post_queue for approval"
```

---

### Task 15: Admin social queue page

**Files:**
- Create: `apps/web/app/admin/social-queue/page.tsx`
- Create: `apps/web/app/admin/social-queue/social-queue-client.tsx`
- Create: `apps/web/app/api/admin/social-queue/route.ts`

- [ ] **Step 1: Create the API route for admin queue actions**

```typescript
// apps/web/app/api/admin/social-queue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, approvePost, rejectPost } from '../../../../lib/social-queue';

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const posts = await getAllPosts(100);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { id, action } = body as { id: string; action: 'approve' | 'reject' };

  if (action === 'approve') {
    await approvePost(id);
  } else if (action === 'reject') {
    await rejectPost(id);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create the SSR page**

```tsx
// apps/web/app/admin/social-queue/page.tsx
import { SocialQueueClient } from './social-queue-client';

export default function SocialQueuePage() {
  return <SocialQueueClient />;
}
```

- [ ] **Step 3: Create the client component**

```tsx
// apps/web/app/admin/social-queue/social-queue-client.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface SocialPost {
  id: string;
  kind: string;
  copy: string;
  image_url: string | null;
  status: string;
  created_at: string;
  post_url: string | null;
}

export function SocialQueueClient() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const adminSecret = typeof window !== 'undefined'
    ? localStorage.getItem('admin_secret') ?? ''
    : '';

  const fetchPosts = useCallback(async () => {
    const res = await fetch('/api/admin/social-queue', {
      headers: { Authorization: `Bearer ${adminSecret}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
    }
    setLoading(false);
  }, [adminSecret]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/social-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSecret}`,
      },
      body: JSON.stringify({ id, action }),
    });
    fetchPosts();
  }

  if (loading) return <div className="p-8 text-[var(--text-secondary)]">Loading...</div>;

  const pending = posts.filter((p) => p.status === 'pending');
  const rest = posts.filter((p) => p.status !== 'pending');

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Social Post Queue</h1>

      {/* Pending posts */}
      <h2 className="text-lg font-semibold text-emerald-400 mb-4">
        Pending Approval ({pending.length})
      </h2>
      {pending.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)] mb-8">No pending posts.</p>
      )}
      <div className="flex flex-col gap-4 mb-12">
        {pending.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                {p.kind}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {new Date(p.created_at).toLocaleString()}
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-[var(--foreground)] mb-3">
              {p.copy}
            </pre>
            {p.image_url && (
              <img
                src={p.image_url}
                alt="Signal card preview"
                className="rounded-lg mb-3 max-w-md"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(p.id, 'approve')}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(p.id, 'reject')}
                className="rounded-lg border border-red-500/40 px-4 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-4">History</h2>
      <div className="flex flex-col gap-3">
        {rest.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  p.status === 'posted'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : p.status === 'approved'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
              >
                {p.status}
              </span>
              <span className="text-sm text-[var(--foreground)] truncate max-w-md">
                {p.copy.split('\n')[0]}
              </span>
            </div>
            {p.post_url && (
              <a
                href={p.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:underline"
              >
                View post
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/admin/social-queue/ apps/web/app/api/admin/social-queue/
git commit -m "feat: admin social queue — approve/reject pending posts with card preview"
```

---

### Task 16: Claude Chrome bridge API endpoints

**Files:**
- Create: `apps/web/app/api/social/next/route.ts`
- Create: `apps/web/app/api/social/posted/route.ts`

- [ ] **Step 1: Create GET /api/social/next**

```typescript
// apps/web/app/api/social/next/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getNextApprovedPost } from '../../../../lib/social-queue';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SOCIAL_AGENT_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const post = await getNextApprovedPost();
  if (!post) {
    return NextResponse.json({ post: null }, { status: 204 });
  }

  // Resolve full image URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tradeclaw.win';
  const imageUrl = post.image_url?.startsWith('/')
    ? `${baseUrl}${post.image_url}`
    : post.image_url;

  return NextResponse.json({
    post: {
      id: post.id,
      kind: post.kind,
      copy: post.copy,
      imageUrl,
    },
  });
}
```

- [ ] **Step 2: Create POST /api/social/posted**

```typescript
// apps/web/app/api/social/posted/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markAsPosted } from '../../../../lib/social-queue';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SOCIAL_AGENT_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, postUrl } = (await request.json()) as {
    id: string;
    postUrl: string;
  };

  if (!id || !postUrl) {
    return NextResponse.json({ error: 'Missing id or postUrl' }, { status: 400 });
  }

  await markAsPosted(id, postUrl);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Add SOCIAL_AGENT_TOKEN to Railway env vars**

Generate a random token:
```bash
openssl rand -hex 32
```

Set it on Railway as `SOCIAL_AGENT_TOKEN`. This is the bearer token Claude Chrome will use.

- [ ] **Step 4: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/social/
git commit -m "feat: Claude Chrome bridge — GET /api/social/next + POST /api/social/posted"
```

---

### Task 17: Claude Chrome playbook

**Files:**
- Create: `docs/claude-chrome-playbook.md`

- [ ] **Step 1: Write the playbook**

```markdown
# Claude Chrome — TradeClaw Social Posting Playbook

## Setup
- Open X (twitter.com) logged in as @tradeclaw (or configured account)
- Have the SOCIAL_AGENT_TOKEN ready

## Loop (every 60 seconds)
1. **Fetch next approved post:**
   ```
   GET https://tradeclaw.win/api/social/next
   Authorization: Bearer <SOCIAL_AGENT_TOKEN>
   ```
   - If 204 (no content): wait 60s, repeat
   - If 200: continue with the returned post

2. **Download the image** from the `imageUrl` field

3. **Compose tweet:**
   - Text: the `copy` field from the response
   - Attach the downloaded image
   - Post the tweet

4. **Report back:**
   ```
   POST https://tradeclaw.win/api/social/posted
   Authorization: Bearer <SOCIAL_AGENT_TOKEN>
   Content-Type: application/json
   { "id": "<post.id>", "postUrl": "<url of the posted tweet>" }
   ```

5. Wait 60s, go to step 1

## Error handling
- If fetch fails (network error): wait 120s, retry
- If posting to X fails: wait 300s, retry same post (don't fetch a new one)
- If the same post fails 3 times: skip it (it will remain as 'approved' in queue for manual posting)

## Content rules
- Never edit the copy text — post exactly as received
- Always attach the image — do not post text-only
- One post at a time — wait for the report-back before fetching the next
```

- [ ] **Step 2: Commit**

```bash
git add docs/claude-chrome-playbook.md
git commit -m "docs: Claude Chrome posting playbook for automated X posting"
```

---

## Phase 4: Automated Summaries

### Task 18: Daily EOD summary cron

**Files:**
- Create: `apps/web/app/api/cron/social/daily/route.ts`

- [ ] **Step 1: Create the daily summary cron route**

```typescript
// apps/web/app/api/cron/social/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db-pool';
import { enqueuePost } from '../../../../../lib/social-queue';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query today's signals
  const rows = await query<{
    pair: string;
    direction: string;
    confidence: number;
    outcome_4h: unknown;
    outcome_24h: unknown;
  }>(
    `SELECT pair, direction, confidence, outcome_4h, outcome_24h
     FROM signal_history
     WHERE created_at >= NOW() - INTERVAL '24 hours'`,
  );

  const total = rows.length;
  if (total === 0) {
    return NextResponse.json({ skipped: true, reason: 'No signals today' });
  }

  const wins = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === true;
  }).length;
  const losses = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === false;
  }).length;
  const pending = total - wins - losses;
  const winRate = wins + losses > 0
    ? ((wins / (wins + losses)) * 100).toFixed(1)
    : '—';

  // Simple R calculation (wins = +1R each, losses = -1R each)
  const pnlR = (wins - losses).toFixed(1);

  const today = new Date().toISOString().slice(0, 10);

  const copy = [
    `Daily Report — ${today}`,
    '',
    `Signals: ${total} | Wins: ${wins} | Losses: ${losses}${pending > 0 ? ` | Pending: ${pending}` : ''}`,
    `Win Rate: ${winRate}% | P/L: ${parseFloat(pnlR) >= 0 ? '+' : ''}${pnlR}R`,
    '',
    'Track live: tradeclaw.win/track-record',
    '',
    '#TradeClaw #AlgoTrading #Signals',
  ].join('\n');

  const imageUrl = `/api/og/summary?period=daily&total=${total}&wins=${wins}&losses=${losses}&winRate=${winRate}&pnl=${pnlR}&date=${today}`;

  const id = await enqueuePost({
    kind: 'daily',
    payload: { total, wins, losses, pending, winRate, pnlR, date: today },
    imageUrl,
    copy,
    status: 'approved', // Daily summaries are auto-approved
  });

  return NextResponse.json({ queued: true, postId: id });
}
```

- [ ] **Step 2: Register in instrumentation.ts**

In `apps/web/instrumentation.ts`, add after the existing cron interval:

```typescript
// Daily social summary — 00:00 UTC
const now = new Date();
const msUntilMidnight =
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)).getTime() -
  now.getTime();

setTimeout(() => {
  // Fire first one, then repeat every 24h
  fetch(`${baseUrl}/api/cron/social/daily`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  }).catch(() => {});

  setInterval(() => {
    fetch(`${baseUrl}/api/cron/social/daily`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
  }, 24 * 60 * 60 * 1000);
}, msUntilMidnight);
```

- [ ] **Step 3: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/cron/social/daily/ apps/web/instrumentation.ts
git commit -m "feat: daily EOD summary cron — auto-queues summary to social_post_queue"
```

---

### Task 19: Weekly summary cron

**Files:**
- Create: `apps/web/app/api/cron/social/weekly/route.ts`

- [ ] **Step 1: Create the weekly summary cron route**

```typescript
// apps/web/app/api/cron/social/weekly/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db-pool';
import { enqueuePost } from '../../../../../lib/social-queue';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query<{
    pair: string;
    direction: string;
    confidence: number;
    entry_price: number;
    tp1: number;
    sl: number;
    outcome_4h: unknown;
    outcome_24h: unknown;
    created_at: string;
  }>(
    `SELECT pair, direction, confidence, entry_price, tp1, sl,
            outcome_4h, outcome_24h, created_at
     FROM signal_history
     WHERE created_at >= NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`,
  );

  const total = rows.length;
  if (total === 0) {
    return NextResponse.json({ skipped: true, reason: 'No signals this week' });
  }

  const wins = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === true;
  }).length;
  const losses = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { hit?: boolean } | null;
    return o?.hit === false;
  }).length;
  const winRate = wins + losses > 0
    ? ((wins / (wins + losses)) * 100).toFixed(1)
    : '—';
  const pnlR = (wins - losses).toFixed(1);

  // Find best and worst trades
  const resolved = rows.filter((r) => {
    const o = (r.outcome_4h ?? r.outcome_24h) as { pnlPct?: number } | null;
    return o?.pnlPct !== undefined;
  });
  const bestTrade = resolved.sort((a, b) => {
    const aP = ((a.outcome_4h ?? a.outcome_24h) as { pnlPct: number }).pnlPct;
    const bP = ((b.outcome_4h ?? b.outcome_24h) as { pnlPct: number }).pnlPct;
    return bP - aP;
  })[0];
  const worstTrade = resolved[resolved.length - 1];

  const weekEnd = new Date().toISOString().slice(0, 10);

  const copyLines = [
    `Weekly Report — w/e ${weekEnd}`,
    '',
    `Signals: ${total} | Wins: ${wins} | Losses: ${losses}`,
    `Win Rate: ${winRate}% | P/L: ${parseFloat(pnlR) >= 0 ? '+' : ''}${pnlR}R`,
  ];

  if (bestTrade) {
    const bp = ((bestTrade.outcome_4h ?? bestTrade.outcome_24h) as { pnlPct: number }).pnlPct;
    copyLines.push('', `Best: ${bestTrade.pair} ${bestTrade.direction} (${bp > 0 ? '+' : ''}${bp.toFixed(2)}%)`);
  }
  if (worstTrade && worstTrade !== bestTrade) {
    const wp = ((worstTrade.outcome_4h ?? worstTrade.outcome_24h) as { pnlPct: number }).pnlPct;
    copyLines.push(`Worst: ${worstTrade.pair} ${worstTrade.direction} (${wp > 0 ? '+' : ''}${wp.toFixed(2)}%)`);
  }

  copyLines.push(
    '',
    'Every trade published — wins and losses.',
    'tradeclaw.win/track-record',
    '',
    '#TradeClaw #AlgoTrading #WeeklyRecap',
  );

  const copy = copyLines.join('\n');
  const imageUrl = `/api/og/summary?period=weekly&total=${total}&wins=${wins}&losses=${losses}&winRate=${winRate}&pnl=${pnlR}&date=${weekEnd}`;

  const id = await enqueuePost({
    kind: 'weekly',
    payload: { total, wins, losses, winRate, pnlR, weekEnd },
    imageUrl,
    copy,
    status: 'approved', // Weekly summaries are auto-approved
  });

  return NextResponse.json({ queued: true, postId: id });
}
```

- [ ] **Step 2: Register weekly cron in instrumentation.ts**

```typescript
// Weekly social summary — Sunday 18:00 UTC
function msUntilNextSunday18(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 && now.getUTCHours() < 18
    ? 0
    : (7 - dayOfWeek) % 7 || 7;
  const nextSunday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 18, 0, 0,
  ));
  return nextSunday.getTime() - now.getTime();
}

setTimeout(() => {
  fetch(`${baseUrl}/api/cron/social/weekly`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  }).catch(() => {});

  setInterval(() => {
    fetch(`${baseUrl}/api/cron/social/weekly`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
  }, 7 * 24 * 60 * 60 * 1000);
}, msUntilNextSunday18());
```

- [ ] **Step 3: Verify build + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/cron/social/weekly/ apps/web/instrumentation.ts
git commit -m "feat: weekly summary cron — auto-queues weekly recap to social_post_queue"
```

---

## Phase 5: Telegram + OSS Polish

### Task 20: Public Telegram delayed push

**Files:**
- Modify: existing Telegram bot agent code (find the agent service)

- [ ] **Step 1: Locate the Telegram bot agent**

```bash
find /home/naim/.openclaw/workspace/tradeclaw -name "*.ts" -path "*/agent*" | head -20
grep -r "TELEGRAM_BOT_TOKEN" apps/ --include="*.ts" -l
```

- [ ] **Step 2: Add delayed signal push to public channel**

After the existing bot logic, add a signal broadcast function that:
1. Reads from `social_post_queue` where `kind = 'signal'` AND `status = 'posted'` AND `channel = 'x'`
2. For each, also sends to the public Telegram channel `@tradeclawwin` with the same image + copy
3. Marks the Telegram delivery timestamp

Since the specifics depend on the existing bot structure (which varies), the implementation must:
- Consume signal posts that have already been approved and posted to X
- Add a 15-minute delay gate (check `created_at` of the original signal)
- Post to `@tradeclawwin` using the Telegram Bot API `sendPhoto` with the same image URL and copy text
- This can be a separate cron endpoint or integrated into the existing bot loop

- [ ] **Step 3: Verify + commit**

```bash
npm run build -w apps/web
git add -A && git commit -m "feat: public Telegram — auto-post delayed signals to @tradeclawwin"
```

---

### Task 21: Pro Telegram auto-invite on Stripe checkout

**Files:**
- Modify: `apps/web/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Read the existing webhook handler**

Check how `checkout.session.completed` currently handles Telegram invites.

- [ ] **Step 2: Ensure Pro checkout triggers Telegram invite**

In the `checkout.session.completed` handler, after `updateUserTier(userId, 'pro')`, verify the existing Telegram invite flow:

```typescript
// After tier update:
if (tier === 'pro') {
  // Create Telegram invite for private Pro group
  const proGroupChatId = process.env.TELEGRAM_PRO_GROUP_CHAT_ID;
  if (proGroupChatId && user.telegramUserId) {
    // Generate invite link
    const inviteUrl = await createChatInviteLink(proGroupChatId);
    await createTelegramInvite({
      userId,
      chatId: proGroupChatId,
      inviteUrl,
    });
    // Send DM to user with invite link
    await sendTelegramMessage(
      user.telegramUserId,
      `Welcome to TradeClaw Pro! Here's your private group invite: ${inviteUrl}`,
    );
  }
}
```

If this flow already exists (it likely does from the current webhook handler), verify it works for Pro tier specifically. If not, add the Pro group env var (`TELEGRAM_PRO_GROUP_CHAT_ID`) and wire it up.

- [ ] **Step 3: Add TELEGRAM_PRO_GROUP_CHAT_ID to Railway**

Create the private Telegram group, add the bot as admin, and set the env var on Railway.

- [ ] **Step 4: Verify + commit**

```bash
npm run build -w apps/web
git add apps/web/app/api/stripe/webhook/route.ts
git commit -m "feat: auto-invite Pro subscribers to private Telegram group on checkout"
```

---

### Task 22: README + landing page rewrite

**Files:**
- Modify: `README.md` (repo root)
- Modify: `apps/web/app/page.tsx` (homepage)

- [ ] **Step 1: Rewrite README.md**

```markdown
# TradeClaw

Open-source AI trading signal platform. Self-host for free, or use [TradeClaw Pro](https://tradeclaw.win) for real-time signals and a private Telegram group.

## What it does

- Multi-timeframe technical analysis (RSI, MACD, EMA, Bollinger, Stochastic, ADX)
- Confidence-scored BUY/SELL signals with TP1/TP2/TP3 + SL levels
- Live track record — every trade published, wins and losses: [tradeclaw.win/track-record](https://tradeclaw.win/track-record)
- Paper trading + backtesting
- Docker Compose for self-hosting

## Live track record

TradeClaw Pro runs the same signal engine the developer trades personally. See the live, verifiable track record at [tradeclaw.win/track-record](https://tradeclaw.win/track-record).

## Quick start (self-host)

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
cp .env.example .env  # configure DATABASE_URL, etc.
docker compose up
```

Open `http://localhost:3000`.

## TradeClaw Pro ($29/mo)

The hosted version at [tradeclaw.win](https://tradeclaw.win) includes:

- Real-time signal delivery (free self-host has 15-min delay)
- All traded symbols (free = 3 symbols)
- TP1/TP2/TP3 + SL + trailing stop levels
- Premium MTF confluence signals
- Full signal history + CSV export
- Private Pro Telegram group
- 7-day free trial

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the signal generation pipeline.

## Tech stack

Next.js (App Router) · PostgreSQL · Stripe · Telegram Bot API · Docker Compose

## License

MIT
```

- [ ] **Step 2: Update homepage hero copy**

In `apps/web/app/page.tsx`, update the hero section to lead with transparency + open-source:

Find the hero heading and tagline, update to:

```tsx
<h1>Open-source AI trading signals.</h1>
<p>
  Every trade published live — wins and losses. Self-host free from GitHub,
  or upgrade to Pro for real-time signals and a private Telegram group.
</p>
```

Add a track-record callout link prominently below the CTA buttons.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build -w apps/web
git add README.md apps/web/app/page.tsx
git commit -m "feat: README + homepage rewrite — open-source + transparent track record positioning"
```

---

### Task 23: Create ARCHITECTURE.md

**Files:**
- Create: `ARCHITECTURE.md`

- [ ] **Step 1: Write ARCHITECTURE.md**

```markdown
# TradeClaw Architecture

## Signal Generation Pipeline

```
Browser / API request
      |
      v
getTrackedSignals()               [apps/web/lib/tracked-signals.ts]
      |
      +--- getSignals()            [apps/web/app/lib/signals.ts]
      |       |
      |       +--- generateSignalsFromTA()  [apps/web/app/lib/signal-generator.ts]
      |               |
      |               +--- ta-engine.ts     [RSI, MACD, EMA, BB, Stoch, ADX]
      |               |
      |               +--- Confidence scoring (48-95%)
      |               |
      |               +--- Direction gates (ADX, RSI, MACD confirmation)
      |               |
      |               +--- Multi-timeframe confluence (optional, +15 bonus)
      |
      +--- Tier gating             [apps/web/lib/tier-gate.ts]
      |       Free: 15-min delay, 3 symbols, TP1 only
      |       Pro: real-time, all symbols, TP1/2/3 + SL
      |
      +--- Fire-and-forget record  [signal_history table, PostgreSQL]
      |
      +--- Social queue write      [social_post_queue table]
      |
      v
JSON response to caller
```

## Database

PostgreSQL on Railway. Raw SQL via `pg` Pool — no ORM. Migrations in `apps/web/migrations/`.

## Monetization

Stripe Checkout with 7-day trial. Webhook updates `users.tier`. Two tiers: Free, Pro ($29/mo).

## Social GTM

Automated pipeline: signals → OG card images → approval queue → Claude Chrome posts to X → delayed push to public Telegram.
```

- [ ] **Step 2: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: ARCHITECTURE.md — signal pipeline, DB, monetization, social GTM"
```

---

## Final: Deployment + Launch Checklist

### Task 24: Pre-launch deployment checklist

- [ ] **Step 1: Update Stripe products**

In Stripe dashboard:
- Archive Elite monthly + annual prices (don't delete)
- Verify Pro monthly is $29 (create new price if current is $19)
- Verify Pro annual is $290
- Update env vars on Railway: `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`

- [ ] **Step 2: Set new env vars on Railway**

```
SOCIAL_AGENT_TOKEN=<generated 64-char hex>
TELEGRAM_PRO_GROUP_CHAT_ID=<private pro group chat ID>
```

- [ ] **Step 3: Run migration**

```bash
psql "$DATABASE_URL" -f apps/web/migrations/011_social_post_queue.sql
```

- [ ] **Step 4: Deploy to Railway**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
npm run build -w apps/web
railway up --detach
```

- [ ] **Step 5: Verify live**

- Visit `https://tradeclaw.win/pricing` — should show 2 tiers
- Visit `https://tradeclaw.win/track-record` — should show honest W/L with toggles
- Hit `https://tradeclaw.win/api/signals` without auth — should return delayed, 3-symbol signals
- Test Stripe checkout end-to-end with test card
- Verify `/admin/social-queue` loads and shows queue
- Test `/api/social/next` with bearer token returns 204 (empty queue)

- [ ] **Step 6: Start Claude Chrome agent**

Point Claude Chrome at `docs/claude-chrome-playbook.md`, configure `SOCIAL_AGENT_TOKEN`, and start the polling loop.

- [ ] **Step 7: Commit final state**

```bash
git add -A && git commit -m "chore: TradeClaw Pro launch — all phases complete"
```
