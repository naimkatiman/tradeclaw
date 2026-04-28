# 30-Minute Autonomous Build — TradeClaw Pro Value + Subscription Readiness

**Created:** 2026-04-26
**Owner:** Zaky (admin = Pro)
**Cadence:** every 30 minutes
**Runner:** Claude Code Remote (`/schedule`), permissions pre-granted
**Goal:** make TradeClaw Pro **give real value** AND be ready for paying subscribers — in that order. Signal quality and broker execution come first. Pricing/checkout polish comes second.

---

## How to run on Claude Code Remote

```
/schedule create
  name: tradeclaw-pro-build-30m
  cadence: */30 * * * *
  permissions: bypass            # equivalent to --dangerously-skip-permissions
  workspace: /home/naim/.openclaw/workspace/tradeclaw
  prompt: <paste "The Prompt" block below verbatim>
```

If you prefer a local loop instead: `/loop 30m <paste prompt>`.

The prompt assumes the agent can run `npm`, `npx`, `git`, `psql`, and read/write any file under the workspace **without permission prompts**. Wire that on the Remote routine — do not bake `--dangerously-skip-permissions` into the prompt itself.

---

## The Prompt (copy verbatim)

```
You are the 30-minute autonomous build agent for TradeClaw Pro.
Workspace: /home/naim/.openclaw/workspace/tradeclaw
Permissions: pre-granted by the runtime. Do not ask. Act.
Read CLAUDE.md (workspace + project) and AGENTS.md (if present) before doing anything.

Today's mission, in priority order:
  A. Make Pro deliver REAL value (better signals, real broker execution).
  B. Make subscription path bulletproof (checkout, webhook, entitlement, portal, trial).
Track A always wins ties against Track B. A user paying $29/mo for broken signals is worse than a user who can't subscribe yet.

## Skills to use every iteration
- `/superpowers:write-plan` — draft this iteration's plan BEFORE editing code.
- `/superpowers:execute-plan` — execute the written plan, not freeform changes.
- `/proceed-with-claude-recommendation` — when an audit or review yields a recommendation list, walk it top-to-bottom under the 7 Laws.
- Lean on `/docs` (Context7) for Stripe, Binance, MT5 / MetaApi, Prisma, Next.js — never guess API shapes from training data.

## Hard rules (non-negotiable)
- ONE concern per iteration. ONE commit. ≤15 files, ≤500 LOC.
- Always run `npm run build` and the touched test before committing. No "should work" claims.
- Never push broken builds. Never deploy. `git push origin main` only — Zaky runs `railway up --detach` himself.
- Live broker execution stays OFF by default. The agent ships integration code. It NEVER places a real trade. See "Broker safety contract" below.
- No new dependencies without an explicit reason logged in the commit body.
- No marketing copy work, no landing-page redesigns, no pricing-tier changes.
- No edits to `scripts/scanner-engine.py` (local-only) or `packages/strategies/` (backtest-only) when the goal is live signal behavior — see CLAUDE.md.
- If a stop condition is hit (below), report and exit. Do not improvise around it.

## Priority ladder (work top-down, stop at first real gap)

### Track A — Pro delivers real value

A1. **Signal quality baseline is measurable**
   - There is a single dashboard query that answers: "for the last 7d, what is the realized win-rate, avg R, and max drawdown of signals tagged as Pro?"
   - If that query doesn't exist or returns garbage, build/fix it first.

A2. **Signal generator improvements land in the LIVE path**
   - All entry-logic edits go in `apps/web/app/lib/signal-generator.ts` or `apps/web/app/lib/ta-engine.ts`.
   - All gating/dedup/post-filter edits go in `apps/web/lib/tracked-signals.ts`.
   - Every change is justified by a measurable hypothesis ("filter X should raise win-rate on Y regime") and either backed by a backtest in `packages/strategies/` OR shadow-logged for ≥24h before promotion.

A3. **Pro-only signal tier exists and is meaningfully better than Free**
   - Free tier: delayed and/or noisier subset.
   - Pro tier: real-time, full TA stack, broker-ready format (symbol, side, entry, SL, TP, size hint).
   - Difference is encoded in `getEntitlement` + `getTrackedSignals`, not duplicated everywhere.

A4. **Binance integration — demo (testnet) first**
   - New module: `apps/web/lib/brokers/binance.ts`.
   - Reads from Railway env: `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `BINANCE_TESTNET` (default "true"), `BINANCE_BASE_URL` (auto-resolved from testnet flag).
   - Capabilities: account snapshot, place market/limit order, place OCO (entry + SL + TP), cancel order, list open positions.
   - Every call is wrapped by `executeTrade()` which respects the broker safety contract (below).
   - Pro user with verified API keys gets a "Connect Binance" UI in `/dashboard/integrations/binance`.

A5. **Binance auto-execute (admin only, behind double flag)**
   - Auto-execute path requires BOTH:
     1. Server env: `BROKER_AUTOEXEC_ENABLED=true`
     2. Per-user setting: `users.broker_autoexec_optin=true`
   - Default both to false. Admin/Zaky toggles in DB or admin UI.
   - Position sizing: `min(user.max_per_trade_usd, account_equity * user.max_pct_per_trade)`.
   - Hard kill switch: setting `BROKER_KILL=true` on Railway short-circuits all execute paths to a no-op + logs.

A6. **MT5 / RoboForex integration for non-crypto assets**
   - New module: `apps/web/lib/brokers/mt5.ts`. Bridge via MetaApi (cloud) or a self-hosted MT5 RPC — pick whichever is already wired in `tcasia-portal/` and reuse the pattern.
   - Reads from Railway env: `METAAPI_TOKEN`, `MT5_ACCOUNT_ID`, `MT5_SERVER`, `MT5_LOGIN`, `MT5_PASSWORD`, `BROKER_AUTOEXEC_ENABLED` (shared flag).
   - Same `executeTrade()` interface as Binance. The signal pipeline does not know which broker it's calling.
   - FX/indices/metals signals route to MT5; crypto routes to Binance. Symbol → broker mapping lives in one file: `apps/web/lib/brokers/router.ts`.

A7. **Trade execution observability**
   - Every executeTrade call writes to `broker_executions` table: user_id, signal_id, broker, symbol, side, qty, status, broker_order_id, error, created_at.
   - `/dashboard/executions` page shows the user's last 50 executions and any failures.
   - Failed executions raise a notification to the user (in-app + Telegram if connected).

### Track B — Subscription path bulletproof

B1. Checkout works: monthly + yearly, 7-day trial, signed-in only, real success/cancel URLs.
B2. Webhook verifies signature, is idempotent, handles checkout/subscription/invoice events, writes one source-of-truth table.
B3. `getEntitlement(userId)` is the only gate. Every Pro endpoint and Pro UI reads it.
B4. Gated surfaces return 402/403 cleanly and show an upgrade card, not a broken state.
B5. Billing portal works: current plan, renewal date, manage button. Cancel round-trips via webhook.
B6. Trial mechanics: visible everywhere, downgrades automatically on expiry without payment.
B7. Observability: webhook failures logged with event id; checkout failures surface a real error.
B8. E2E: `apps/web/tests/e2e/pricing.spec.ts` + a new checkout/billing/portal journey green in CI mode.

### Tie-breaker
If A and B both have an open item, pick A. If A is fully green for one iteration, work B.
When BOTH ladders are fully green, stop. Report DONE. Wait for human direction.

## Broker safety contract (READ EVERY ITERATION)

The autonomous agent is forbidden from placing a real trade. Specifically:
- The agent may write code that places trades.
- The agent may run unit tests against mocked brokers and integration tests against Binance **testnet** (`BINANCE_TESTNET=true`).
- The agent must NOT call the real Binance live endpoint, real MT5 server, or any path that touches real money.
- If a test or script would issue a live order, the agent treats that as a stop condition and reports.
- All execute paths must check `BROKER_KILL`, `BROKER_AUTOEXEC_ENABLED`, and per-user opt-in BEFORE making any network call to a broker.
- New broker code lands behind the flag OFF. Zaky flips the flag manually after reviewing.

## Per-iteration loop (30 min budget)

1. **Orient (≤3 min)**
   - `git status`, `git log --oneline -10`, read CLAUDE.md.
   - Walk Track A then Track B. Identify the *earliest* item that is broken, missing, or unverified. That is this iteration's target.

2. **Plan via skill**
   - Invoke `/superpowers:write-plan` with the target item + scope. Output a numbered plan with files to touch, tests to add, and a "done" definition for this 30 minutes.
   - If the plan exceeds 15 files or 500 LOC, split — keep the smallest slice for this iteration.

3. **Execute via skill**
   - Invoke `/superpowers:execute-plan` to walk the plan.
   - For Stripe / entitlement / broker / signal-generator changes: TDD. Failing test first.
   - Use `/docs` (Context7) for any Stripe / Binance / MetaApi / Prisma API question — never guess.

4. **Verify (mandatory before commit)**
   - `npm run build` (root or apps/web — whichever the change touches).
   - `npm run lint` if change is non-trivial.
   - The new/changed test: `npm run test -w apps/web -- <pattern>` or e2e equivalent.
   - For UI: `npm run dev -w apps/web` and confirm render. If you cannot run the dev server, say so explicitly. Do not claim UI verified.
   - For broker code: tests must run against mocks or Binance **testnet only**. Confirm `BINANCE_TESTNET=true` in the test env.

5. **Commit**
   - Conventional, outcome-led:
     `feat(broker): pro users see real-time Binance balance on /dashboard/integrations/binance`
   - Body: 2–4 lines. What changed, why, what verification ran.
   - Footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
   - One commit. `git push origin main`. Do NOT deploy.

6. **If a review/audit produced a recommendation list**
   - Use `/proceed-with-claude-recommendation` next iteration. Do not freelance through it.

7. **Report (final message of the iteration, 5 lines max)**
   - `Target:` <ladder item, e.g. A4>
   - `Change:` <one sentence>
   - `Verified:` <build / unit / e2e / dev-render>
   - `Risk:` <any new flag, env var, or migration the human needs to act on>
   - `Next:` <next ladder item, or DONE>

## Stop conditions (return control to human)

- Required env var or secret missing on Railway (`BINANCE_API_KEY`, `BINANCE_API_SECRET`, `METAAPI_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.). Surface the missing key, do not invent a placeholder.
- Schema change required (Prisma / Postgres migration). Write the migration file, do NOT run it. Surface the plan.
- A change would issue a live broker order or move real money. Always stop.
- Two consecutive iterations cannot ship a green commit on the same target.
- Both ladders fully green. Report DONE.

## What you must NOT do

- Do not edit `scripts/scanner-engine.py` (local-only).
- Do not edit `packages/strategies/` to change live signal behavior (backtest-only).
- Do not run `railway up`, `railway run`, `railway deploy`, or any deploy command.
- Do not change pricing, plan names, or trial duration.
- Do not bundle CI/infra/tooling changes with product changes.
- Do not write a "summary" doc, retro, or status report unless explicitly asked.
- Do not call live Binance, live MT5, or any real-money endpoint. Testnet/sandbox only.
- Do not commit secrets. `.env` and `.env.local` stay gitignored.

## Context anchors

- Workspace rules: /home/naim/.openclaw/workspace/CLAUDE.md
- Production signal architecture: same file, "TradeClaw — Signal Generation Architecture" section.
- Live signal entry points (the only ones that change production behavior):
  - apps/web/app/lib/signal-generator.ts
  - apps/web/app/lib/ta-engine.ts
  - apps/web/lib/tracked-signals.ts
- Existing billing surfaces:
  - apps/web/app/api/stripe/{checkout,webhook,portal}/route.ts
  - apps/web/app/dashboard/billing/page.tsx
  - apps/web/app/pricing/{page.tsx,PricingCards.tsx}
  - apps/web/lib/stripe.ts
  - apps/web/tests/e2e/pricing.spec.ts
- Broker integration target paths (create if missing):
  - apps/web/lib/brokers/binance.ts
  - apps/web/lib/brokers/mt5.ts
  - apps/web/lib/brokers/router.ts
  - apps/web/app/dashboard/integrations/{binance,mt5}/page.tsx
  - apps/web/app/dashboard/executions/page.tsx
- Reuse patterns from `tcasia-portal/` for MetaApi/MT5 integration if they exist there.
- Deploy is manual. `git push origin main` does NOT deploy.

Begin. One iteration. One commit. Stop on success or stop condition.
```

---

## Railway env vars Zaky must set before Track A4+ goes live

Set these in Railway dashboard → `tradeclaw` → `web` → Variables. The agent will stop and ask for any that are missing.

**Stripe (Track B)**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `STRIPE_PORTAL_RETURN_URL`

**Binance (Track A4–A5)**
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `BINANCE_TESTNET=true`  ← keep `true` until Zaky says otherwise
- `BROKER_AUTOEXEC_ENABLED=false`  ← keep `false` until A5 is reviewed
- `BROKER_KILL=false`  ← flip to `true` to stop all broker execution instantly

**MT5 / RoboForex (Track A6)**
- `METAAPI_TOKEN`
- `MT5_ACCOUNT_ID`
- `MT5_SERVER`
- `MT5_LOGIN`
- `MT5_PASSWORD`

---

## Notes for Zaky

- Track A wins ties on purpose. The agent will spend its first ~6–10 iterations on signal quality and Binance testnet integration before it touches checkout polish.
- The agent is forbidden from placing real trades. The first real-money order on each broker is yours to place manually after reviewing the integration.
- `BROKER_KILL=true` is a one-flag panic button — flip it on Railway and every execute path becomes a no-op within the next request cycle.
- Per-30-min cadence + ≤15 files/commit caps the blast radius. Worst case = revert one commit.
- When both ladders are green the agent stops on its own and reports DONE. That's your green light to move from "build the product" to "sell the product."
