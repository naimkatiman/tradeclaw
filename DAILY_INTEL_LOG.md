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
