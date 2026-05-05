# TradeClaw Paid Funnel + Proof — Implementation Plan

> **Companion to:** [`2026-04-20-paid-funnel-and-proof.md`](./2026-04-20-paid-funnel-and-proof.md) (design). Read the design first for context on the two-narrative decision.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the paid funnel on `tradeclaw.win` (direct checkout, annual toggle, post-checkout onboarding) and replace the win-rate-only hero with a proof block leading with real-time-vs-delay, net P&L, profit factor, signals today, and sample Telegram alerts.

**Architecture:** Two phases, Phase 1 ships first. Phase 1 is pricing/signin/checkout/welcome plumbing. Phase 2 is a new landing hero backed by a stats endpoint that reads the production `signal_history` Postgres table. No new backend infra. No new test framework — Playwright E2E + `curl` smoke + `psql` DB checks + `npm run build` type-check.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Stripe v21, Postgres (Railway), Playwright for E2E.

**Design doc:** [docs/plans/2026-04-20-paid-funnel-and-proof.md](./2026-04-20-paid-funnel-and-proof.md)

---

## Global conventions for this plan

- **Workdir:** `/home/naim/.openclaw/workspace/tradeclaw` (repo root). `apps/web` is the Next.js service that ships to Railway.
- **Type-check gate:** Run `cd apps/web && npm run build` after every task. Must pass before commit.
- **Deploy:** GitHub auto-deploy is OFF on the `web` Railway service. After pushing `main`, run `railway up --detach` from repo root to actually deploy.
- **Commit style:** `<type>(scope): <outcome>`, one concern per commit, ≤15 files per commit. Cite the design doc filename in the commit body for the feature commits.
- **Test file location:** `apps/web/tests/e2e/<feature>.spec.ts` (matches `playwright.config.ts` testDir).

## Phase 1 — Funnel (Tasks 1–5)

### Task 1: Document the new public priceId env var

**Files:**
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Read current .env.example to see existing Stripe keys**

Run: `grep -n STRIPE apps/web/.env.example`

Expected output:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ANNUAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
```

- [ ] **Step 2: Add `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID` right below the monthly public one**

Edit `apps/web/.env.example`. Find the line:
```
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
```
Insert immediately after:
```
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

- [ ] **Step 3: Verify**

Run: `grep -c NEXT_PUBLIC_STRIPE_PRO apps/web/.env.example`
Expected: `2`

- [ ] **Step 4: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/.env.example
git commit -m "chore(env): document pro annual public priceId"
```

- [ ] **Step 5: Set the production values in Railway (manual, not code)**

This is a config step, not a code step. In Railway dashboard → `tradeclaw` → `web` service → Variables, add:
- `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` (if not already set)
- `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID`

Use the same values that are already set for the non-public equivalents. The `NEXT_PUBLIC_` prefix is required for Next.js to expose them to client components.

Verification after deploy:
```bash
curl -s https://tradeclaw.win/pricing | grep -oE 'price_[A-Za-z0-9]+' | head -2
```
Expected: two `price_...` IDs returned.

---

### Task 2: Expose annual priceId from the stripe lib

**Files:**
- Modify: `apps/web/lib/stripe.ts`

- [ ] **Step 1: Extend `TierDefinition` with optional `monthlyPriceIdEnv` and `annualPriceIdEnv` keys**

Edit [apps/web/lib/stripe.ts](apps/web/lib/stripe.ts). Replace the existing `TierDefinition` interface:

```typescript
export interface TierDefinition {
  id: Tier;
  name: string;
  tagline: string;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
  features: string[];
  kind: 'free' | 'stripe' | 'contact';
  /** Name of the NEXT_PUBLIC_ env var holding the monthly priceId. Undefined for non-Stripe tiers. */
  monthlyPriceIdEnv?: string;
  /** Name of the NEXT_PUBLIC_ env var holding the annual priceId. Undefined for non-Stripe tiers. */
  annualPriceIdEnv?: string;
}
```

- [ ] **Step 2: Populate the new keys on the Pro tier**

In the same file, find the Pro entry in `TIER_DEFINITIONS` and add the two env keys:

```typescript
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Real-time premium signals with full analytics.',
    monthlyPriceLabel: '$29',
    annualPriceLabel: '$290/yr — save $58',
    kind: 'stripe',
    monthlyPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID',
    annualPriceIdEnv: 'NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID',
    features: [
      'All traded symbols',
      'Real-time signal delivery',
      'Premium high-confidence signals + MTF confluence',
      'TP1, TP2, TP3 + Stop Loss',
      'Private Pro Telegram group',
      'Full signal history + CSV export',
      '7-day free trial',
    ],
  },
```

- [ ] **Step 3: Add a resolver helper for cleaner imports**

Add at the bottom of `apps/web/lib/stripe.ts`:

```typescript
/**
 * Resolve the client-side priceId for a tier + billing interval.
 * Returns null if the tier isn't a Stripe tier or the env var isn't set.
 * Reads `process.env[<name>]` directly so Next.js inlines the NEXT_PUBLIC_ value at build time.
 */
export function getClientPriceId(
  def: TierDefinition,
  interval: 'monthly' | 'annual'
): string | null {
  const envName = interval === 'annual' ? def.annualPriceIdEnv : def.monthlyPriceIdEnv;
  if (!envName) return null;
  // Must reference NEXT_PUBLIC_ vars by literal name for Next.js to inline them.
  // So we cannot use `process.env[envName]` directly — we dispatch on the known names.
  const known: Record<string, string | undefined> = {
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  };
  return known[envName] ?? null;
}
```

- [ ] **Step 4: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -20`
Expected: build succeeds with no new TS errors. Warnings OK.

- [ ] **Step 5: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/lib/stripe.ts
git commit -m "feat(stripe): expose annual priceId on Pro tier definition"
```

---

### Task 3: Pricing page — direct checkout + monthly/annual toggle

**Files:**
- Modify: `apps/web/app/pricing/page.tsx` (strips client logic; stays server component)
- Create: `apps/web/app/pricing/PricingCards.tsx` (new client component)

- [ ] **Step 1: Write the failing E2E test first**

Create `apps/web/tests/e2e/pricing.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('pricing page', () => {
  test('renders both Free and Pro cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Stop renting your edge/i })).toBeVisible();
    await expect(page.getByText('Free', { exact: true })).toBeVisible();
    await expect(page.getByText('Pro', { exact: true })).toBeVisible();
  });

  test('monthly is selected by default', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Annual/i })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('pro-price-label')).toContainText('$29');
  });

  test('annual toggle swaps price label', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    await expect(page.getByRole('button', { name: /Annual/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('pro-price-label')).toContainText('$290');
  });

  test('Pro CTA posts to checkout for monthly priceId', async ({ page }) => {
    await page.goto('/pricing');
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(typeof body.priceId).toBe('string');
    expect(body.priceId.startsWith('price_')).toBe(true);
  });

  test('Pro CTA posts annual priceId after toggle', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: /Annual/i }).click();
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/stripe/checkout') && req.method() === 'POST'
    );
    await page.getByTestId('pro-cta').click();
    const req = await requestPromise;
    const monthlyBody = JSON.parse(req.postData() || '{}');
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;
    expect(monthlyBody.priceId).not.toBe(monthlyPriceId);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd apps/web && npm run test:e2e -- pricing.spec.ts 2>&1 | tail -30`
Expected: test failures — "Monthly" button doesn't exist yet, `pro-cta` testid missing, etc.

- [ ] **Step 3: Create the client component `PricingCards.tsx`**

Create `apps/web/app/pricing/PricingCards.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TIER_DEFINITIONS,
  getClientPriceId,
  type TierDefinition,
} from '../../lib/stripe';

type Interval = 'monthly' | 'annual';

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="inline-block text-emerald-400"
      aria-hidden="true"
    >
      <path
        d="M3 8l3.5 3.5L13 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface IntervalToggleProps {
  value: Interval;
  onChange: (next: Interval) => void;
}

function IntervalToggle({ value, onChange }: IntervalToggleProps) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="mx-auto mb-8 inline-flex rounded-full border border-[var(--border)] bg-[var(--glass-bg)] p-1"
    >
      <button
        type="button"
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          value === 'monthly'
            ? 'bg-[var(--foreground)] text-[var(--background)]'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        aria-pressed={value === 'annual'}
        onClick={() => onChange('annual')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          value === 'annual'
            ? 'bg-[var(--foreground)] text-[var(--background)]'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        Annual <span className="ml-1 text-xs text-emerald-400">— save 17%</span>
      </button>
    </div>
  );
}

interface ProCardProps {
  def: TierDefinition;
  interval: Interval;
}

function ProCard({ def, interval }: ProCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceId = getClientPriceId(def, interval);

  const priceLabel = interval === 'annual' ? def.annualPriceLabel : def.monthlyPriceLabel;
  const priceMain = interval === 'annual' ? '$290' : '$29';
  const priceSuffix = interval === 'annual' ? '/yr' : '/mo';
  const subtext = interval === 'annual' ? 'Save $58 vs monthly' : 'Billed monthly, cancel anytime';

  async function handleCheckout() {
    if (!priceId) {
      setError('Checkout is temporarily unavailable. Please email support@tradeclaw.win.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      if (res.status === 401) {
        const next = encodeURIComponent('/pricing');
        window.location.href = `/signin?next=${next}&priceId=${priceId}`;
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Checkout failed');
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) throw new Error('Missing checkout URL');
      window.location.href = payload.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-black">
          Most Popular
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {def.name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span
            data-testid="pro-price-label"
            className="text-4xl font-bold text-[var(--foreground)]"
          >
            {priceMain}
          </span>
          <span className="mb-1 text-sm text-[var(--text-secondary)]">{priceSuffix}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{priceLabel}</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{def.tagline}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtext}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {def.features.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
            <span className="mt-0.5 shrink-0 text-emerald-400">
              <CheckIcon />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <button
          type="button"
          data-testid="pro-cta"
          onClick={handleCheckout}
          disabled={loading}
          className="block w-full rounded-lg bg-emerald-500 py-2.5 text-center text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : 'Start 7-Day Trial'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-center text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface FreeCardProps {
  def: TierDefinition;
}

function FreeCard({ def }: FreeCardProps) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {def.name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-[var(--foreground)]">Free</span>
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{def.tagline}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {def.features.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
            <span className="mt-0.5 shrink-0 text-emerald-400">
              <CheckIcon />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link
          href="/dashboard"
          className="block w-full rounded-lg border border-[var(--border)] py-2.5 text-center text-sm font-semibold text-[var(--foreground)] transition-all hover:border-[var(--glass-border-accent)] hover:bg-[var(--glass-bg)]"
        >
          Start Free
        </Link>
      </div>
    </div>
  );
}

export function PricingCards() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const freeDef = TIER_DEFINITIONS.find((d) => d.id === 'free');
  const proDef = TIER_DEFINITIONS.find((d) => d.id === 'pro');
  if (!freeDef || !proDef) return null;

  return (
    <>
      <div className="text-center">
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <div className="mx-auto mt-2 grid max-w-3xl gap-6 sm:grid-cols-2">
        <FreeCard def={freeDef} />
        <ProCard def={proDef} interval={interval} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Simplify `apps/web/app/pricing/page.tsx` to use the new client component**

Replace the entire file contents of [apps/web/app/pricing/page.tsx](apps/web/app/pricing/page.tsx) with:

```typescript
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';
import { PricingCards } from './PricingCards';

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: Feature[] = [
  { label: 'Signal delivery', free: '15-min delay', pro: 'Real-time' },
  { label: 'Symbols covered', free: '3 symbols', pro: 'All traded symbols' },
  { label: 'Telegram group', free: '@tradeclawwin (public)', pro: 'Private Pro group' },
  { label: 'TP / SL levels', free: 'TP1 only', pro: 'TP1, TP2, TP3 + SL' },
  { label: 'Indicators', free: 'RSI, EMA', pro: 'Full suite + MTF confluence' },
  { label: 'Signal quality', free: 'Standard', pro: 'Premium high-confidence' },
  { label: 'Signal history', free: 'Last 24h', pro: 'Full history + CSV export' },
  { label: 'Support', free: 'Community', pro: 'Email (24h)' },
  { label: 'Free trial', free: false, pro: '7 days' },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block text-emerald-400" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline-block text-[var(--text-secondary)]" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function renderValue(val: string | boolean) {
  if (val === false) return <XIcon />;
  if (val === true) return <CheckIcon />;
  return <span className="text-sm text-[var(--foreground)]">{val}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Stop renting your edge.
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            Start free. Upgrade when you&apos;re ready for real-time signals, private groups, and full analytics.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards />
        </div>

        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
                  <th className="py-3 pl-6 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Free</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-emerald-400">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr key={feature.label} className={`border-b border-[var(--border)] ${i % 2 === 0 ? '' : 'bg-[var(--glass-bg)]'}`}>
                    <td className="py-3 pl-6 pr-4 font-medium text-[var(--foreground)]">{feature.label}</td>
                    <td className="px-4 py-3 text-center">{renderValue(feature.free)}</td>
                    <td className="px-4 py-3 text-center">{renderValue(feature.pro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">FAQ</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your billing dashboard and your access continues until the end of the billing period. No questions asked.',
              },
              {
                q: 'What happens after the free trial?',
                a: "You'll be charged automatically after 7 days. Cancel before the trial ends and you won't be charged.",
              },
              {
                q: 'How do I connect my Telegram?',
                a: 'Right after checkout, our Welcome screen gives you a one-tap deep link to our bot, which links your account and sends your group invite.',
              },
              {
                q: 'Is the code really open source?',
                a: 'Yes. TradeClaw is MIT-licensed on GitHub. You can self-host the entire framework. Pro is the hosted tier with real-time delivery, premium signals, and private Telegram access.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
                <p className="font-medium text-[var(--foreground)]">{q}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-xl text-center">
          <p className="text-[var(--text-secondary)]">
            Questions?{' '}
            <a href="https://t.me/tradeclawwin" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">
              Join our public Telegram
            </a>{' '}
            or{' '}
            <a href="mailto:support@tradeclaw.win" className="text-emerald-400 hover:underline">
              email support
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 6: Run the pricing E2E tests**

Run: `cd apps/web && npm run test:e2e -- pricing.spec.ts 2>&1 | tail -40`
Expected: all 5 tests pass. If the checkout request tests time out because the dev server's Stripe env isn't set, those two can be marked `.skip` locally and run in Railway preview — but the 3 rendering/toggle tests MUST pass.

- [ ] **Step 7: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/app/pricing/page.tsx apps/web/app/pricing/PricingCards.tsx apps/web/tests/e2e/pricing.spec.ts
git commit -m "feat(pricing): direct checkout with monthly/annual toggle"
```

---

### Task 4: Signin resume checkout after auth

**Files:**
- Modify: `apps/web/app/signin/page.tsx`

- [ ] **Step 1: Read the current signin page**

Run: `wc -l apps/web/app/signin/page.tsx`
Then Read the file. Note the current structure — is it a server or client component, what auth provider does it use, and how does it currently consume `priceId`?

- [ ] **Step 2: Identify the post-auth handler**

Grep for how `priceId` is currently used:
```
cd apps/web && grep -n "priceId" app/signin/page.tsx
```
Expected: some branch that handles `?priceId=...` from the query. Trace the call — typically after a successful auth it redirects somewhere.

- [ ] **Step 3: Add `next` param support and auto-checkout-resume**

After successful authentication, if BOTH `next` and `priceId` are present in the URL query:

1. Parse them from `URLSearchParams(window.location.search)`.
2. POST to `/api/stripe/checkout` with `{ priceId }`.
3. On `200` → redirect to `payload.url`.
4. On non-200 → redirect to `next` (fallback) with `?error=checkout_failed`.

Exact code depends on the signin page's current shape. Minimum diff: after the existing success handler, add:

```typescript
const params = new URLSearchParams(window.location.search);
const next = params.get('next');
const priceId = params.get('priceId');

if (next && priceId) {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    if (res.ok) {
      const payload = (await res.json()) as { url?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
    }
  } catch {
    // fall through to next
  }
  window.location.href = `${next}?error=checkout_failed`;
  return;
}
// existing redirect to /dashboard stays as the else branch
```

**Backwards-compat rule:** If only `priceId` is present (no `next`), preserve today's behavior — redirect to wherever `priceId`-only is currently handled (likely `/dashboard?priceId=...` or a synthesized checkout call). Do NOT change legacy behavior in this task.

- [ ] **Step 4: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke test**

Run dev server: `cd apps/web && npm run dev`

In a fresh browser, navigate to:
```
http://localhost:3000/signin?next=/pricing&priceId=price_test123
```
Sign in. Expected: request to `/api/stripe/checkout` fires; on 400 (invalid test priceId) you land on `/pricing?error=checkout_failed`.

- [ ] **Step 6: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/app/signin/page.tsx
git commit -m "feat(signin): resume stripe checkout after authentication"
```

---

### Task 5: Welcome onboarding route + success_url change

**Files:**
- Create: `apps/web/app/welcome/page.tsx`
- Create: `apps/web/app/welcome/WelcomeClient.tsx`
- Modify: `apps/web/app/api/stripe/checkout/route.ts`

- [ ] **Step 1: Write the failing E2E test**

Create `apps/web/tests/e2e/welcome.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('welcome onboarding', () => {
  test('redirects to signin when unauthenticated', async ({ page }) => {
    await page.goto('/welcome?session_id=cs_test_ignored');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('renders Step 1 Connect Telegram when authenticated (auth stubbed)', async ({ page, context }) => {
    // This test assumes a test-auth seam; if there isn't one, mark as fixme
    // and verify manually. The placeholder below is illustrative.
    test.fixme(true, 'Requires test-auth seam — see SMOKE.md');
    await page.goto('/welcome?session_id=cs_test_ignored');
    await expect(page.getByRole('heading', { name: /Welcome to Pro/i })).toBeVisible();
    await expect(page.getByTestId('connect-telegram-btn')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test — confirm the unauth redirect test fails**

Run: `cd apps/web && npm run test:e2e -- welcome.spec.ts 2>&1 | tail -20`
Expected: the unauth test fails with 404 (route doesn't exist yet).

- [ ] **Step 3: Create the server shell `app/welcome/page.tsx`**

```typescript
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readSessionFromCookieStore } from '../../lib/user-session';
import { getStripe } from '../../lib/stripe';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';
import { WelcomeClient } from './WelcomeClient';

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function WelcomePage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  const cookieStore = await cookies();
  const session = readSessionFromCookieStore(cookieStore);
  if (!session?.userId) {
    const next = `/welcome${session_id ? `?session_id=${encodeURIComponent(session_id)}` : ''}`;
    redirect(`/signin?next=${encodeURIComponent(next)}`);
  }

  let verified = false;
  if (session_id) {
    try {
      const stripe = getStripe();
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
      verified = checkoutSession.client_reference_id === session.userId;
    } catch {
      verified = false;
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Welcome to Pro</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)]">
              {verified ? "You're in. Let's finish setup." : 'Finish setting up your account.'}
            </h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              Two quick steps and your first live signal hits your Telegram.
            </p>
          </div>
          <div className="mt-10">
            <WelcomeClient userId={session.userId} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

Note: if `readSessionFromCookieStore` does not exist (only `readSessionFromRequest` does), add it as a thin helper in `apps/web/lib/user-session.ts`:

```typescript
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
// ... existing imports and SESSION_COOKIE_NAME ...

export function readSessionFromCookieStore(
  cookieStore: ReadonlyRequestCookies
): UserSession | null {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
```

Adjust the exact types/import path to match the existing session module.

- [ ] **Step 4: Create `app/welcome/WelcomeClient.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TelegramStatus {
  connected: boolean;
  deepLink?: string;
}

interface SignalPreview {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  createdAt: string;
}

interface ApiSignalsResponse {
  signals?: SignalPreview[];
}

interface WelcomeClientProps {
  userId: string;
}

export function WelcomeClient({ userId }: WelcomeClientProps) {
  const [tgConnected, setTgConnected] = useState(false);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [firstSignal, setFirstSignal] = useState<SignalPreview | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function pollTelegram() {
      while (!cancelled) {
        try {
          const res = await fetch('/api/telegram/status', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as TelegramStatus;
            if (!cancelled) {
              setTgConnected(data.connected);
              if (data.deepLink) setTgLink(data.deepLink);
              if (data.connected) return;
            }
          }
        } catch {
          // ignore, retry
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    pollTelegram();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!tgConnected) return;
    let cancelled = false;

    async function pollSignal() {
      while (!cancelled) {
        try {
          const res = await fetch('/api/signals?limit=1', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as ApiSignalsResponse;
            const first = data.signals?.[0];
            if (first && !cancelled) {
              setFirstSignal(first);
              return;
            }
          }
        } catch {
          // ignore, retry
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    pollSignal();
    return () => {
      cancelled = true;
    };
  }, [tgConnected]);

  return (
    <div className="flex flex-col gap-4">
      <StepCard
        index={1}
        title="Connect Telegram"
        done={tgConnected}
        description={
          tgConnected
            ? 'Connected. Private Pro group invite sent.'
            : 'Tap the button to link your Telegram account. You will be invited to the private Pro group.'
        }
      >
        {!tgConnected && (
          <a
            href={tgLink ?? 'https://t.me/tradeclawwin_bot?start=pro'}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="connect-telegram-btn"
            className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Open Telegram bot
          </a>
        )}
      </StepCard>

      <StepCard
        index={2}
        title="Your first live signal"
        done={!!firstSignal}
        description={
          tgConnected
            ? firstSignal
              ? 'Here it is. Same format hits your Telegram in real time.'
              : 'Waiting for the next live signal…'
            : 'Complete Step 1 first.'
        }
      >
        {firstSignal && <SignalPreviewCard signal={firstSignal} />}
      </StepCard>

      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] underline">
          Skip to dashboard
        </Link>
      </div>
    </div>
  );
}

interface StepCardProps {
  index: number;
  title: string;
  description: string;
  done: boolean;
  children?: React.ReactNode;
}

function StepCard({ index, title, description, done, children }: StepCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        done
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-[var(--border)] bg-[var(--glass-bg)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? 'bg-emerald-500 text-black' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
          }`}
        >
          {done ? '✓' : index}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function SignalPreviewCard({ signal }: { signal: SignalPreview }) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{signal.symbol}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            signal.side === 'BUY' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
          }`}
        >
          {signal.side}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
        <dt className="text-[var(--text-secondary)]">Entry</dt>
        <dd className="text-right font-mono">{signal.entry}</dd>
        <dt className="text-[var(--text-secondary)]">TP1</dt>
        <dd className="text-right font-mono">{signal.tp1}</dd>
        {signal.tp2 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP2</dt>
            <dd className="text-right font-mono">{signal.tp2}</dd>
          </>
        )}
        {signal.tp3 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP3</dt>
            <dd className="text-right font-mono">{signal.tp3}</dd>
          </>
        )}
        {signal.sl !== undefined && (
          <>
            <dt className="text-red-400">SL</dt>
            <dd className="text-right font-mono text-red-400">{signal.sl}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
```

- [ ] **Step 5: Change Stripe `success_url` to `/welcome`**

Edit [apps/web/app/api/stripe/checkout/route.ts](apps/web/app/api/stripe/checkout/route.ts) line 53. Replace:

```typescript
success_url: `${BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
```

With:

```typescript
success_url: `${BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
```

Leave `cancel_url` as `/pricing`.

- [ ] **Step 6: Verify `/api/telegram/status` response shape matches the client's expectation**

Run:
```
cd apps/web && grep -n "export async function GET\|return NextResponse" app/api/telegram/status/route.ts
```

Confirm the response has `connected: boolean` and optionally `deepLink: string`. If not, EITHER update the route to match OR update `TelegramStatus` in `WelcomeClient.tsx` to match the actual shape. Do not leave them out of sync.

- [ ] **Step 7: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 8: Run welcome E2E**

Run: `cd apps/web && npm run test:e2e -- welcome.spec.ts 2>&1 | tail -20`
Expected: unauth-redirect test passes. The auth-required test is marked `fixme` — that's expected.

- [ ] **Step 9: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/app/welcome apps/web/app/api/stripe/checkout/route.ts apps/web/tests/e2e/welcome.spec.ts apps/web/lib/user-session.ts
git commit -m "feat(onboarding): post-checkout welcome with telegram + first-signal steps"
```

---

## Phase 1 — Ship checkpoint

Before starting Phase 2:

- [ ] Deploy Phase 1 to Railway: `git push origin main && railway up --detach`
- [ ] Manual smoke on production:
  - `/pricing` renders, toggle flips label
  - Anonymous Pro-CTA click → signs in → resumes checkout
  - Authenticated Pro-CTA click → goes directly to Stripe
  - After test checkout → lands on `/welcome` with Telegram step visible
- [ ] Leave Phase 1 live for at least 48h to measure conversion before touching the landing page.

---

## Phase 2 — Proof (Tasks 6–9)

### Task 6: Schema check + landing stats endpoint

**Files:**
- Create: `apps/web/app/api/stats/landing/route.ts`
- Conditional: `apps/web/migrations/018_signal_pnl_backfill.sql` (only if `signal_history` lacks a P&L column)

- [ ] **Step 1: Inspect `signal_history` schema**

Run:
```bash
psql "$DATABASE_URL" -c "\d signal_history" 2>&1 | head -40
```
Also run:
```bash
cd apps/web && grep -n "signal_history" lib/signal-history.ts lib/tracked-signals.ts 2>/dev/null | head -20
```

Write down:
- The column that identifies closed signals (e.g., `status`, `tp_hit`, `sl_hit`)
- The column for P&L (if any) — look for `realized_pnl`, `pnl`, `pnl_pct`
- Columns for entry/exit price + side + quantity (for deriving P&L if no column exists)

- [ ] **Step 2: If P&L column exists → skip to Step 3. If not → write migration**

Only if `signal_history` has no `realized_pnl` or equivalent:

Create `apps/web/migrations/018_signal_pnl_backfill.sql`:

```sql
-- Adds computed realized P&L to closed signals.
-- Safe to re-run: adds column IF NOT EXISTS, backfills NULLs only.

ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC;

-- Backfill for closed signals. Adjust the WHERE clause to match the actual
-- "closed" status column discovered in Step 1.
UPDATE signal_history
SET realized_pnl = CASE
  WHEN side = 'BUY'  THEN (exit_price - entry_price)
  WHEN side = 'SELL' THEN (entry_price - exit_price)
  ELSE 0
END
WHERE realized_pnl IS NULL
  AND exit_price IS NOT NULL
  AND entry_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS signal_history_closed_at_idx
  ON signal_history (closed_at DESC)
  WHERE realized_pnl IS NOT NULL;
```

Run it:
```bash
psql "$DATABASE_URL" -f apps/web/migrations/018_signal_pnl_backfill.sql
```

Then verify:
```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM signal_history WHERE realized_pnl IS NOT NULL;"
```
Expected: non-zero count.

- [ ] **Step 3: Write a tiny smoke test first**

Create `apps/web/tests/e2e/stats-landing.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('/api/stats/landing', () => {
  test('returns expected shape', async ({ request }) => {
    const res = await request.get('/api/stats/landing');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('signalsToday');
    expect(typeof body.signalsToday).toBe('number');
    expect(body).toHaveProperty('netPnl');
    expect(body).toHaveProperty('profitFactor');
    expect(body).toHaveProperty('samples');
  });
});
```

- [ ] **Step 4: Run the test — confirm 404**

Run: `cd apps/web && npm run test:e2e -- stats-landing.spec.ts 2>&1 | tail -15`
Expected: fails with 404.

- [ ] **Step 5: Implement the endpoint**

Create `apps/web/app/api/stats/landing/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export const revalidate = 60;

interface SignalPayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  createdAt: string;
}

interface LandingStats {
  netPnl: number;
  profitFactor: number;
  signalsToday: number;
  closedSignals30d: number;
  latestSignal: SignalPayload | null;
  samples: {
    free: SignalPayload;
    pro: SignalPayload;
  } | null;
}

export async function GET() {
  try {
    // 30-day aggregates over CLOSED signals only.
    // Adjust column names to match the schema discovered in Task 6 Step 1.
    const aggRes = await query<{
      net_pnl: string | null;
      gross_wins: string | null;
      gross_losses: string | null;
      closed_count: string;
    }>(
      `SELECT
         COALESCE(SUM(realized_pnl), 0)::text AS net_pnl,
         COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN realized_pnl END), 0)::text AS gross_wins,
         COALESCE(ABS(SUM(CASE WHEN realized_pnl < 0 THEN realized_pnl END)), 0)::text AS gross_losses,
         COUNT(*)::text AS closed_count
       FROM signal_history
       WHERE realized_pnl IS NOT NULL
         AND created_at >= NOW() - INTERVAL '30 days'`
    );
    const agg = aggRes.rows[0];
    const netPnl = Number(agg?.net_pnl ?? 0);
    const grossWins = Number(agg?.gross_wins ?? 0);
    const grossLosses = Number(agg?.gross_losses ?? 0);
    const closedCount = Number(agg?.closed_count ?? 0);
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0;

    const todayRes = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c
         FROM signal_history
        WHERE created_at >= date_trunc('day', NOW())`
    );
    const signalsToday = Number(todayRes.rows[0]?.c ?? 0);

    const latestRes = await query<{
      symbol: string;
      side: 'BUY' | 'SELL';
      entry_price: string | number;
      tp1: string | number | null;
      tp2: string | number | null;
      tp3: string | number | null;
      sl: string | number | null;
      created_at: string;
    }>(
      `SELECT symbol, side, entry_price, tp1, tp2, tp3, sl, created_at
         FROM signal_history
        ORDER BY created_at DESC
        LIMIT 1`
    );
    const latestRow = latestRes.rows[0];
    const latestSignal: SignalPayload | null = latestRow
      ? {
          symbol: latestRow.symbol,
          side: latestRow.side,
          entry: Number(latestRow.entry_price),
          tp1: Number(latestRow.tp1 ?? 0),
          tp2: latestRow.tp2 != null ? Number(latestRow.tp2) : undefined,
          tp3: latestRow.tp3 != null ? Number(latestRow.tp3) : undefined,
          sl: latestRow.sl != null ? Number(latestRow.sl) : undefined,
          createdAt: new Date(latestRow.created_at).toISOString(),
        }
      : null;

    const samples = latestSignal
      ? {
          free: {
            symbol: latestSignal.symbol,
            side: latestSignal.side,
            entry: latestSignal.entry,
            tp1: latestSignal.tp1,
            createdAt: new Date(new Date(latestSignal.createdAt).getTime() + 15 * 60 * 1000).toISOString(),
          },
          pro: latestSignal,
        }
      : null;

    const stats: LandingStats = {
      netPnl,
      profitFactor,
      signalsToday,
      closedSignals30d: closedCount,
      latestSignal,
      samples,
    };

    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

Note: if `lib/db.ts` doesn't export a `query` helper with this shape, adapt to whatever helper it does export (e.g., `pool.query`). Do not add a new DB wrapper if one exists — reuse the existing pattern from other routes like `api/signals/equity/route.ts`.

- [ ] **Step 6: Verify test passes**

Run: `cd apps/web && npm run dev` in one terminal. In another:
```bash
curl -s http://localhost:3000/api/stats/landing | head -40
```
Expected: JSON matching the `LandingStats` shape.

Then:
```bash
cd apps/web && npm run test:e2e -- stats-landing.spec.ts 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 7: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 8: Commit**

If migration was needed:
```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/migrations/018_signal_pnl_backfill.sql
git commit -m "feat(db): realized_pnl column for landing stats"
```

Then the endpoint:
```bash
git add apps/web/app/api/stats/landing/route.ts apps/web/tests/e2e/stats-landing.spec.ts
git commit -m "feat(api): landing stats endpoint with 30d proof metrics"
```

---

### Task 7: `SampleTelegramCard` component (shared leaf)

**Files:**
- Create: `apps/web/components/landing/sample-telegram-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
interface SampleTelegramCardProps {
  tier: 'free' | 'pro';
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  timestampLabel: string;
  delayLabel?: string;
}

export function SampleTelegramCard(props: SampleTelegramCardProps) {
  const { tier, symbol, side, entry, tp1, tp2, tp3, sl, timestampLabel, delayLabel } = props;
  const isPro = tier === 'pro';

  return (
    <div
      className={`rounded-2xl border p-4 font-mono text-sm ${
        isPro ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--glass-bg)]'
      }`}
    >
      <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest">
        <span className={isPro ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
          {isPro ? 'Pro · Real-time' : 'Free · 15-min delay'}
        </span>
        <span className="text-[var(--text-secondary)]">{timestampLabel}</span>
      </header>

      {delayLabel && !isPro && (
        <p className="mb-2 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">{delayLabel}</p>
      )}

      <p className="text-base font-semibold text-[var(--foreground)]">
        {symbol} — <span className={side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{side}</span>
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-[var(--text-secondary)]">Entry</dt>
        <dd className="text-right text-[var(--foreground)]">{entry}</dd>
        <dt className="text-[var(--text-secondary)]">TP1</dt>
        <dd className="text-right text-[var(--foreground)]">{tp1}</dd>
        {isPro && tp2 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP2</dt>
            <dd className="text-right text-[var(--foreground)]">{tp2}</dd>
          </>
        )}
        {isPro && tp3 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP3</dt>
            <dd className="text-right text-[var(--foreground)]">{tp3}</dd>
          </>
        )}
        {isPro && sl !== undefined && (
          <>
            <dt className="text-red-400">SL</dt>
            <dd className="text-right text-red-400">{sl}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/components/landing/sample-telegram-card.tsx
git commit -m "feat(landing): sample telegram card component"
```

---

### Task 8: `DelayDemo` component

**Files:**
- Create: `apps/web/components/landing/delay-demo.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { SampleTelegramCard } from './sample-telegram-card';

interface DelayDemoSignal {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  createdAt: string;
}

interface DelayDemoProps {
  pro: DelayDemoSignal;
  free: DelayDemoSignal;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function DelayDemo({ pro, free }: DelayDemoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SampleTelegramCard
        tier="pro"
        symbol={pro.symbol}
        side={pro.side}
        entry={pro.entry}
        tp1={pro.tp1}
        tp2={pro.tp2}
        tp3={pro.tp3}
        sl={pro.sl}
        timestampLabel={formatClock(pro.createdAt)}
      />
      <SampleTelegramCard
        tier="free"
        symbol={free.symbol}
        side={free.side}
        entry={free.entry}
        tp1={free.tp1}
        timestampLabel={formatClock(free.createdAt)}
        delayLabel="Delivered 15 minutes after the Pro alert"
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/components/landing/delay-demo.tsx
git commit -m "feat(landing): side-by-side real-time vs 15-min delay demo"
```

---

### Task 9: `ProofHero` + landing swap

**Files:**
- Create: `apps/web/components/landing/proof-hero.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Write the failing landing E2E**

Create `apps/web/tests/e2e/landing-proof.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('landing proof hero', () => {
  test('shows delivery lag tile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('proof-hero')).toBeVisible();
    await expect(page.getByText(/Pro: <1s/i)).toBeVisible();
    await expect(page.getByText(/Free: 15min/i)).toBeVisible();
  });

  test('does NOT show a standalone win-rate percentage in hero', async ({ page }) => {
    await page.goto('/');
    const heroText = (await page.getByTestId('proof-hero').textContent()) ?? '';
    expect(heroText).not.toMatch(/\d+%\s*Win Rate/i);
  });

  test('shows delay demo with Pro and Free columns', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Pro · Real-time/i)).toBeVisible();
    await expect(page.getByText(/Free · 15-min delay/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests — confirm failures**

Run: `cd apps/web && npm run test:e2e -- landing-proof.spec.ts 2>&1 | tail -20`
Expected: all 3 tests fail (component doesn't exist, win-rate text still in hero).

- [ ] **Step 3: Create `components/landing/proof-hero.tsx`**

```typescript
import { DelayDemo } from './delay-demo';
import { SampleTelegramCard } from './sample-telegram-card';

const MIN_CLOSED_SIGNALS_FOR_PF = 10;

interface SignalPayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  createdAt: string;
}

interface LandingStats {
  netPnl: number;
  profitFactor: number;
  signalsToday: number;
  closedSignals30d: number;
  latestSignal: SignalPayload | null;
  samples: { free: SignalPayload; pro: SignalPayload } | null;
}

async function fetchStats(): Promise<LandingStats | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/stats/landing`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as LandingStats;
  } catch {
    return null;
  }
}

function formatMoney(n: number): string {
  const sign = n >= 0 ? '+' : '-';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export async function ProofHero() {
  const stats = await fetchStats();
  const hasEnoughClosed = stats != null && stats.closedSignals30d >= MIN_CLOSED_SIGNALS_FOR_PF;

  return (
    <section
      data-testid="proof-hero"
      className="mx-auto mt-10 max-w-5xl px-4"
    >
      <div className="mb-6 text-center">
        <p className="text-lg text-[var(--text-secondary)]">
          Real-time signals, backed by the last 30 days of live performance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {hasEnoughClosed && stats && (
          <StatTile
            label="Net P&L (30d)"
            value={formatMoney(stats.netPnl)}
            tone={stats.netPnl >= 0 ? 'positive' : 'negative'}
          />
        )}
        {hasEnoughClosed && stats && (
          <StatTile
            label="Profit factor"
            value={stats.profitFactor.toFixed(2)}
            tone={stats.profitFactor >= 1.3 ? 'positive' : 'neutral'}
          />
        )}
        <StatTile
          label="Signals today"
          value={String(stats?.signalsToday ?? 0)}
          tone="neutral"
        />
        <StatTile label="Delivery lag" value="Pro: <1s · Free: 15min" tone="neutral" small />
      </div>

      {stats?.samples && (
        <div className="mt-10">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Real-time vs 15-min delay
          </h2>
          <DelayDemo pro={stats.samples.pro} free={stats.samples.free} />
        </div>
      )}

      {stats?.samples && (
        <div className="mt-10">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            This is exactly what lands in your Telegram
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <SampleTelegramCard
              tier="free"
              symbol={stats.samples.free.symbol}
              side={stats.samples.free.side}
              entry={stats.samples.free.entry}
              tp1={stats.samples.free.tp1}
              timestampLabel={new Date(stats.samples.free.createdAt).toUTCString()}
              delayLabel="Delivered 15 minutes after Pro"
            />
            <SampleTelegramCard
              tier="pro"
              symbol={stats.samples.pro.symbol}
              side={stats.samples.pro.side}
              entry={stats.samples.pro.entry}
              tp1={stats.samples.pro.tp1}
              tp2={stats.samples.pro.tp2}
              tp3={stats.samples.pro.tp3}
              sl={stats.samples.pro.sl}
              timestampLabel={new Date(stats.samples.pro.createdAt).toUTCString()}
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
  small?: boolean;
}

function StatTile({ label, value, tone, small }: StatTileProps) {
  const color =
    tone === 'positive' ? 'text-emerald-400'
    : tone === 'negative' ? 'text-red-400'
    : 'text-[var(--foreground)]';
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
        {label}
      </p>
      <p className={`mt-2 font-bold ${color} ${small ? 'text-sm' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Swap the landing page hero**

Edit [apps/web/app/page.tsx](apps/web/app/page.tsx). Replace the current contents with:

```typescript
import { Navbar } from "./components/navbar";
import { ABHero } from "../components/landing/ab-hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { SiteFooter } from "../components/landing/site-footer";
import { LiveDemoEmbed } from "../components/landing/live-demo-embed";
import { LiveHeroSignals } from "../components/landing/live-hero-signals";
import { LiveActivityStrip } from "../components/landing/live-activity-strip";
import { ProofHero } from "../components/landing/proof-hero";
import { EmailCTA } from "../components/landing/email-cta";
import { BackgroundDecor } from "../components/background/BackgroundDecor";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <div className="relative isolate overflow-hidden">
          <BackgroundDecor variant="hero" />
          <ABHero />
        </div>
        <LiveHeroSignals />
        <ProofHero />
        <LiveActivityStrip />
        <LiveDemoEmbed />
        <HowItWorks />
        <EmailCTA />
        <FAQAccordion />
      </main>
      <SiteFooter />
    </>
  );
}
```

The changes are exactly:
1. Removed the `AccuracyStatsBar` import.
2. Removed the `<div className="max-w-5xl mx-auto px-4 py-4"><AccuracyStatsBar inline /></div>` wrapper.
3. Added `import { ProofHero } from "../components/landing/proof-hero"`.
4. Added `<ProofHero />` between `LiveHeroSignals` and `LiveActivityStrip`.

- [ ] **Step 5: Grep for residual win-rate-only hero copy in `ABHero`**

Run:
```
cd apps/web && grep -nEi "win.?rate|\\b[0-9]+% win|accuracy" components/landing/ab-hero.tsx | head -10
```

If any matches lead a top-of-hero headline or tile with a bare percentage, rewrite to proof-weighted copy (e.g., "Real-time signals, measured for 30 days live" instead of "87% Win Rate"). Leave lower-on-page mentions (FAQ, social proof) alone.

Commit the ABHero change separately if any edits are made, with message `chore(landing): remove standalone win-rate headline from ABHero`.

- [ ] **Step 6: Type-check**

Run: `cd apps/web && npm run build 2>&1 | tail -20`
Expected: build succeeds. Any unused import (`AccuracyStatsBar`) removed.

- [ ] **Step 7: Run landing E2E**

Run: `cd apps/web && npm run test:e2e -- landing-proof.spec.ts 2>&1 | tail -20`
Expected: all 3 tests pass.

- [ ] **Step 8: Lighthouse sanity check (manual)**

```bash
cd apps/web && npm run build && npm run start
# in another terminal:
npx lighthouse http://localhost:3000 --only-categories=performance --output=json --quiet --chrome-flags='--headless' | jq '.categories.performance.score, .audits["largest-contentful-paint"].numericValue'
```
Compare LCP against pre-change baseline. If regression > 100ms, investigate (likely the stats `fetch` blocking render — move to `loading.tsx` pattern or drop `revalidate` in favor of client fetch).

- [ ] **Step 9: Commit**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add apps/web/components/landing/proof-hero.tsx apps/web/app/page.tsx apps/web/tests/e2e/landing-proof.spec.ts
git commit -m "feat(landing): proof hero replacing win-rate-only stats bar"
```

---

## Phase 2 — Ship checkpoint

- [ ] Deploy: `git push origin main && railway up --detach` from repo root.
- [ ] Manual smoke:
  - `curl -s https://tradeclaw.win/api/stats/landing | jq .signalsToday` returns a number.
  - `/` renders ProofHero between LiveHeroSignals and LiveActivityStrip.
  - No "Win Rate %" tile in the hero anymore.
  - Delay demo shows two cards with different timestamps.
- [ ] Leave live for 48h, watch conversion + bounce rate on `/`.

---

## Out of scope (per design doc)

- Elite tier on `/pricing`
- Alpha Screener on `tradeclaw.win`
- Multi-step onboarding beyond Telegram + first signal
- External caching (Redis/Upstash) for stats
- Per-user equity curve on landing
- Changes to `signal-generator.ts` or `ta-engine.ts`

## Verification cheatsheet

```bash
# Phase 1
curl -I https://tradeclaw.win/pricing
curl -s https://tradeclaw.win/pricing | grep -oE 'price_[A-Za-z0-9]+' | head -2

# Phase 2
curl -s https://tradeclaw.win/api/stats/landing | jq .
psql "$DATABASE_URL" -c "SELECT count(*) FROM signal_history WHERE created_at > now() - interval '30 days'"
```
