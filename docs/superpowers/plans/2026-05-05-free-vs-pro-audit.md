# TradeClaw Free vs Pro Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a single, evidence-backed audit report that proves (or disproves) every advertised free-vs-pro boundary in TradeClaw is actually enforced server-side, rendered correctly client-side, billed correctly through Stripe, and matches the marketing copy on `/pricing`.

**Architecture:** Read-only walk of the tier surface in five layers — (1) source of truth, (2) server gates, (3) Stripe lifecycle, (4) UI affordances, (5) marketing copy. Each layer produces a section in `docs/audits/2026-05-05-free-vs-pro.md` with file:line evidence. Anything that can't be verified by reading code gets a runtime probe (curl with synthetic free + pro sessions). Findings are classified `CONFIRMED OK`, `LEAK`, `OVER-DELIVERY`, `COPY MISMATCH`, or `DEAD CODE`.

**Tech Stack:** ripgrep, `psql $DATABASE_URL`, `curl` against `localhost:3000` with two seeded sessions (one free, one pro), Jest for any test additions. No production writes. No code changes — audit only. Any fix proposals are appended to the report as follow-up commits, not executed.

---

## Pre-flight

### Task 0: Scaffold the audit report

**Files:**
- Create: `docs/audits/2026-05-05-free-vs-pro.md`

- [ ] **Step 1: Create the report skeleton**

```markdown
# Free vs Pro Audit — 2026-05-05

**Auditor:** [name]
**Branch:** [git rev-parse HEAD]
**Status:** in-progress

## Executive Summary
TBD after all sections complete.

## Section 1 — Source of Truth
## Section 2 — Server-Side Gates
## Section 3 — Stripe Lifecycle & Pro Grants
## Section 4 — UI Affordances
## Section 5 — Marketing Copy Alignment
## Section 6 — Runtime Probes
## Section 7 — Findings Register
## Section 8 — Follow-up Backlog
```

- [ ] **Step 2: Capture branch + commit**

Run: `git rev-parse HEAD && git status --short`
Paste both outputs into the report header. Audit must be reproducible against this exact state.

- [ ] **Step 3: Commit the skeleton**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): scaffold free-vs-pro audit report"
```

---

## Section 1 — Source of Truth

### Task 1: Enumerate tier definitions

**Files:**
- Read: `apps/web/lib/stripe-tiers.ts`
- Read: `apps/web/lib/tier-client.ts`
- Read: `apps/web/lib/tier.ts`

- [ ] **Step 1: Extract advertised free features**

Open `apps/web/lib/stripe-tiers.ts`. Copy the `features` array of the `'free'` tier verbatim into the report under Section 1, subsection "Advertised Free Features".

Expected today (verify):
```
- 6 symbols across crypto, forex, commodities, indices
- 15-minute delayed signals
- TP1 target only
- Last 7 days signal history
```

- [ ] **Step 2: Extract advertised pro features**

Same file, copy the `features` array of the `'pro'` tier verbatim into the report under "Advertised Pro Features".

- [ ] **Step 3: Capture the canonical constants**

Run: `rg -n "^export const (FREE_SYMBOLS|FREE_HISTORY_DAYS|TIER_SYMBOLS|TIER_HISTORY_DAYS|TIER_DELAY_MS|PRO_PREMIUM_MIN_CONFIDENCE|PAST_DUE_GRACE_DAYS|TIER_LEVEL)" apps/web/lib/`

Paste output into report under "Canonical Constants". Each value listed must map cleanly to one line in the advertised features. Mark mismatches as `COPY MISMATCH` candidates (deferred to Section 5 for confirmation).

- [ ] **Step 4: Verify the cross-check test still pins the strategy list**

Open `apps/web/lib/tier.ts` line 119-131 (the `PRO_STRATEGIES` set). Confirm the comment about `tier.test.ts` cross-checking against `licenses.ts` is still accurate.

Run: `rg -n "PRO_STRATEGIES|ALLOWED_PREMIUM_STRATEGIES" apps/web/lib/`

Record findings: if `licenses.ts` is gone, the comment is stale → `DEAD CODE`. If both exist, verify the test exists: `rg -n "PRO_STRATEGIES" apps/web/lib/tier.test.ts apps/web/lib/__tests__/`. Missing test → `LEAK` (silent drift risk).

- [ ] **Step 5: Commit the section**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 1 — tier source-of-truth recorded"
```

---

## Section 2 — Server-Side Gates

### Task 2: Inventory every API route that resolves tier

**Files:**
- Audit target: `apps/web/app/api/**/route.ts`

- [ ] **Step 1: List all callers of the tier resolution API**

Run:
```bash
rg -n "getTierFromRequest|getUserTier|resolveAccessContext|resolveAccessContextFromCookies|filterSignalByTier|meetsMinimumTier|TIER_SYMBOLS|TIER_DELAY_MS|TIER_HISTORY_DAYS|PRO_PREMIUM_MIN_CONFIDENCE" apps/web/app
```

Paste the file list (deduped) into the report under Section 2, "Tier-Aware Routes".

- [ ] **Step 2: Build the route-by-route gate matrix**

For each route in the list, fill one row in this table in the report:

| Route | Method | Tier resolution call | What it gates | Default on error |
|---|---|---|---|---|
| /api/signals | GET | getTierFromRequest | symbols + delay + TP mask + premium-band hide | free (fail-closed) |
| /api/v1/signals | GET | getTierFromRequest | same as above + X-TradeClaw-Tier header | free |
| /api/keys | POST | getTierFromRequest + meetsMinimumTier('pro') | API key creation | free → 402 |
| ... | ... | ... | ... | ... |

Read each route file end-to-end. Don't skim. Record:
- Does it call a tier resolver?
- If yes, what does it gate?
- What is the response when the caller is `free`? (HTTP code + body shape)
- Does it use the canonical `upgradeRequiredBody` helper or invent its own 402/403 shape?

Routes that invent their own shape → `COPY MISMATCH` (clients can't branch uniformly on `error === 'upgrade_required'`).

- [ ] **Step 3: Find routes that read signals but skip the gate**

Run:
```bash
rg -n "getSignals\(|getTrackedSignals\(|listPremiumSignalsSince\(|recordNewSignals\(|signal_history" apps/web/app/api
```

For each match, cross-reference against the gate matrix from Step 2. Any route that reads signal data but does NOT call a tier resolver is a candidate `LEAK`. Common false positives: cron routes (auth via `CRON_SECRET`, no human caller), debug routes (admin-only), public archive routes (intentional). Mark each: `LEAK`, `OK (cron)`, `OK (admin gated)`, `OK (intentionally public)`.

- [ ] **Step 4: Verify the v1 public API headers match the gate**

Open `apps/web/app/api/v1/signals/route.ts`. Confirm `X-TradeClaw-Tier` header is set from the resolved tier (line ~77). Confirm `Cache-Control` is keyed on tier so a free response is never served from a CDN cache to a pro caller. If `Cache-Control` is shared → `LEAK` (cross-tier cache poisoning).

- [ ] **Step 5: Verify the premium-signals endpoint is pro-only**

Open `apps/web/app/api/premium-signals/route.ts` and `apps/web/app/api/premium-signals/chart/route.ts`. Both must reject `tier === 'free'` before any premium data is read from `lib/premium-signals.ts`. The chart route is the easy one to miss — it sometimes ships with a different gate shape than the list route. Record both responses for free callers.

- [ ] **Step 6: Record the dead-code path**

Confirm `apps/web/lib/signal-repo.ts` → `insertSignals()` is still uncalled (per workspace `CLAUDE.md`):

```bash
rg -n "insertSignals\(" apps/web
rg -n "live_signals" apps/web
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM live_signals;" 2>&1
```

Record the count. If 0 and zero callers, mark `DEAD CODE` and add to Section 8 follow-up: "drop table + helper".

- [ ] **Step 7: Commit the section**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 2 — server-side gate matrix"
```

### Task 3: Verify `filterSignalByTier` enforces every advertised mask

**Files:**
- Read: `apps/web/lib/tier.ts:266-298`
- Read: `apps/web/app/lib/signals.ts` (TradingSignal shape)

- [ ] **Step 1: List every field on TradingSignal**

Run: `rg -n "interface TradingSignal" apps/web/app/lib/signals.ts -A 60`

Paste the field list into the report under "TradingSignal Surface".

- [ ] **Step 2: Cross-check each field against the free-tier mask**

For each field on `TradingSignal`, mark in a table:

| Field | Pro sees | Free sees | Mask enforced in filterSignalByTier? |
|---|---|---|---|
| symbol | yes | yes (if in FREE_SYMBOLS) | symbol allow-list |
| direction | yes | yes (delayed) | none needed |
| entry / stopLoss / takeProfit1 | yes | yes (delayed) | none |
| takeProfit2 | yes | NO | line 283 sets null |
| takeProfit3 | yes | NO | line 284 sets null |
| indicators.rsi | yes | yes | none |
| indicators.ema | yes | yes | none |
| indicators.macd | yes | NO | line 290 zeroed |
| indicators.bollingerBands | yes | NO | line 291 zeroed |
| indicators.stochastic | yes | NO | line 292 zeroed |
| confidence | yes (full range) | only <85 | line 275 returns null |
| timeframe | ? | ? | ? |
| ... | ... | ... | ... |

Any field that exists on `TradingSignal` and does NOT appear in this table is a `LEAK` candidate — either it's truly tier-agnostic (justify in writing) or it's silently leaking to free callers.

- [ ] **Step 3: Verify the lockedSignals stub is narrow**

Read `apps/web/lib/tier.ts:70-100` (`LockedSignalStub` + `toLockedStub`). Confirm the stub has exactly: `id, symbol, direction, timeframe, confidence, availableAt, locked`. Anything wider → `LEAK`. The whole point of the stub is to tease without revealing entry/SL/TP — a single extra field defeats it.

- [ ] **Step 4: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 2 — filterSignalByTier field coverage"
```

---

## Section 3 — Stripe Lifecycle & Pro Grants

### Task 4: Audit how a user becomes Pro

**Files:**
- Read: `apps/web/lib/tier.ts:220-260` (`getUserTier`)
- Read: `apps/web/lib/admin-emails.ts`
- Read: `apps/web/lib/stripe.ts`
- Read: `apps/web/app/api/webhooks/stripe/route.ts` (or wherever Stripe webhooks land)

- [ ] **Step 1: Enumerate every path that grants Pro**

In the report, list every code path that can resolve a user to `tier === 'pro'`:

1. Stripe subscription with `status === 'active'`
2. Stripe subscription with `status === 'trialing'`
3. Stripe subscription with `status === 'past_due'` AND within `PAST_DUE_GRACE_DAYS` of `currentPeriodEnd`
4. Email is in `PRO_EMAILS` env (bootstrap grant via `isProGrantedEmailDeep`)
5. Email is in `pro_email_grants` table (admin-granted)
6. Email is in admin allow-list (`isAdminEmail`)

Record the file:line for each.

- [ ] **Step 2: Probe the Stripe webhook route**

Run: `rg -n "stripe|webhook" apps/web/app/api -l | rg -i "stripe"`

For each Stripe webhook handler:
- Confirm the signature is verified before any DB mutation. Missing → `LEAK` (anyone can POST `customer.subscription.updated` and grant themselves Pro).
- Confirm `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid` are all handled. Missing handlers means tier state can desync from Stripe → `LEAK` (canceled user keeps Pro until next manual reconcile).

- [ ] **Step 3: Probe the past_due grace window**

Confirm `PAST_DUE_GRACE_DAYS = 7` (per `tier-client.ts:35`). Compute: a subscription that hits `past_due` on day X retains Pro until `currentPeriodEnd + 7d`. Record an example timeline in the report.

Edge case to flag: if Stripe Smart Retries succeed on day 6, does the webhook flip status back to `active` or does the user get downgraded on day 7 anyway? Verify the webhook handler treats `customer.subscription.updated` with `status: 'active'` as a definitive recovery. If not → `LEAK` (legitimate paying customer downgraded).

- [ ] **Step 4: Audit the admin-granted Pro backdoor**

Read `apps/web/lib/admin-emails.ts`. For each function (`isAdminEmail`, `isProGrantedEmailDeep`):
- Where is the truth read from? `PRO_EMAILS` env var? `pro_email_grants` table? Both?
- Is there a UI to grant/revoke? Find it: `rg -n "pro_email_grants" apps/web/app/admin`
- Is there an audit log of grants/revokes? If no → `LEAK` (silent privilege escalation possible).

- [ ] **Step 5: Database probe — count active Pro users by source**

Run:
```bash
psql "$DATABASE_URL" -c "
SELECT
  CASE
    WHEN s.status = 'active' THEN 'stripe_active'
    WHEN s.status = 'trialing' THEN 'stripe_trial'
    WHEN s.status = 'past_due' THEN 'stripe_past_due'
    ELSE 'no_sub'
  END AS source,
  COUNT(DISTINCT u.id) AS users
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
GROUP BY 1;
"

psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pro_email_grants;" 2>&1
```

Paste counts. The report should be able to answer: "How many Pro users are paying? How many are grandfathered/granted?" — that's a strategic number, not just an audit one.

- [ ] **Step 6: Verify fail-closed on every error path**

Read `getUserTier` and `getTierFromRequest`. Both must return `'free'` on any thrown error. Confirm — line 257 (`} catch { return 'free'; }`) and line 322 (same shape). Missing fail-closed branch → `LEAK` (DB blip → everyone becomes Pro).

- [ ] **Step 7: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 3 — Stripe lifecycle + Pro grant paths"
```

---

## Section 4 — UI Affordances

### Task 5: Audit every component that renders tier-conditional content

**Files:**
- Read: `apps/web/components/TierBadge.tsx`
- Read: `apps/web/components/DelayCountdown.tsx`
- Read: `apps/web/app/dashboard/page.tsx`
- Read: any component returned by the Step 1 grep

- [ ] **Step 1: Enumerate tier-aware client surfaces**

Run:
```bash
rg -n "tier|isPro|isFree|locked|lockedSignals|upgrade" apps/web/components apps/web/app -l \
  | rg -v __tests__ | rg -v node_modules
```

Record the file list under Section 4, "Tier-Aware Components".

- [ ] **Step 2: Verify no client component trusts client-side tier alone for content**

For each tier-aware component, check: does it READ tier from a prop/server fetch, or does it derive tier from local state (e.g., a cookie read in the browser)?

The rule: tier display is fine to derive client-side; tier-gated CONTENT must come from a server fetch. A component that reads tier from a cookie and then renders TP2/TP3 from a `signals` array it already has → `LEAK` (the data is in the bundle; flipping a cookie reveals it).

Record any component that violates this.

- [ ] **Step 3: Verify lockedSignals render path**

Find where `lockedSignals` is rendered:

```bash
rg -n "lockedSignals|LockedSignalStub" apps/web/components apps/web/app
```

Confirm the renderer ONLY uses fields present on `LockedSignalStub`. If it ever does `signal.entry || stub.fallback`, that means the component is dual-mode — and a free user with a poisoned local cache could see entry. Mark `LEAK` if so.

- [ ] **Step 4: Verify the upgrade CTA points to /pricing with source attribution**

Search for hardcoded `/pricing` links:

```bash
rg -n '"/pricing' apps/web/components apps/web/app
```

Each link should include `?from=<source>` so funnel attribution works. Links missing `from` → `COPY MISMATCH` (sales-side problem, not a security one, but logged).

- [ ] **Step 5: Inspect the dashboard for free-vs-pro split-render**

Open `apps/web/app/dashboard/page.tsx`. Confirm:
- It calls `resolveAccessContextFromCookies()` (or equivalent) on the server
- It branches on `tier` BEFORE rendering anything sensitive
- It does NOT pass full signal objects into the free-tier branch and rely on a child component to mask them

Walk the render tree two levels deep. Record any place a full TradingSignal flows into a free render path.

- [ ] **Step 6: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 4 — UI affordance audit"
```

---

## Section 5 — Marketing Copy Alignment

### Task 6: Reconcile pricing page vs. delivered features

**Files:**
- Read: `apps/web/app/pricing/page.tsx` (or wherever the pricing page lives — find it)
- Read: `apps/web/lib/stripe-tiers.ts`

- [ ] **Step 1: Locate the pricing page**

Run: `rg -n "pricing" apps/web/app -l | head -20`

Open the canonical pricing page. Record its path in the report.

- [ ] **Step 2: Verify it renders from `TIER_DEFINITIONS`**

The pricing page MUST source its feature list from `TIER_DEFINITIONS` in `stripe-tiers.ts`. If it has hardcoded JSX strings → `COPY MISMATCH` (drift risk). Record.

- [ ] **Step 3: Verify each advertised free feature is enforced**

For each line in the free `features` array, find the gate that delivers it:

| Advertised | Enforced where | Status |
|---|---|---|
| 6 symbols across crypto, forex, commodities, indices | `FREE_SYMBOLS` in `tier-client.ts:7-14` | OK |
| 15-minute delayed signals | `TIER_DELAY_MS.free` in `tier.ts:56` | OK |
| TP1 target only | `filterSignalByTier` in `tier.ts:282-285` | OK |
| Last 7 days signal history | `TIER_HISTORY_DAYS.free` in `tier.ts:48` + the API filter that uses it | verify |

Pay special attention to the history-window enforcement — `TIER_HISTORY_DAYS` is defined but I have not verified it's actually applied at every read site. Run:

```bash
rg -n "TIER_HISTORY_DAYS" apps/web
```

Every advertised limit must have a corresponding READ that respects it. Limits defined but unused → `OVER-DELIVERY` (free users see more than they paid for; not a security issue but undermines pricing).

- [ ] **Step 4: Verify each advertised pro feature is delivered**

Same exercise for the Pro tier. Particular items to verify:
- "Real-time signal delivery" — `TIER_DELAY_MS.pro === 0`. Confirm.
- "Multi-timeframe analysis (RSI, EMA, MACD, Bollinger, Stochastic)" — `filterSignalByTier` does NOT mask MACD/BB/Stoch for pro. Confirm.
- "TP1, TP2, TP3 + Stop Loss" — `filterSignalByTier` does NOT null TP2/TP3 for pro. Confirm.
- "Private Pro Telegram group" — find the bot membership flow. Run `rg -n "telegram" apps/web/lib apps/web/app/api`. There must be a Pro-only invite path. If missing → `OVER-PROMISE` (we sold something we don't deliver). Major.
- "Full signal history + CSV export" — find the export route (`apps/web/app/api/export/route.ts`). Confirm it gates on `meetsMinimumTier('pro')`. Free users hitting it must get 402.
- "Every signal in a public Postgres archive" — find the archive page/endpoint. This one is intentional and contradicts privacy expectations of paid signals. Note as `INTENTIONAL TRADE-OFF`.
- "7-day free trial" — the Stripe checkout session must include `trial_period_days: 7`. Find: `rg -n "trial_period_days|trialPeriodDays|trial" apps/web/lib/stripe.ts apps/web/app/api/checkout`. Missing → `OVER-PROMISE` (no trial actually granted).

- [ ] **Step 5: Record price-label vs. Stripe price-id alignment**

Confirm `monthlyPriceLabel: '$29'` matches the actual Stripe price for `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`. We can't read Stripe from this audit, but we CAN verify the env var is set in Railway:

```bash
railway variables --service web | rg STRIPE 2>/dev/null
```

If the local audit machine isn't linked to Railway, note it as "verified by hand against Railway dashboard on [date]" instead.

- [ ] **Step 6: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 5 — pricing copy vs delivered features"
```

---

## Section 6 — Runtime Probes

### Task 7: Probe two synthetic sessions end-to-end

**Files:**
- Use: `apps/web/.env.local` (read-only — for `DATABASE_URL` etc.)
- Create (then delete): `scripts/audit/probe-tier-leaks.sh` — temporary probe script

- [ ] **Step 1: Boot dev server**

Run in a separate terminal:
```bash
cd apps/web && npm run dev
```

Wait for `Ready in Xs`. Confirm `http://localhost:3000/api/health` returns 200.

- [ ] **Step 2: Seed a free user and a pro user**

Use existing seed scripts if any, otherwise insert directly:

```bash
psql "$DATABASE_URL" -c "
INSERT INTO users (id, email) VALUES
  ('audit-free-1', 'audit-free-2026-05-05@tradeclaw.test'),
  ('audit-pro-1',  'audit-pro-2026-05-05@tradeclaw.test')
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (user_id, tier, status, current_period_end)
VALUES ('audit-pro-1', 'pro', 'active', NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;
"
```

Mint two iron-session cookies for these two user IDs using the existing session helper. Find it: `rg -n "createSession|sealSession|encryptSession" apps/web/lib`. Use it from a node REPL or a one-off script.

- [ ] **Step 3: Probe `/api/signals` as free**

```bash
curl -s -b "session=<free-cookie>" http://localhost:3000/api/signals | jq '
{
  tier: .tier,
  symbols_seen: [.signals[].symbol] | unique,
  has_tp2: [.signals[] | select(.takeProfit2 != null)] | length,
  has_tp3: [.signals[] | select(.takeProfit3 != null)] | length,
  has_macd: [.signals[] | select(.indicators.macd.histogram != 0)] | length,
  any_premium: [.signals[] | select(.confidence >= 85)] | length,
  locked_count: (.lockedSignals // []) | length
}'
```

Expected for free:
- `symbols_seen` ⊆ `FREE_SYMBOLS`
- `has_tp2 == 0`, `has_tp3 == 0`
- `has_macd == 0`
- `any_premium == 0` (>=85 confidence is hidden)
- `locked_count` may be > 0 (delayed-signal teasers)

Any expectation violated → `LEAK`. Paste the actual output into the report.

- [ ] **Step 4: Probe `/api/signals` as pro**

Same curl, swap cookie. Expected:
- `symbols_seen` may include any pro symbol
- `has_tp2 > 0`, `has_tp3 > 0` (assuming the day has resolved signals at all)
- `has_macd > 0`
- `any_premium >= 0` (no upper cap)
- `locked_count == 0`

Paste actual output.

- [ ] **Step 5: Probe `/api/v1/signals` as free with the public REST API**

```bash
curl -sI -b "session=<free-cookie>" http://localhost:3000/api/v1/signals | rg -i "x-tradeclaw-tier|cache-control"
```

Confirm `X-TradeClaw-Tier: free` is set. Confirm `Cache-Control` either includes `private` or includes the tier in the `Vary` header. Otherwise CDN can cross-leak.

- [ ] **Step 6: Probe `/api/keys` POST as free**

```bash
curl -s -b "session=<free-cookie>" -X POST http://localhost:3000/api/keys \
  -H 'Content-Type: application/json' -d '{"label":"audit-probe"}' | jq
```

Expected: HTTP 402, body matches `UpgradeRequiredBody` (has `error: 'upgrade_required'`, `upgradeUrl: '/pricing?from=...'`).

- [ ] **Step 7: Probe `/api/premium-signals` as free**

Same shape. Expected: 402.

- [ ] **Step 8: Probe `/api/export` as free**

Expected: 402 if "Full signal history + CSV export" is sold as Pro-only.

- [ ] **Step 9: Probe history-window cap as free**

Hit the endpoint that serves history (probably `/api/signals?days=30` or similar — find it). Confirm `free` users get exactly 7 days of history regardless of the requested window. Paste the row counts and oldest timestamp.

- [ ] **Step 10: Tear down audit users**

```bash
psql "$DATABASE_URL" -c "
DELETE FROM subscriptions WHERE user_id IN ('audit-free-1','audit-pro-1');
DELETE FROM users WHERE id IN ('audit-free-1','audit-pro-1');
"
```

Confirm deletion. The probe must not leave residue in production-like data. If `DATABASE_URL` points at the production Railway DB, **stop here and ask before re-running probes**. Use a local Postgres or a Railway non-prod branch for probes.

- [ ] **Step 11: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 6 — runtime probe results"
```

---

## Section 7 — Findings Register

### Task 8: Consolidate findings into a single register

**Files:**
- Edit: `docs/audits/2026-05-05-free-vs-pro.md` (Section 7)

- [ ] **Step 1: Build the findings table**

Walk back through Sections 1-6. For each non-OK finding, add one row:

| ID | Severity | Type | Location | Evidence | Recommended fix |
|---|---|---|---|---|---|
| F-001 | high | LEAK | apps/web/app/api/X/route.ts:NN | "free caller received TP2 in probe" | "add filterSignalByTier before response" |
| F-002 | medium | COPY MISMATCH | apps/web/lib/stripe-tiers.ts:NN | "free advertises X, server delivers Y" | "update copy OR enforce gate" |
| F-003 | low | DEAD CODE | apps/web/lib/signal-repo.ts | "0 callers, 0 rows in live_signals" | "drop helper + table" |
| ... | ... | ... | ... | ... | ... |

Severity scale:
- **critical**: paying customers blocked, OR free users get full Pro data
- **high**: free users get partial Pro data (specific fields), OR Pro users miss advertised features
- **medium**: copy/code drift that could become a leak, OR funnel-attribution loss
- **low**: dead code, comments, minor cleanup

- [ ] **Step 2: Write the executive summary**

Top of the report. Three sentences max. Format:
> Audit walked the full free/pro surface. Found **N critical, M high, K medium, J low** findings. Top three risks: [one-line each].

- [ ] **Step 3: Commit**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): section 7 — findings register + exec summary"
```

---

## Section 8 — Follow-up Backlog

### Task 9: Decide what to fix and what to defer

**Files:**
- Edit: `docs/audits/2026-05-05-free-vs-pro.md` (Section 8)

- [ ] **Step 1: Triage every finding**

For each finding F-NNN, decide one of:
- **fix-now**: severity critical or high → must ship before next billing cycle
- **fix-soon**: medium → next sprint
- **defer**: low → backlog, will not fix unless touched anyway
- **wontfix**: intentional trade-off (e.g., public archive of paid signals) → document the why

- [ ] **Step 2: For each fix-now, draft a one-line spec**

Format: `F-NNN → spec: <what changes, in one sentence>`. These become the inputs to a separate brainstorming/planning session — this audit does NOT execute fixes.

- [ ] **Step 3: Mark the report status**

Change the header from `Status: in-progress` to `Status: complete (commit <sha>)`.

- [ ] **Step 4: Commit and close out**

```bash
git add docs/audits/2026-05-05-free-vs-pro.md
git commit -m "docs(audit): finalize free-vs-pro audit — N findings, K fix-now"
```

- [ ] **Step 5: Open a tracking issue per fix-now finding**

For each `fix-now` row, open a GitHub issue titled `Free/Pro audit F-NNN: <one-line>` with the report row pasted in and a link to the audit doc. Do NOT bundle multiple findings into one issue — one finding per issue, so they can be triaged independently.

```bash
gh issue create --title "Free/Pro audit F-001: <title>" --body "..."
```

---

## Self-Review Checklist (auditor runs before declaring done)

Before marking the audit `complete`, walk this list once with fresh eyes. Each item is a sanity gate, not a rubber stamp.

- [ ] Every advertised feature in `TIER_DEFINITIONS` (free + pro) appears at least once in the report with a file:line citation showing where it's enforced.
- [ ] Every API route under `apps/web/app/api/**/route.ts` either appears in the gate matrix (Section 2) or has a written justification for being public (Section 2 footnote).
- [ ] Every Stripe subscription status (`active`, `trialing`, `past_due`, `canceled`, `unpaid`, `incomplete`) is accounted for in Section 3 — either handled, or explicitly noted as "not handled, intentional".
- [ ] Section 6 runtime probes were run against a non-production database. Confirm `DATABASE_URL` at probe time pointed somewhere safe.
- [ ] The findings register has a severity for every finding. No `severity: TBD` allowed.
- [ ] No section is empty. An empty section means it wasn't audited — write "no findings" explicitly with the evidence that justifies it.
- [ ] The executive summary numbers (N critical, M high, K medium, J low) actually match Section 7's row count. Recount.

If any item fails: fix, then re-check the list. No "should be fine" claims.
