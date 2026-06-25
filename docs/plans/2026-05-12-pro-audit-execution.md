# Pro Audit Execution — Session Plan

**Date:** 2026-05-12
**Source:** PM audit recommendations dated 2026-05-11 (chat transcript)
**Driver:** `/proceed-with-claude-recommendation` under 7 Laws

## Status

| # | Action | Branch | Status |
|---|---|---|---|
| 1 | tier-pro-followups C1-C4 | `fix/tier-pro-followups` | **DONE** — PR #69 (`c8339c3c`) + `bbae0f2f` |
| 2 | Quote `/track-record` numbers on pricing page | `feat/pricing-track-record-numbers` | **DONE** — all-time resolved count, win rate, and cumulative PnL now render on `/pricing` |
| 3 | T-3d trial-ending email with realized missed P&L | `feat/trial-t3d-email` | **DONE** — T-3d sweep now computes missed Pro P&L and sends the enriched reminder |
| 4 | Elite "Coming Soon" + waitlist + WTP survey | `feat/elite-coming-soon` | **DONE** — Elite waitlist card + interest form now capture live-trade / copy-trade intent and WTP |
| 5 | Reframe Pro features as outcomes (copy) | `chore/pro-feature-copy` | **DONE** — pricing page + tier copy updated; `npm run build` passes |

## Course-correction (2026-05-12)

User redefined item #4: Elite ships as **"Coming Soon"** with two value pillars:
1. **Connect to live trade** (register interest signup)
2. **Copy trade** — explicitly framed as the moat

Plus a **willingness-to-pay survey** captured at the same form. No Stripe products yet. Lead capture + price discovery only.

## Per-item scope, verification, fallback

### Item #2 — Pricing track-record numbers

**Where:** [apps/web/app/pricing/page.tsx](../../apps/web/app/pricing/page.tsx) between hero and IntervalToggle.

**Numbers to render:**
- All-time resolved signal count (`closedSignalsAllTime`)
- All-time win rate (% of `outcome_24h.hit = true` over non-zero closed)
- All-time cumulative PnL % (`cumulativePnlAllTime`)

**Helper:** Extend [landing-stats.ts](../../apps/web/lib/landing-stats.ts) with a new `getPricingStats()` that runs against the full history, not 30d. Single query, no new tables.

**Caching:** Server component reads stats with `unstable_cache` or page-level `revalidate = 600` (10 min). Numbers don't need real-time on pricing.

**Risk:** None — read-only Postgres query against existing `signal_history` table.

**Verify:**
- Unit test for `getPricingStats()` (mock `queryOne` returns known shape, assert math)
- Manual: dev server, visit `/pricing`, see the stat strip with non-zero numbers
- Type-check + smallest pricing-page test

**Inline fallback (no Postgres in dev):** render `—` placeholder, do not crash.

**Out of scope:**
- No new tables/migrations
- No `/track-record` page changes
- No copy changes to the comparison table (that's item #5)

### Item #5 — Reframe Pro features as outcomes

**Where:**
- [stripe-tiers.ts](../../apps/web/lib/stripe-tiers.ts) `TIER_DEFINITIONS[pro].features`
- [pricing/page.tsx](../../apps/web/app/pricing/page.tsx) `FEATURES` comparison table

**Change type:** Copy-only. No new logic, no new components.

**Examples of reframe:**
- BEFORE: "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)"
- AFTER: "Confluence-gated entries — 4+ indicators must align across H1/H4/D1 before a signal fires"
- BEFORE: "Public win-rate audit at /track-record"
- AFTER: "Verify every signal in our public Postgres — every entry, exit, and outcome on record"

**Risk:** None. Copy.

**Verify:** type-check, render `/pricing` in dev.

### Item #3 — T-3d trial-ending email

**Where:**
- [apps/web/app/api/cron/trial-reminders/route.ts](../../apps/web/app/api/cron/trial-reminders/route.ts) — extend with T-3d branch
- [apps/web/lib/trial-end-email.ts](../../apps/web/lib/trial-end-email.ts) — new T-3d template + missed-P&L compute

**Missed-P&L definition** (closes the open design question):
For a trial user with no paper-trading data, compute against the top N Pro-only signals they could have taken during their trial:
1. Pull Pro signals from `signal_history` filtered by `created_at >= trial_start` AND `confidence >= PRO_PREMIUM_MIN_CONFIDENCE` AND `outcome_24h IS NOT NULL`.
2. Take top 3 by `(outcome_24h->>'pnlPct')::numeric` (positive only — we show what they missed, not what they avoided).
3. Sum the % gains. Show "If you'd taken our top 3 Pro signals at 1% size, you'd be up $X on a $10k account."

**Sizing assumption:** 1% per trade, $10k notional (matches `/track-record` methodology from project memory).

**Risk:** Medium — sending emails. Mitigations: gate behind `CRON_SECRET`, idempotent ledger via existing `trial_email_log` (or equivalent), test mode honors `EMAIL_TEST_RECIPIENT`.

**Verify:**
- Unit test for missed-P&L compute (seeded `signal_history` rows, assert correct top-3 and sum)
- Manual: invoke cron with `?dry_run=1`, inspect output
- Read `trial_email_log` after a wet run

**Out of scope:**
- Do NOT remove the T-1d email
- Do NOT change trial duration
- Do NOT add a T-0/T-1h email — separate ticket

### Item #4 — Elite "Coming Soon" + waitlist + WTP survey

**Where:**
- [pricing/PricingCards.tsx](../../apps/web/app/pricing/PricingCards.tsx) — add 3rd card with Coming Soon state
- New table migration `029_elite_interest.sql` with `(id, email, wtp_monthly_cents, wants_live_trade, wants_copy_trade, created_at, ip_hash)`
- New API route `apps/web/app/api/elite/interest/route.ts` for POST (rate-limited)
- New component `apps/web/components/EliteInterestForm.tsx`

**Value props on card:**
- "Connect to live trade" (Pro signals → your broker)
- "Copy trade" — **highlighted as the moat**
- "Pricing TBD — help us set it. Tell us what you'd pay."

**Form fields:**
- Email
- Single select: "Most interested in" → live-trade / copy-trade / both
- Single select: "Willing to pay per month" → $49 / $99 / $199 / $499 / $999+ / "other (free text)"

**Risk:** Adds a Postgres table. Migration is `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX` — idempotent. Rate limit at 5 req / IP / hr via existing pattern.

**Verify:**
- Unit tests for POST handler (valid → 200, dup email → 200 idempotent, missing fields → 400, rate-limit → 429)
- E2E test for form submit + success state
- Manual: submit form in dev, query `elite_interest` table

**Out of scope:**
- No Stripe price IDs
- No Telegram group provisioning
- No actual copy-trade execution code (that's a separate product)
- No admin dashboard to view interest entries (deferred)

## Order of execution

Walking the user's original order: #2 → #3 → #4 → #5.

Each item ships as its own branch, its own PR, one concern per commit.

## What I will NOT do in this session

- Touch unrelated files
- Reformat / rename / refactor anything outside the named files per item
- Run `git push origin main` (only push to feature branches)
- Run `railway up` — deploy is the user's call
- Modify CI, migrations folder ordering, or any file not named above per item
- Combine items into one branch
