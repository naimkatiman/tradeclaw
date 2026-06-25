# Signal Data Lineage Maintainer Map

Status: documentation-only reference. Last updated: 2026-06-18 08:50 MPST (+0800).

This map documents how TradeClaw signal data moves from scanner/TA generation into API responses, persistence, broadcasts, and public track-record surfaces. It is a maintainer safety artifact, not a proposal to change trading behavior.

## Source-of-truth files inspected

| Surface | Files inspected | Why it matters |
|---|---|---|
| Public/current signal API | `apps/web/app/api/signals/route.ts` | Resolves caller tier, chooses live scanner file vs TA worker cache, applies regime + tier filtering, and returns `signals` plus public-safe `lockedSignals`. |
| Request-side signal path | `apps/web/lib/tracked-signals.ts` | Generates TA fallback signals, records request-side history rows, applies gates, merges premium signals, dispatches alert/social side effects, and filters by strategy access. |
| Scheduled signal writer/resolver | `apps/web/app/api/cron/signals/route.ts` | Authenticated 5-minute-ish cron path for precompute, candidate selection, dedupe, broadcast gate decisions, DB writes, outcome resolution, Pro Telegram catch-up, and run auditing. |
| Scanner file source | `scripts/scanner-engine.py`, `scripts/run-signal-engine-cron.sh`, `apps/web/lib/signals-live.ts` | Local Python scanner writes `data/signals-live.json`; the web app reads it when fresh and adequately covered, otherwise falls back to the TA worker path. |
| Tier/disclosure gates | `apps/web/lib/tier.ts`, `apps/web/lib/tier-client.ts` | Defines free/pro symbol coverage, 30-minute free delay, public-safe locked stubs, premium confidence hiding, TP/SL/indicator masking, and fail-closed tier resolution. |
| Signal history + outcomes | `apps/web/lib/signal-history.ts`, `apps/web/lib/signal-outcome.ts`, `apps/web/lib/signal-slice.ts`, `apps/web/lib/leaderboard-cache.ts` | Owns `signal_history` reads/writes, DB/file fallback, canonical win-rate predicates, outcome math, broadcast decision stamping, Telegram ledgers, and cache-backed analytics. |
| Broadcasts + notifications | `apps/web/lib/broadcast-decision.ts`, `apps/web/lib/telegram-pro-broadcast.ts`, `apps/web/app/api/cron/telegram/route.ts`, `apps/web/lib/discord-broadcast.ts`, `apps/web/lib/social-queue.ts`, `apps/web/lib/alert-channels.ts` | Shows which rows reach Pro Telegram, delayed public Telegram/Discord, user alert channels, and social queues. |
| Premium/feed surfaces | `apps/web/app/api/premium-signals/route.ts`, `apps/web/app/api/webhooks/tradingview/route.ts`, `apps/web/lib/premium-signals.ts`, `apps/web/lib/premium-signal-source.ts` | Maps DB-backed TradingView premium signals and optional hosted HTTP feed into the same read/history paths while preserving tier access. |
| Schema/migrations | `apps/web/migrations/*.sql` search for `signal_history`, `premium_signals`, `telegram_pro_message_id`, `broadcast_blocked`, `discord_posted_at`, `cost_estimate_pct` | Confirms the durable columns and ledgers the source code expects. |
| Operator/product docs | `README.md`, `docs/QUICKSTART.md`, `docs/ai-improvement/README.md`, `docs/ai-improvement/implementation-log.md` | Confirms public promises, self-host guidance, current backlog, and previously mitigated drift. |

## One-page lineage diagram

```text
Local scanner cron
  scripts/run-signal-engine-cron.sh
    -> scripts/scanner-engine.py
       -> scripts/signals.db                # local scanner cooldown/outcome memory
       -> data/scanner-health.json          # scanner health status
       -> data/signals-live.json            # fresh scanner output consumed by web
       -> optional generator-side Telegram alert for high-confluence scanner rows

Public/API read path
  GET /api/signals
    -> read session -> tier (fail closed to free)
    -> fetch regime map
    -> if data/signals-live.json is fresh, non-empty, and symbols_checked >= 8:
         map scanner rows -> regime filter -> tier filter -> delay split
       else:
         signal-worker cached TA fallback -> background getTrackedSignalsForRequest()
         -> regime filter -> tier filter -> delay split
    -> response: visible signals + lockedSignals stubs + engine provenance

Request-side side effects
  getTrackedSignalsForRequest() -> getTrackedSignals()
    -> getActivePreset() + safeProfileId() -> TA getSignals()
    -> full-risk / winning-cells gates
    -> recordSignalsAsync() -> signal_history
    -> invalidate signal-history cache
    -> fire-and-forget alert-rules dispatch
    -> enqueue high-confidence social posts
    -> merge premium DB/HTTP signals for allowed paid strategy access

Cron writer / resolver / Pro broadcast
  GET|POST /api/cron/signals (CRON_SECRET required)
    -> precompute signal-worker cache
    -> collectNewSignals(): scanner if fresh+covered, else TA fallback
    -> best per symbol+direction, market-hours filter, 2h dedupe
    -> catch up recent unposted tradable signal_history rows
    -> computeBroadcastDecisions(): winning-cells + risk pipeline
    -> record new signal_history rows with strategy/provenance/gate/cost metadata
    -> late-stamp broadcast decisions on catch-up rows
    -> resolve old 4h/24h outcomes from OHLCV candles
    -> broadcast approved rows to Pro Telegram group
    -> record signal-run audit row

Premium / TradingView path
  POST /api/webhooks/tradingview (x-tv-secret required)
    -> validate allowed TV strategy id + payload
    -> insert premium_signals
    -> mirror into signal_history through recordSignalsAsync()
    -> optional paper-trading demo auto-follow on first insert

Track-record and public proof
  signal_history + outcome resolver
    -> /api/signals/history
    -> /api/signals/equity
    -> /api/strategy-breakdown
    -> leaderboard/cache surfaces
    -> delayed public Telegram/Discord cron
```

## Active data stores and ledgers

| Store / column family | Writer(s) | Reader(s) | Maintainer note |
|---|---|---|---|
| `data/signals-live.json` | `scripts/scanner-engine.py` | `readLiveSignals()` from `/api/signals` and cron collector | File is accepted only while fresh and with enough symbol coverage. Missing/stale file is expected on some hosted/self-host deployments and triggers TA fallback. |
| `scripts/signals.db` | `scripts/scanner-engine.py` | Scanner win-rate/cooldown helpers, local research scripts | Local scanner memory, not the product track-record source of truth. Do not confuse it with Postgres `signal_history`. |
| `signal_history` base fields | `recordSignalAsync()`, `recordSignalsAsync()`, TradingView mirror | Track record, equity, strategy breakdown, broadcast jobs, outcome resolver | Durable public proof table. `id` is the dedupe key; 2h symbol+direction logic prevents noisy repeats before write. |
| `signal_history.outcome_4h/outcome_24h` | `resolveRealOutcomes()`, `/api/cron/signals` resolver | Stats, equity, history, leaderboard, strategy breakdown | Use `isCountedResolved()` for denominators; it excludes simulated, gate-blocked, and expired placeholder rows. |
| `signal_history.gate_*` | `tracked-signals.ts`, cron signal writer | Track-record filters, safety analytics, catch-up broadcast filters | Gate-blocked rows are recorded for transparency but should not be sent as tradable alerts. |
| `signal_history.broadcast_*` | Cron `computeBroadcastDecisions()` and late-stamp path | `scope=broadcast`, Pro broadcast analytics | `broadcast_blocked === false` means a real gate approved it. `NULL` means no recorded decision, not approval. |
| `signal_history.telegram_message_id` | Public/free Telegram cron callback/update | Public Telegram reply threading and dedupe | Public/free channel ledger; separate from Pro group message IDs. |
| `signal_history.telegram_pro_message_id` | `broadcastSignalsToProGroup()` | Pro dedupe + threaded outcome replies | Pro group ledger. Do not reuse public Telegram message IDs because chat namespaces differ. |
| `signal_history.discord_posted_at` | `broadcastSignalsToDiscord()` | Discord broadcast dedupe | Independent from Telegram ledgers. |
| `premium_signals` | `POST /api/webhooks/tradingview` | `getPremiumSignalsFor()`, delayed free preview, `/api/premium-signals` | DB-backed paid strategies; mirrored into `signal_history` so performance is measured with the shared resolver. |
| Remote premium feed | `fetchPremiumFromHttp()` | `tracked-signals.ts` premium merge | Optional hosted augment behind `PREMIUM_SIGNAL_SOURCE_URL` + key. Missing or failing remote returns `[]` and must not break free/self-host paths. |

## Read-path contract: `/api/signals`

1. **Tier resolution is first and fail-closed.** Anonymous users and tier lookup errors resolve to `free`.
2. **Live scanner data wins only when healthy enough.** The route requires a non-stale live file, at least one signal, and `symbols_checked >= 8` before serving scanner rows.
3. **TA worker fallback remains the safety path.** When the live file is absent/stale/degraded, `getSignalsCached()` serves the response while `getTrackedSignalsForRequest()` runs side effects in the background.
4. **Regime filtering happens before tier delay splitting.** Both scanner and fallback paths call `filterSignalsByRegime()` before returning results.
5. **Free-tier disclosure is intentionally narrow.** `filterSignalByTier()` removes disallowed symbols, hides premium-confidence signals, masks stop/TP2/TP3 and advanced indicators, then `splitDelayed()` returns only public-safe `lockedSignals` stubs for fresh free-tier rows.
6. **Engine provenance must stay honest.** Scanner responses report `engine.source = tradingview-confluence`; fallback responses include a note explaining stale/missing live scanner file.

## Write-path contract: `signal_history`

- **Writer A: request-side side effect.** `tracked-signals.ts` records real TA signals when request traffic hits signal-reading surfaces. It is throttled in-process and deduped in DB/file fallback.
- **Writer B: cron writer.** `/api/cron/signals` records the best candidate per symbol+direction after market-hours and 2h duplicate checks. It stamps the effective strategy/provenance and modeled cost metadata.
- **Premium mirror writer.** The TradingView webhook writes `premium_signals` first, then mirrors the same source ID into `signal_history` for outcome tracking.
- **Outcome resolver.** Both request-side and cron resolution delegate to `resolveFromCandles()`, where SL wins same-candle conflicts conservatively and 4h/24h outcomes carry resolution provenance.
- **Canonical denominator.** Any surface computing win rate, resolved counts, P&L, or equity should use `isCountedResolved()` or a helper that does, rather than inventing its own filter.

## Broadcast and notification contract

| Channel | Source rows | Timing / gate | Ledger |
|---|---|---|---|
| Pro Telegram group | New cron candidates + recent catch-up rows from `signal_history` | 5-minute cron path; only rows with `computeBroadcastDecisions().blocked === false`; Telegram failures do not block history recording | `telegram_pro_message_id` |
| Free/public Telegram channel | `signal_history` rows for `FREE_SYMBOLS` | `/api/cron/telegram`; confidence >= 80; created in last 2h and at least 30 minutes old; one pair+direction per 2h | `telegram_posted_at`, `telegram_message_id` |
| Discord public channel | Same free-tier signal class as public Telegram | `/api/cron/telegram`; independent webhook opt-in | `discord_posted_at` |
| Per-user alert rules | Request-side tradable payload | Fire-and-forget self-HTTP dispatch to `/api/alert-rules/dispatch` when `NEXT_PUBLIC_APP_URL` exists | Delivery handled by alert-channel implementation |
| Social queue | Request-side tradable payload | High-confidence rows enqueue OG-image social copy | `social_post_queue` |
| Scanner-side Telegram alert | Python scanner confluence rows | Generator-side immediate alert helper for high-confluence scanner output | `data/telegram-alert-state.json` |

## Public proof surfaces

- `/api/signals/history` is intentionally public for product trust. It uses `getResolvedSlice()` and does not gate normal JSON history by caller tier; CSV export is Pro-gated.
- `scope=free` narrows to free symbols and the free history window. `scope=pro` shows full marketing proof. `scope=broadcast` includes only rows where a real broadcast decision approved the signal.
- `/api/strategy-breakdown` is tier-aware: it filters rows by the caller's unlocked strategies.
- `leaderboard-cache.ts` caches period variants in Redis when available and in memory otherwise. Cache invalidation must happen after history/outcome writes.

## Invariants to protect

1. **Do not leak fresh trade levels to free callers.** Any field added to `LockedSignalStub`, `filterSignalByTier()`, or `/api/signals` must be reviewed as a disclosure decision.
2. **Do not stamp labels that did not generate rows.** When `SIGNAL_ENGINE_PRESET` maps to a fallback profile, record the effective profile or explicit scanner source, not the marketing label.
3. **Do not treat `broadcast_blocked = NULL` as approved.** It means the broadcast gate did not record a decision.
4. **Do not merge local scanner metrics with public track-record metrics.** `scripts/signals.db` and `signal_history` have different semantics and win definitions.
5. **Do not let notification outages block recording.** Telegram/Discord/social/user-alert delivery remains fire-and-forget or separately observable.
6. **Do not rewrite schema/trading behavior from this map.** Schema, strategy semantics, live preset generation, risk gates, subscription gates, and broker execution changes remain owner/Fatin approval-required.

## Safe verification checklist for future edits

Use the smallest credible check for the touched surface:

- `/api/signals` tier/disclosure: targeted tests around `filterSignalByTier()`, `splitDelayed()`, `lockedSignals`, symbol filtering, premium confidence hiding, and cache headers.
- `signal_history` stats: tests around `isCountedResolved()`, `getResolvedSlice()`, `resolveFromCandles()`, and affected route stats.
- Broadcast changes: targeted tests for `computeBroadcastDecisions()`, `getUnpostedProSignalsAsync()`, `broadcastSignalsToProGroup()` dedupe, and public Telegram/Discord row filters.
- Scanner changes: run the scanner in a safe local environment, validate generated `signals-live.json` shape, then verify `/api/signals` fallback behavior when the file is missing/stale.
- Docs-only changes: read-back, source-token checks, manifest parse when commands are mentioned, and `git diff --check`.

## Recommended next move

Next safe autonomous increment: extend the existing helper-level tier coverage into a narrow route-response contract test for `/api/signals` if the route test harness is clear. `apps/web/lib/__tests__/tier.test.ts` already covers `filterSignalByTier()`, `splitDelayed()`, `toLockedStub()`, free masking, premium-band blocking, and Pro detail preservation; the remaining value is proving the assembled API response preserves that helper contract for `signals` and `lockedSignals` without changing trading logic, schemas, env vars, auth, billing, or deployment targets.
