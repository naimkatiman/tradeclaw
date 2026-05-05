# TradeClaw Daily Intel — Idea Log

Append-only. Cron job `a2e2195c-f133-4e0e-90a0-fc8acb559d79` reads the last 14 days before proposing new ideas to avoid repetition.

## 2026-04-18
1. [UX] Add "why this signal" explainer next to each card, especially when signal flips
2. [Performance] Make backtests and calibration incremental — PR checks rerun only changed symbols/timeframes
3. [Growth] Ship live demo with seeded sample data and loud star CTA on first screen
4. [Fix] Replace global ATR stop with per-symbol calibration from outcome history (gold, FX, BTC differ)
5. [Feature] Shareable signal cards with permalink, chart snapshot, and Telegram/Discord-ready embed
## 2026-04-20
1. [Feature] Add a `/supabase` migration hub with `docs/SUPABASE.md`, `schema.sql`, and env examples for the new Postgres-backed data surfaces
2. [Feature] Extend `/screener`, `/dashboard`, and `/portfolio` with S&P 500 top-20 symbol support
3. [Growth] Ship `packages/tradeclaw-extension/manifest.json` plus a `/chrome-extension` install page for live signal badges
4. [Fix] Show an explicit outage state and last-success timestamp on `/news` when `/api/news` falls back
5. [UX] Add scanner health, last run, and last failure details to `/status` for `scripts/scanner-engine.py`

## 2026-04-30
1. [Growth] Launch `/strategies/leaderboard` so users can submit strategy JSON, auto-backtest it server-side, and share a public Sharpe-ranked board—this turns community experiments into viral proof instead of isolated local runs. — source: STATE.yaml TC-164 pending
2. [Feature] Ship `/copilot` as a no-LLM signal assistant that answers from live `/api/signals` data with inline card previews, giving first-time visitors a guided way to explore which pair looks strongest without reading the whole dashboard. — source: STATE.yaml TC-165 pending
3. [UX] Add a “last matched signal / last delivery result” debug panel on `/alerts` so users can see why a rule fired or stayed quiet without opening server logs. — source: AUDIT_REPORT.md flags `/alerts` as partial and still needing full verification
4. [Fix] Add a deterministic fixture mode on `/backtest` that locks candles and inputs, then shows a shareable run checksum beside results so users can compare indicator math across machines without guessing. — source: AUDIT_REPORT.md flags `/backtest` as partial due to complex TA verification
5. [Fix] Add a “Canonical scheduler: system cron” badge with last-success timestamp on `/status` so policy-blocked agent exec attempts stop reading like real scanner outages. — source: scripts/signal-errors.log entries on 2026-04-29 show false-failure noise after the system cron was already healthy

## 2026-05-01
1. [Growth] Turn the existing `apps/web/lib/asset-requests.ts` API into a public `/asset-requests` page where visitors can vote for SOLUSD/NVDA/USOIL and subscribe for launch alerts, so discussion #30 becomes structured demand instead of dead comments. — source: GitHub discussion #30 + existing `/api/asset-requests*` routes with no user-facing page
2. [Feature] Add one-click MT5/OANDA/Alpaca webhook templates plus a “send test payload” flow inside `apps/web/app/brokers/BrokersClient.tsx` and `/settings/webhooks`, so the broker demand in discussion #27 turns into an actual handoff surface instead of docs-only cards. — source: GitHub discussion #27 broker integration requests
3. [UX] Split `/proof` and `/accuracy` into “Real tracked” vs “Simulated demo” tabs and show expectancy/max drawdown beside win rate, so skeptical users land on audited metrics first instead of having to infer what is seeded. — source: GitHub discussion #31 on accuracy methodology + `apps/web/app/proof/ProofClient.tsx` and `apps/web/app/accuracy/AccuracyClient.tsx`
4. [Fix] Add TradingView-provider cooldown/backoff in `scripts/scanner-engine.py` and expose the active upstream-degraded state on `/status`, so repeated 429 storms stop hammering all symbols silently and users can see when the issue is provider-side. — source: `scripts/signal-errors.log` shows repeated 2026-04-02 TradingView 429 failures across all symbols

## 2026-05-02
1. [Feature] Ship `/pilot` dashboard surfacing the Binance Futures executor state — open positions, day/week realized PnL against kill-switch thresholds, blocked-pyramid attempts, TP1 partial-close events — so the gates added in `a45384b0/bc6bcf4c/c29ef2e8/3bbbb4ec` are visible instead of server-side-only. — source: pilot commits landed without a UI surface
2. [Performance] Wrap the new Pro group broadcaster from `3bb53091/a5ed1c67` with Telegram 429-aware backoff plus a persistent retry queue, then expose broadcast queue depth and last-broadcast latency on `/status`, so a Pro signal burst during Telegram throttling does not silently drop alerts. — source: commits 3bb53091 + a5ed1c67 ship Pro broadcast with no observable rate-limit handling
3. [Feature] Add a `GET /api/metrics` Prometheus exposition (signal cadence, broadcast queue depth, pilot exec count, Stripe active-Pro count, MRR) — closes the still-open issue #19 from 2026-03-27. — source: GitHub issue #19
4. [Growth] Use the per-channel platform routing introduced in `1694a59d` to add a Discord bot variant of the Pro signal broadcaster — closes issue #38 (open since 2026-04-01) and matches the broker-channel demand in discussion #27. — source: GitHub issue #38 + commit 1694a59d
5. [Fix] Add an outcome-resolution heartbeat tile on `/status` plus a staleness banner on `/track-record` and `/leaderboard` that fires when `signal_history` rows have not been resolved in >15 min — Writer B (cron `/api/cron/signals` `resolveOldSignals`) is the only resolver per workspace CLAUDE.md, so equity and win-rate go silently stale if it stalls. — source: workspace CLAUDE.md TradeClaw signal-architecture section

## 2026-05-03
1. [Fix] Deep-link the past-due banner straight to Stripe's card-update form via `billing_portal.sessions.create` with `flow_data: { type: 'payment_method_update', after_completion: { type: 'redirect', redirect: { return_url: ... } } }`, so dunning users land on the card form instead of the portal home. — source: commit ccbc998c added the banner with a generic portal CTA; Stripe portal `flow_data` API
2. [Growth] Add a T-3d trial-ending email variant alongside the T-1d one in `apps/web/lib/trial-end-email.ts`, listing the top 3 Pro-only signals the user has consumed during trial (with realized P&L if paper-traded), so the cancel decision is anchored to concrete missed P&L instead of just a countdown. — source: commit d390d50b shipped only the T-1d reminder; trial-end logic in same file
3. [Feature] Promote the admin `scripts/resend-pro-invites.ts` flow into a self-serve "rejoin Pro Telegram group" button on `/dashboard/billing` for active-Pro users, gated by Stripe-tier check + 1/hr rate limit, so kicked-then-rejoined users do not have to DM support. — source: commit a99fda70 ("script for fixing broken group invites") implies recurring breakage that today requires manual intervention
4. [UX] Recompute and cache the resolved outcome on `/api/og/signal/[id]` so OG cards shared 4h+ after entry render the TP1/TP2/SL state from `classifySignalOutcome` instead of the stale entry-time confidence — old screenshots stay accurate proof instead of going contrarian when a signal stops out. — source: commit 182fd918 added live TP/SL outcome badge on dashboard cards but did not propagate to OG image
5. [Fix] Add a `/admin/stripe-events` table that reads the idempotent webhook ledger from `2f141171`, filterable by customer email, with last 14d of `event_id`/`type`/`status`, so "I paid but I'm still on free" tickets resolve in one click without psql access. — source: commit 2f141171 added the ledger server-side only; admin dashboard scaffolding from 8506b457

## 2026-05-04
1. [UX] Add a browser-push diagnostics panel to `apps/web/app/settings/alerts/page.tsx` and the onboarding alert step so users can see permission state, subscription age, and last successful push instead of guessing whether web alerts are armed. — source: commits `fcebb831` (real-time web push via VAPID) + `458aa556` (onboarding step 3 enables browser alerts)
2. [Feature] Add a billing lifecycle timeline on `/dashboard/billing` that shows `trial_end`, dunning email sent, past-due grace expiry, and current Telegram invite status in one card, so users understand exactly why access changed before they churn. — source: commits `d390d50b`, `ccbc998c`, `4d684455`, and `086c5ff0`
3. [Fix] Persist Telegram access diagnostics on the user-facing billing/onboarding surface — last `sendInvite` attempt, `chat_not_found` / `bot_blocked`, and retry CTA — instead of surfacing those states only in transient send paths. — source: commits `5bf72a12` + `e5dff155`
4. [Growth] Add a “share this week’s pulse” export on `apps/web/app/report` that renders the same stats as GitHub discussion #65 into a Telegram/X/Discord-ready image, turning the weekly report into a distribution asset instead of a GitHub-only update. — source: discussion #65 + existing `/report` surface
5. [Fix] Add a `/admin/cron-health` fanout target checker that shows localhost vs public-host target, last sub-cron latency, and mismatch warnings, so the `127.0.0.1` regression fixed in `01f3066c` is caught before cron fanout silently misses jobs. — source: commit `01f3066c`

