# Paid Funnel Fix + Proof Rework — Design

**Date:** 2026-04-20
**Owner:** Zaky
**Status:** Design approved — awaiting implementation plan
**Scope domain:** `tradeclaw.win` (the `web` service in this monorepo)

## Context and decision

TradeClaw has two potential paid narratives:
- **Story A:** TradeClaw Free + TradeClaw Pro on the same domain (`tradeclaw.win`)
- **Story B:** TradeClaw OSS (this repo) + Alpha Screener as a separate hosted paid product

We are committing to **Story A**. Alpha Screener stays out of this repo's pricing, landing, and dashboard. No cross-links from `tradeclaw.win` to Alpha Screener in this scope.

Rationale: the repo already implements Story A (`/pricing` ships Free + Pro; `/api/stripe/checkout` exists; `lib/stripe.ts` maps priceIds to tiers). Running both narratives simultaneously dilutes the message and forces duplicate funnel work.

## Problems this design solves

**Funnel is broken today:**
1. `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` resolves to `''` in production, so the Pro CTA degrades to `/signin` with no priceId.
2. Pricing CTA is a `<Link>` to `/signin?priceId=...`, not a direct POST to `/api/stripe/checkout`. Extra bounce page, lost conversions.
3. No monthly/annual toggle. Annual is mentioned as a callout but cannot be selected.
4. Post-checkout `success_url` dumps users into the generic `/dashboard` with no onboarding — no Telegram connect prompt, no "first live signal" moment.

**Proof surface is weak:**
- Current landing leads with generic proof. Nothing on the landing components surfaces `winRate`, `profitFactor`, or `netPnl` (grep confirms zero matches).
- "Real-time vs 15-minute delay" is the strongest differentiator but is stated in a table, not shown visually.
- No rendered sample Telegram alerts — users can't see what they're actually buying.
- No live-today signal count, so the product feels dead to a first-time visitor.

## Design

Two phases. Phase 1 ships first and is measurable on its own.

---

### Phase 1 — Funnel

#### 1.1 Production Stripe priceIds

Add to Railway `web` service env:

| Key | Notes |
|---|---|
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Server-side; already referenced in `lib/stripe.ts` |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Server-side; already referenced |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` | Client-side; currently unset → CTA degrades |
| `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID` | New — needed for annual toggle |

Document them in `.env.example`.

Verification: `curl https://tradeclaw.win/pricing` → HTML contains a non-empty priceId referenced by the Pro CTA payload.

#### 1.2 Direct checkout from `/pricing`

Convert the Pro card in `app/pricing/page.tsx` to a client component. The Pro CTA becomes a `<button>` that:

1. Reads the current monthly/annual toggle → picks the matching priceId.
2. `fetch('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ priceId }) })`.
3. On `200` → `window.location = json.url` (Stripe hosted checkout).
4. On `401` → `window.location = /signin?next=/pricing&priceId=${priceId}`.

Signin page (`app/signin/page.tsx`) extended to accept `next` and `priceId`. On successful auth, if both are present it auto-POSTs to `/api/stripe/checkout` before any redirect.

Free CTA stays a `<Link>` to `/dashboard`. No Stripe call for Free.

#### 1.3 Monthly/annual toggle

Single `useState<'monthly' | 'annual'>('monthly')` at the pricing-cards parent (must be client). Pill toggle rendered above the cards: `Monthly | Annual — save 17%`.

Toggle swaps:
- Price label on the Pro card (`$29/mo` vs `$290/yr — save $58`)
- `priceId` sent by the Pro CTA
- Subtext under price

Free card unaffected by the toggle.

#### 1.4 Post-checkout onboarding at `/welcome`

New route `app/welcome/page.tsx` (server component shell) + `app/welcome/WelcomeClient.tsx` (client logic).

Flow:
- Auth-gated. Reads `session_id` from query string.
- Verifies the Stripe session belongs to the current user via Stripe API (prevents guessable session_id takeover).
- Two-step layout:
  - **Step 1 — Connect Telegram.** Single large button reusing the existing deep-link flow. Polls `GET /api/telegram/status` every 3s; when connected, step auto-flips to green check and Step 2 reveals.
  - **Step 2 — Your first live signal.** Polls `GET /api/signals?limit=1` (scoped to user's tier and symbols) every 5s until the first real-time signal fires. Renders it in the same card format used in the Pro Telegram group.

Stripe checkout `success_url` changes from `/dashboard?session_id=...` to `/welcome?session_id=...` in `api/stripe/checkout/route.ts`.

#### Phase 1 files

Expected 6–8 files across 3–4 commits:

- `apps/web/app/pricing/page.tsx` — split into server shell + client cards + toggle
- `apps/web/lib/stripe.ts` — expose annual priceId on `TierDefinition` or via helper
- `apps/web/app/api/stripe/checkout/route.ts` — change `success_url`
- `apps/web/app/signin/page.tsx` — accept `next` + auto-resume checkout
- New: `apps/web/app/welcome/page.tsx`
- New: `apps/web/app/welcome/WelcomeClient.tsx`
- `apps/web/.env.example` — document new public priceIds

Commit plan (respecting one-concern rule + 15-file commit cap):
1. `chore(env): document pro annual public priceId`
2. `feat(pricing): direct checkout with annual toggle`
3. `feat(signin): resume checkout after auth`
4. `feat(onboarding): post-checkout welcome route`

#### Phase 1 success criteria

- [ ] From `/pricing`, an unauthenticated user clicking **Start 7-Day Trial** on Pro (annual) reaches Stripe Checkout in ≤2 clicks.
- [ ] From `/pricing`, an authenticated user clicking the same reaches Stripe Checkout in 1 click.
- [ ] Toggle switches priceId actually sent to `/api/stripe/checkout` (verified in Stripe logs).
- [ ] After successful checkout, user lands on `/welcome?session_id=...` and sees the Telegram connect step, not the generic dashboard.
- [ ] Telegram poll flips to green within 10s of the user tapping the bot.

---

### Phase 2 — Proof

#### 2.1 `ProofHero` component (new landing hero)

The live hero stack on `app/page.tsx` today (top to bottom):
1. `ABHero` (453 lines)
2. `LiveHeroSignals` (167 lines)
3. `AccuracyStatsBar` (198 lines) — **this is what leads with "Win Rate %"** and is the specific thing to replace
4. `LiveActivityStrip` (97 lines)

`ProofHero` replaces `AccuracyStatsBar` entirely. `ABHero`, `LiveHeroSignals`, and `LiveActivityStrip` stay — they serve different purposes (headline, ticker, social activity). The win-rate-only stats tile goes away.

Structure:

**Top line (hook):**
> "Real-time signals, backed by the last 30 days of live performance."

**Stats band — four tiles (row on desktop, 2×2 on mobile):**
1. **Net P&L (30d)** — `+$X,XXX` from closed signals. Color green/red.
2. **Profit factor** — `1.XX` (gross wins / gross losses). Green if ≥ 1.3.
3. **Signals today** — live counter, auto-refresh every 30s.
4. **Delivery lag** — static label: `Pro: <1s · Free: 15min`. Anchors to delay demo below.

All four values come from the server render — no spinners on first paint.

**Delay demo block:**
Two side-by-side cards rendering the same recent signal with different timestamps:
- Left card: `PRO · 10:00:03 UTC` — full payload, green accent.
- Right card: `FREE · 10:15:03 UTC` — stamped "15-min delayed", TP1 only.
Timestamps cycle every 30s as newer signals arrive.

**Sample Telegram alerts block:**
Two rendered Telegram-style cards (not screenshots). One free-tier payload, one pro-tier payload, rendered from real data. Label: "This is exactly what lands in your Telegram."

#### 2.2 Stats endpoint

New route: `apps/web/app/api/stats/landing/route.ts`.

Reads from the `signal_history` Postgres table (the live production signal table per the workspace CLAUDE.md). Returns:

```ts
{
  netPnl: number;           // sum of realized_pnl over closed signals in last 30d
  profitFactor: number;     // sum(wins) / abs(sum(losses)), same window
  signalsToday: number;     // count where created_at >= date_trunc('day', now())
  latestSignal: {           // most recent signal still in its validity window
    symbol: string;
    side: 'BUY' | 'SELL';
    entry: number;
    tp1: number; tp2: number; tp3: number;
    sl: number;
    createdAt: string;      // ISO
  } | null;
  samples: {
    free: SignalPayload;    // TP1 only, no SL, 15-min timestamp offset applied
    pro:  SignalPayload;    // full payload, real timestamp
  } | null;
}
```

Caching: `export const revalidate = 60` on the route (Next.js built-in ISR for route handlers). No external cache at this stage.

**Schema check required during implementation.** Before writing the query, confirm `signal_history` has:
- A P&L column (or derivable from `entry`, `exit_price`, `side`, and `quantity`)
- A status column that identifies closed signals (e.g., `tp_hit`, `sl_hit`, `expired`)

If P&L is not present, Phase 2 adds a thin migration. Do not fake numbers — if data is missing, the relevant tile hides (see empty-state rule below).

#### 2.3 Empty-state rule

If the 30-day window has fewer than 10 closed signals (cold start, DB outage, new preset rollout), `ProofHero` falls back:
- Hides **Net P&L** and **Profit factor** tiles (don't render; don't fake)
- Keeps **Signals today**, **Delivery lag**, delay demo, and sample cards
- No "Coming soon" copy — just render less

#### 2.4 What stays vs. goes

- **Keep:** `social-proof.tsx`, `comparison-table.tsx`, `ABHero`, `LiveHeroSignals`, `LiveActivityStrip` — they keep their roles.
- **Remove:** `app/components/accuracy-stats-bar.tsx` from the landing page. The component file may stay for reuse elsewhere (e.g., dashboard), but the `<AccuracyStatsBar inline />` render in `app/page.tsx` is deleted.
- **Also check:** `ABHero` for any win-rate-only copy in its headline/subtext. If present, replace with proof-weighted copy that doesn't lead with a percentage.

#### Phase 2 files

Expected 4–6 files across 2–3 commits:

- New: `apps/web/components/landing/proof-hero.tsx`
- New: `apps/web/components/landing/delay-demo.tsx`
- New: `apps/web/components/landing/sample-telegram-card.tsx`
- New: `apps/web/app/api/stats/landing/route.ts`
- `apps/web/app/page.tsx` — swap hero
- Optional: migration if `signal_history` is missing a P&L column

Commit plan:
1. `feat(api): landing stats endpoint with 30d proof metrics`
2. `feat(landing): proof hero with net pnl, profit factor, delay demo`
3. `chore(landing): remove stale win-rate-only proof`

#### Phase 2 success criteria

- [ ] `GET /api/stats/landing` returns all fields + sample payloads in <300ms (warm cache).
- [ ] `ProofHero` renders fully server-side on first paint — no CLS.
- [ ] Delay demo visibly cycles timestamps every 30s.
- [ ] No hardcoded or placeholder numbers anywhere in `proof-hero.tsx`.
- [ ] Lighthouse LCP on `/` does not regress by more than 100ms vs. current baseline.
- [ ] No remaining "win rate alone" claim in landing components (grep is clean).

---

## Out of scope (explicitly deferred)

These are tempting but not part of this scope. Log in project CLAUDE.md if pursued later:

- Elite tier on `/pricing` (card, priceId, tier gating). `TIER_LEVEL.elite` exists in `lib/stripe.ts` but no card is shown today — leave it.
- Alpha Screener surfacing on `tradeclaw.win` of any kind.
- Multi-step onboarding wizard beyond Telegram + first-signal.
- External caching (Redis, Upstash) for the stats endpoint. `revalidate = 60` is enough until traffic demands more.
- Per-user backtest equity curve on the landing page.
- Changing the signal generation engine (`signal-generator.ts`, `ta-engine.ts`) — this scope is **funnel + proof surface only**.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `signal_history` P&L column missing → Phase 2 stats blocked | Add a small migration in Phase 2; empty-state rule keeps the hero shippable even if P&L is still backfilling |
| `success_url` change breaks existing users mid-checkout session | Stripe sessions are single-use; new `success_url` only applies to new sessions |
| Client-side pricing card breaks SSR for `/pricing` SEO | Keep copy, headings, comparison table in server component; only the cards + toggle are client |
| Signin auto-resume loops if checkout fails | On `/api/stripe/checkout` error, redirect to `/pricing?error=checkout` with a visible banner instead of retrying |
| Empty-state triggers in production due to low closed-signal count | The 10-signal threshold is tunable; revisit after first week of data |

## Verification commands

After each phase ships:

```bash
# Phase 1
curl -I https://tradeclaw.win/pricing
curl -s https://tradeclaw.win/pricing | grep -o 'price_[A-Za-z0-9]*' | head -2

# Phase 2
curl -s https://tradeclaw.win/api/stats/landing | jq .
```

Also run the standard signal-path check from `CLAUDE.md`:
```bash
psql $DATABASE_URL -c "SELECT count(*) FROM signal_history WHERE created_at > now() - interval '30 days'"
```

## Deployment note

Per workspace `CLAUDE.md`: GitHub auto-deploy is OFF on the `web` Railway service. After `git push origin main`, `railway up --detach` is required from `tradeclaw/` root to actually deploy.
