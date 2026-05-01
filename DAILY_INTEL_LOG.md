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
