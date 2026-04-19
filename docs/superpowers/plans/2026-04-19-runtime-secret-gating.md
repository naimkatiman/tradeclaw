# Runtime Secret Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public teaser endpoint, a tier-gated signal detail page, and an HTTP-pluggable premium signal source so the MIT-public repo serves everyone the free experience while tradeclaw.win's private deploy augments with real premium signals.

**Architecture:** One codebase. All gates are server-side. Premium behavior activates only when the deploy has `PREMIUM_SIGNAL_SOURCE_URL` + `PREMIUM_SIGNAL_SOURCE_KEY` env vars. Self-hosters run the same code and get free-tier-only output — no code forks needed. The `premium_signals` DB table stays as a second source; the HTTP source is merged alongside it.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Jest (ts-jest), existing `lib/tier.ts` + `lib/tracked-signals.ts` pattern.

---

## File Structure

| Path | Role |
|---|---|
| `apps/web/app/api/signals/public/route.ts` | NEW. Public teaser endpoint — returns redacted rows (symbol, direction, confidence, timestamp). No entry/SL/TP/id. |
| `apps/web/lib/signal-teaser.ts` | NEW. Pure function: full signal → teaser row. One responsibility. Unit-tested. |
| `apps/web/lib/__tests__/signal-teaser.test.ts` | NEW. Tests for the teaser mask. |
| `apps/web/lib/premium-signal-source.ts` | NEW. HTTP client: fetches signals from `PREMIUM_SIGNAL_SOURCE_URL` when configured; returns `[]` otherwise. |
| `apps/web/lib/__tests__/premium-signal-source.test.ts` | NEW. Tests graceful degradation + env-gated behavior. |
| `apps/web/lib/tracked-signals.ts` | MODIFY. Merge HTTP premium source alongside `getPremiumSignalsFor` (DB source). |
| `apps/web/app/signal/[id]/page.tsx` | MODIFY. Read session tier; free/anon sees blurred entry/SL/TP + upgrade CTA; Pro sees full. |
| `apps/web/components/landing/live-hero-signals.tsx` | MODIFY. Fetch `/api/signals/public` instead of `/api/signals`. |
| `README.md` | MODIFY. Add "Self-hosting vs hosted" section explaining which env vars unlock premium features. |

---

## Task 1: Signal teaser helper (pure, testable)

**Files:**
- Create: `apps/web/lib/signal-teaser.ts`
- Create: `apps/web/lib/__tests__/signal-teaser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/signal-teaser.test.ts
import { toTeaser, type SignalTeaser } from '../signal-teaser';
import type { TradingSignal } from '../../app/lib/signals';

function makeSignal(over: Partial<TradingSignal> = {}): TradingSignal {
  return {
    id: 'sig-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 87,
    entry: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    timestamp: 1_700_000_000_000,
    source: 'real',
    dataQuality: 'real',
    indicators: { rsi: { value: 60, signal: 'neutral' } },
    ...over,
  } as TradingSignal;
}

describe('signal-teaser — toTeaser', () => {
  it('keeps display-safe fields only', () => {
    const teaser: SignalTeaser = toTeaser(makeSignal());
    expect(teaser).toEqual({
      symbol: 'BTCUSD',
      direction: 'BUY',
      confidence: 87,
      timestamp: 1_700_000_000_000,
    });
  });

  it('strips id, entry, stopLoss, takeProfit*, indicators', () => {
    const teaser = toTeaser(makeSignal()) as Record<string, unknown>;
    expect('id' in teaser).toBe(false);
    expect('entry' in teaser).toBe(false);
    expect('stopLoss' in teaser).toBe(false);
    expect('takeProfit1' in teaser).toBe(false);
    expect('takeProfit2' in teaser).toBe(false);
    expect('takeProfit3' in teaser).toBe(false);
    expect('indicators' in teaser).toBe(false);
  });

  it('rounds confidence to an integer for the public payload', () => {
    const teaser = toTeaser(makeSignal({ confidence: 87.42 }));
    expect(teaser.confidence).toBe(87);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
cd /home/naim/.openclaw/workspace/tradeclaw
npx jest apps/web/lib/__tests__/signal-teaser.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../signal-teaser'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/signal-teaser.ts
import type { TradingSignal } from '../app/lib/signals';

export interface SignalTeaser {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timestamp: number;
}

/**
 * Strip every field that would give away a tradable edge (entry price,
 * stops, targets, indicator internals, stable id) and return a display-
 * safe teaser. Used for public/anonymous payloads.
 */
export function toTeaser(signal: TradingSignal): SignalTeaser {
  return {
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: Math.round(signal.confidence),
    timestamp:
      typeof signal.timestamp === 'number'
        ? signal.timestamp
        : new Date(signal.timestamp).getTime(),
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

```
npx jest apps/web/lib/__tests__/signal-teaser.test.ts --no-coverage
```

Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/signal-teaser.ts apps/web/lib/__tests__/signal-teaser.test.ts
git commit -m "feat(signals): signal-teaser helper for public payload masking"
```

---

## Task 2: Public teaser endpoint

**Files:**
- Create: `apps/web/app/api/signals/public/route.ts`

- [ ] **Step 1: Write the implementation**

```ts
// apps/web/app/api/signals/public/route.ts
import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
import { toTeaser } from '../../../../lib/signal-teaser';
import { anonymousContext } from '../../../../lib/licenses';

/**
 * GET /api/signals/public
 *
 * Anonymous teaser feed for the marketing landing. Callers get
 * symbol/direction/confidence/timestamp only — no id, no entry, no
 * stop, no targets. Safe to cache publicly. Scraping a full page
 * of these reveals nothing actionable.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { signals } = await getTrackedSignals({ ctx: anonymousContext() });
    const teasers = signals.map(toTeaser);
    return NextResponse.json(
      { count: teasers.length, signals: teasers },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ count: 0, signals: [] }, { status: 200 });
  }
}
```

- [ ] **Step 2: Smoke test locally (manual verification — no automated integration test at this layer)**

```
npm run -w apps/web dev
```

In another terminal:
```
curl -s http://localhost:3000/api/signals/public | jq '.signals[0]'
```

Expected: an object with exactly `symbol`, `direction`, `confidence`, `timestamp`. No `id`, no `entry`, no `takeProfit*`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/signals/public/route.ts
git commit -m "feat(api): /api/signals/public teaser endpoint — no tradable fields"
```

---

## Task 3: Premium signal HTTP source (env-gated)

**Files:**
- Create: `apps/web/lib/premium-signal-source.ts`
- Create: `apps/web/lib/__tests__/premium-signal-source.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/__tests__/premium-signal-source.test.ts
import { fetchPremiumFromHttp } from '../premium-signal-source';

describe('premium-signal-source — graceful degradation', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PREMIUM_SIGNAL_SOURCE_URL;
    delete process.env.PREMIUM_SIGNAL_SOURCE_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns [] when neither env var is set (self-host default)', async () => {
    const result = await fetchPremiumFromHttp();
    expect(result).toEqual([]);
  });

  it('returns [] when URL is set but key is missing', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    const result = await fetchPremiumFromHttp();
    expect(result).toEqual([]);
  });

  it('returns [] and does not throw when the remote fetch rejects', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toEqual([]);
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns parsed signals when remote responds 200 with a JSON signals array', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          signals: [
            {
              id: 'r-1',
              strategyId: 'tv-zaky-classic',
              symbol: 'EURUSD',
              timeframe: 'H1',
              direction: 'BUY',
              confidence: 90,
              entry: 1.08,
              stopLoss: 1.07,
              takeProfit1: 1.09,
              timestamp: 1_700_000_000_000,
              source: 'real',
              dataQuality: 'real',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('EURUSD');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('sends the shared secret as a Bearer token', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret-abc';
    const origFetch = global.fetch;
    const spy = jest.fn(async () =>
      new Response(JSON.stringify({ signals: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
    global.fetch = spy;
    try {
      await fetchPremiumFromHttp();
      const call = (spy as unknown as jest.Mock).mock.calls[0];
      const init = call[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer secret-abc');
    } finally {
      global.fetch = origFetch;
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
npx jest apps/web/lib/__tests__/premium-signal-source.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/premium-signal-source.ts
import 'server-only';
import type { TradingSignal } from '../app/lib/signals';

interface RemoteResponse {
  signals?: TradingSignal[];
}

/**
 * Fetch premium signals from a remote HTTP source when the deploy is
 * configured with PREMIUM_SIGNAL_SOURCE_URL + PREMIUM_SIGNAL_SOURCE_KEY.
 *
 * Returns [] in any degraded state: missing env vars, network error,
 * non-2xx response, malformed body. The contract is "best-effort augment" —
 * the DB-backed premium_signals table remains the primary source.
 *
 * This is the single switch between the public self-hostable build (no
 * envs, no augment) and the hosted tradeclaw.win deploy (envs set, real
 * premium feed).
 */
export async function fetchPremiumFromHttp(): Promise<TradingSignal[]> {
  const url = process.env.PREMIUM_SIGNAL_SOURCE_URL;
  const key = process.env.PREMIUM_SIGNAL_SOURCE_KEY;
  if (!url || !key) return [];

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      // Premium feed is short-lived. Don't let Next cache it across deploys.
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = (await res.json()) as RemoteResponse;
    return Array.isArray(body.signals) ? body.signals : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

```
npx jest apps/web/lib/__tests__/premium-signal-source.test.ts --no-coverage
```

Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/premium-signal-source.ts apps/web/lib/__tests__/premium-signal-source.test.ts
git commit -m "feat(signals): env-gated HTTP premium signal source with graceful degradation"
```

---

## Task 4: Wire HTTP source into the merge

**Files:**
- Modify: `apps/web/lib/tracked-signals.ts` (merge section, currently ~lines 170-184)

- [ ] **Step 1: Read the current merge section**

Open `apps/web/lib/tracked-signals.ts`. Locate the block that begins:

```ts
  // Merge premium signals (TradingView webhook ingest). Empty for anonymous
  // callers — the license check inside getPremiumSignalsFor short-circuits.
  try {
    const premium = await getPremiumSignalsFor(ctx, {
```

- [ ] **Step 2: Replace the merge block with both-sources merge**

```ts
  // Merge premium signals. Two possible sources:
  //   1. premium_signals DB table (TradingView webhook ingest) — always on.
  //   2. Remote HTTP feed at PREMIUM_SIGNAL_SOURCE_URL — only on tradeclaw.win
  //      deploys that set the env var. Self-hosts see [] here.
  //
  // Both return [] for anonymous / free-only callers via their own gates,
  // so merging is safe regardless of tier.
  try {
    const { fetchPremiumFromHttp } = await import('./premium-signal-source');
    const [fromDb, fromHttp] = await Promise.all([
      getPremiumSignalsFor(ctx, {
        symbol: params.symbol,
        timeframe: params.timeframe,
        direction: params.direction,
      }),
      fetchPremiumFromHttp(),
    ]);

    // HTTP source is already filtered server-side by the remote; but we
    // still apply the local license gate so a misconfigured remote can't
    // leak premium strategies to a free caller.
    const httpAllowed = fromHttp.filter((s) =>
      ctx.unlockedStrategies.has(s.strategyId ?? FREE_STRATEGY),
    );

    const extras = [...fromDb, ...httpAllowed];
    if (extras.length > 0) {
      // Dedup by id in case both sources return the same signal.
      const seen = new Set(result.signals.map((s) => s.id));
      const deduped = extras.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      result.signals = [...result.signals, ...deduped].sort(
        (a, b) => b.confidence - a.confidence,
      );
    }
  } catch {
    // Premium table missing, remote down, or DB blip — don't break the free path.
  }
```

- [ ] **Step 3: Run the full tier test suite and the existing tests to verify no regression**

```
npx jest apps/web/lib --no-coverage
```

Expected: all previously-passing suites remain passing (83 + new tests from Tasks 1 and 3).

- [ ] **Step 4: Manual smoke — anonymous public endpoint still works**

```
npm run -w apps/web dev
# then:
curl -s http://localhost:3000/api/signals/public | jq '.count'
```

Expected: non-negative integer; the endpoint should not 500.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tracked-signals.ts
git commit -m "feat(signals): merge HTTP premium source alongside premium_signals table"
```

---

## Task 5: Gate the signal detail page by tier

**Files:**
- Modify: `apps/web/app/signal/[id]/page.tsx`

- [ ] **Step 1: Read the current page.tsx to understand the shape**

```
head -120 apps/web/app/signal/[id]/page.tsx
```

Note the current render: signal is fetched, `formatPrice` is used on entry/SL/TP. No tier check.

- [ ] **Step 2: Add tier resolution + blur/CTA logic**

At the top of the file, add:

```ts
import { getUserTier } from '../../../lib/tier';
import { readSessionFromCookies } from '../../../lib/user-session';
import { Lock } from 'lucide-react';
import LinkCTA from 'next/link';
```

(If `Link` is already imported, reuse it — do not double-import. The `LinkCTA` alias is only shown here for readability.)

Inside the default-exported page component (or the RSC that renders the signal), after the signal is resolved:

```ts
const session = await readSessionFromCookies();
const tier = session?.userId ? await getUserTier(session.userId) : 'free';
const isPaid = tier !== 'free';
```

Wherever the template renders `formatPrice(signal.entry)`, `formatPrice(signal.stopLoss)`, `formatPrice(signal.takeProfit1/2/3)`, wrap the value:

```tsx
{isPaid ? (
  <span className="font-mono">{formatPrice(signal.entry)}</span>
) : (
  <span
    className="inline-flex items-center gap-1 rounded bg-emerald-500/5 px-2 py-0.5 font-mono text-emerald-400/70"
    aria-label="Entry price requires Pro"
  >
    <Lock className="h-3 w-3" aria-hidden="true" />
    <span className="select-none tracking-widest">••••••</span>
  </span>
)}
```

Then at the bottom of the page template, for free/anonymous viewers, add a single upgrade CTA card:

```tsx
{!isPaid && (
  <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
    <p className="text-sm font-semibold text-emerald-400">Unlock this signal</p>
    <p className="mt-1 text-sm text-[var(--text-secondary)]">
      Entry price, stop loss, and TP1/TP2/TP3 targets are a Pro feature.
      Real-time delivery, full history, and private Telegram group included.
    </p>
    <Link
      href={`/pricing?from=signal-detail`}
      className="mt-3 inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
    >
      Upgrade to Pro — $29/mo
    </Link>
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```
cd apps/web && npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: same count as before this task (or lower). If higher, fix the new errors before committing.

- [ ] **Step 4: Manual smoke**

```
npm run -w apps/web dev
```

Open `http://localhost:3000/signal/<any-existing-id>` in a browser without signing in. Expected: entry/SL/TP render as locked `••••••` pills + upgrade CTA at the bottom. Sign in with a Pro test account: all prices render normally, no CTA.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/signal/[id]/page.tsx
git commit -m "feat(signal): tier-gate entry/SL/TP on signal detail page"
```

---

## Task 6: Landing hero fetches the public endpoint

**Files:**
- Modify: `apps/web/components/landing/live-hero-signals.tsx`

- [ ] **Step 1: Find the current fetch**

```
grep -n "/api/signals" apps/web/components/landing/live-hero-signals.tsx
```

Currently it calls `/api/signals`, returning full-detail payloads (which the server already anonymizes via `filterSignalByTier` for anonymous callers — but the IDs and any unmasked fields are still on the wire).

- [ ] **Step 2: Swap to the public endpoint**

Replace `fetch('/api/signals', ...)` (and related URL builders) with `fetch('/api/signals/public', ...)`. The response shape now returns `{ count, signals: Teaser[] }` instead of full signals.

Update the render loop to only reference `symbol`, `direction`, `confidence`, `timestamp`. Remove any reference to `entry`, `takeProfit*`, `stopLoss`, `id`. If the hero previously linked each card to `/signal/[id]`, replace the per-row link with a single "See all signals" CTA pointing at `/dashboard` or `/pricing`.

- [ ] **Step 3: Typecheck + visual smoke**

```
cd apps/web && npx tsc --noEmit 2>&1 | grep "live-hero-signals"
```

Expected: no errors in this file.

```
npm run -w apps/web dev
```

Open `http://localhost:3000/` anonymously. Expected: hero shows ticker cards with symbol + BUY/SELL + confidence %, no price numbers, no clickable individual rows.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/live-hero-signals.tsx
git commit -m "feat(landing): hero consumes public teaser endpoint (no price leak)"
```

---

## Task 7: README — self-host vs hosted section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a new section after the Quick Start**

Search for the heading that starts the Quick Start / Installation area (grep for `## Quick Start` or `## Install`). Below that block, before the next `##`-level heading, append:

```markdown
## Self-hosting vs. TradeClaw Pro (hosted)

TradeClaw is MIT-licensed. You can fork, self-host, and run the entire
signal framework for free — the free-tier signal engine (classic TA,
RSI + EMA + MACD confluence), backtester, dashboard, paper trading, and
public Telegram broadcaster are all in this repo.

The hosted version at **tradeclaw.win** adds features that require
credentials that do not ship with the code:

| Feature | Unlocked by env var | Who has it |
|---|---|---|
| Real-time premium signals | `PREMIUM_SIGNAL_SOURCE_URL` + `PREMIUM_SIGNAL_SOURCE_KEY` | tradeclaw.win only |
| Stripe checkout + tier upgrade on webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Per-deploy |
| Private Pro Telegram group + invite on subscribe | `TELEGRAM_PRO_GROUP_ID` + Pro bot token | tradeclaw.win only |
| Telegram auto-broadcast of free symbols | `TELEGRAM_CHANNEL_ID` + bot token | Per-deploy |

Without these, self-hosters get the free-tier experience — which is the
same signal engine founders dogfood against real capital. No code is
withheld. What is withheld is the curated premium signal feed and the
payment plumbing. Those are operational, not algorithmic.

If you want to run your own paid tier on top of this code: set your
own Stripe keys, run your own premium signal generator, and point
`PREMIUM_SIGNAL_SOURCE_URL` at it. The HTTP contract is minimal —
`GET <url>` returning `{ signals: TradingSignal[] }` with a Bearer
`Authorization` header using `PREMIUM_SIGNAL_SOURCE_KEY`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): explain self-host vs hosted feature split"
```

---

## Self-Review

**1. Spec coverage**

| Scope item | Covered by |
|---|---|
| Teaser endpoint | Tasks 1 + 2 |
| Landing hero wiring | Task 6 |
| Signal detail page tier gating | Task 5 |
| `PREMIUM_SIGNAL_SOURCE_URL` HTTP client + graceful degradation | Tasks 3 + 4 |
| Document private/public split in README | Task 7 |

No gaps.

**2. Placeholder scan**

No "TBD", "similar to Task N", or vague "handle edge cases" instructions. Every code step shows the code. Every test step shows the assertion.

**3. Type consistency**

- `SignalTeaser` defined in Task 1, consumed in Task 2, consumed in Task 6. Signatures match.
- `fetchPremiumFromHttp(): Promise<TradingSignal[]>` defined in Task 3, consumed in Task 4 via dynamic import. Name matches.
- `getUserTier` in Task 5 is the existing export; already used throughout — no new function introduced that could drift.

**4. Scope check**

This plan has one subsystem (public/private split with runtime gating). It produces working, shippable software after each task.
