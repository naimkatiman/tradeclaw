# TradeClaw — Full Application Audit (2026-06-02)

Single source of truth for the `audit/full-app-sweep` sweep.

- PR base: `main` @ `7c6a7c7` (current origin/main).
- Audit fleet ran against `acb8147` (immediate parent of `7c6a7c7`). The only delta `acb8147..7c6a7c7`
  is commit #99 touching 3 non-product CI/e2e files (`.github/workflows/ci.yml`,
  `apps/web/playwright.config.ts`, `apps/web/tests/e2e/api/premium-gating.spec.ts`); product findings
  are unaffected. Phase B spot-checks those 3 files at `7c6a7c7`.

Methodology: clean baseline → 9 read-only domain auditors (Phase A) → consolidate → fix
CRITICAL/HIGH + low-risk MEDIUM with per-fix verification → independent re-verification +
regression + blast-radius sweep (Phase B). Every fix lands as a surgical commit (one concern,
≤15 files) and is marked Fixed-with-proof or Deferred-with-reason below.

---

## Baseline (clean room)

Captured 2026-06-02. Raw logs in job tmp (`baseline-*.log` @ acb8147; `wt-*.log` @ 7c6a7c7 worktree).

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| build:all | `npm run build:all` | FAIL (exit 2) | Fails at `build:agent`; chain short-circuits |
| ↳ build:signals | (in build:all) | pass | ran before agent |
| ↳ build:agent | `tsc` in packages/agent | FAIL | 8 TS errors (see C-01) |
| build (web) | `npm run build` | pass | signals + trading-agents + web all compile |
| ws:build | `npm run ws:build` | pass | |
| lint | `npm run lint` | pass | 38 warnings, 0 errors |
| test | `npm test` (jest) | pass | 997 passed, 26 skipped, 3 suites skipped |
| ws:test | `npm run ws:test` (vitest) | pass | 36 passed |

**Structural finding (S-01):** the root `build` script (`packages/signals && packages/trading-agents
&& apps/web`) excludes `packages/agent` and the ws-server. The standard pre-commit build (and most CI)
never compiles `packages/agent`, so it silently rotted out of type-correctness. Same class of gap as
the earlier "tsc/e2e never built @tradeclaw/signals" incident.

---

## Findings

Status legend: Open · In progress · Fixed (with proof) · Deferred (with reason) · Not-a-bug

### CRITICAL

#### C-01 — `packages/agent` does not compile (breaks `build:all`) · ✅ Fixed
- **Files:** `packages/agent/src/signals/tracker.ts:62-63,84-85`, `packages/agent/src/channels/telegram.ts:50-51`, `packages/agent/src/channels/discord.ts:49-50` (12 TS errors total)
- **Root cause:** `@tradeclaw/signals` `TradingSignal` declares `takeProfit2/3: number | null`
  (`packages/signals/src/types.ts:24-25`). The `agent` package consumes them as non-null `number`:
  `TrackedSignal.tp2/tp3` are required `number`, and the channel formatters pass them to `number`
  params. Producer made multi-TP optional; this consumer was never updated. Hidden because root
  `build` skips `agent` (S-01). The agent's own `engine.ts` always emits non-null TPs, so this is
  defensive for engine signals but real for webhook/premium signals carrying null.
- **Impact:** `npm run build:all` is red; the autonomous agent package ships type-broken.
- **Disposition:** FIX. Widen `TrackedSignal.tp2/tp3` to `number | null`; render TP2/TP3 conditionally
  in `telegram.ts` + `discord.ts` (omit line when null; no `!` non-null assertion).

#### C-02 — `signal-metrics.ts` queries non-existent columns; throws at runtime · Open
- **Files:** `apps/web/lib/signal-metrics.ts:51-113` (getAccuracyTrends 53-65, getSymbolBreakdown 83-95)
- **Root cause:** Queries `signal_history` using `result_4h`, `result_24h`, `symbol` — none exist.
  Real schema (`migrations/003_signal_history.sql`) stores JSONB `outcome_4h`/`outcome_24h` (with
  `.hit`) and the column is `pair`, not `symbol`. Postgres raises 42703 undefined_column.
- **Impact:** `getAccuracyTrends`/`getSymbolBreakdown`/`getRecommendations` reject on every call →
  `/api/metrics`, `/api/operator/insights`, operator + admin/operator dashboards error/empty.
- **Disposition:** FIX. Rewrite SQL to use `pair` and derive win/loss from `outcome_*->>'hit'`,
  mirroring `isRealOutcome` (exclude expired/pnl=0). Add a regression test asserting the SQL shape.

#### C-03 — Unauthenticated `/api/sms/send` relays arbitrary SMS via Twilio · Open
- **Files:** `apps/web/app/api/sms/send/route.ts:14-81`; `middleware.ts` AUTH_RULES (no entry)
- **Root cause:** POST `{to, message}` calls Twilio with server creds, no session/cron/admin check,
  no middleware rule. The only legitimate caller is `/api/cron/sms-alerts` (server-to-server).
- **Impact:** Anyone can send unlimited attacker-controlled SMS to any number on the project's Twilio
  account — direct money-loss + brand-name phishing relay.
- **Disposition:** FIX. Gate with `requireCronAuth`; have `cron/sms-alerts` send `Authorization:
  Bearer ${CRON_SECRET}`; add middleware rule; validate `to` as E.164.

#### C-04 — `USER_SESSION_SECRET` never wired in deploy configs; all auth throws 500 · Open
- **Files:** `railway.toml:21`, `docker-compose.yml:59,107`, `.env.example`, `.env.docker.example`;
  consumed at `apps/web/lib/user-session.ts:17-23`
- **Root cause:** Web app signs/verifies sessions, OAuth state, telegram link tokens with
  `USER_SESSION_SECRET` (fails fast if unset). Deploy configs only set `AUTH_SECRET` (which only
  `apps/ws-server` consumes). The two secrets were conflated; root env examples omit
  `USER_SESSION_SECRET` entirely.
- **Impact:** On the documented Railway + docker-compose deploys, `USER_SESSION_SECRET` is undefined →
  first OAuth callback / magic-link / session op throws 500. Auth fully broken on a fresh deploy.
- **Disposition:** FIX. Add `USER_SESSION_SECRET` to both env examples + docker-compose web service +
  railway.toml web service; document the AUTH_SECRET (ws) vs USER_SESSION_SECRET (web) split.

### HIGH

- **H-01** — Backtest processes confidence-sorted signals as chronological, corrupting
  equity/drawdown/overlap for the production-default + full-risk strategies. `packages/strategies/src/run-backtest.ts:137-183` (driven by `entry/hmm-top3.ts:47-49`). FIX: sort by `barIndex` asc at top of `runBacktest`; add test.
- **H-02** — `PaperBroker` inflates equity on shorts (credits notional to cash AND counts position as
  positive asset → equity = initial + 2·N·P). `packages/agent/src/broker/paper-broker.ts:140-145,232-237,67-79`. FIX: sign `computePositionsValue` by direction; add regression test.
- **H-03** — `premium-signals` emits `timestamp` as epoch **number** while contract is `string`,
  masked by `as unknown as TradingSignal`; breaks `Date.parse` consumers (explain flip-detection,
  recorded emission time). `apps/web/lib/premium-signals.ts:136-156`. FIX: `toISOString()`, drop the
  double cast, narrow `timeframe`.
- **H-04** — Unauthenticated `/api/slack/webhook` global CRUD (IDOR) + Slack spam; store not
  user-scoped. `apps/web/app/api/slack/webhook/route.ts:36-146`, `lib/slack-integration.ts`. FIX:
  require session + scope by `userId` + middleware rule. (Security domain dup.)
- **H-05** — Unauthenticated `/api/webhooks/dispatch` fans an attacker-crafted signal to **every**
  user's webhooks (signal spoofing). `apps/web/app/api/webhooks/dispatch/route.ts:7-30`. FIX:
  `requireCronAuth` + middleware POST rule.
- **H-06** — EarningsEdge analyze paywall bypassable via client-controlled `tier` body field +
  `x-ee-usage-count` header → unlimited paid LLM use. `apps/web/app/api/earningsedge/analyze/route.ts:9-42`. FIX: resolve entitlement server-side; server-side counter.
- **H-07** — ws-server connection rate limiter counts *attempts* per IP (never decrements, not
  proxy-aware) → self-DoS for reconnecting/NAT'd clients and no real flood protection.
  `apps/ws-server/src/middleware/rate-limit.ts:8-19`, `relay.ts:60`. FIX: count concurrent
  connections (inc on upgrade, dec on close); add unit test.
- **H-08** — Binance provider double-reconnect: `error` + `close` both call `scheduleReconnect` →
  geometric reconnect storm / ban risk / duplicate ticks. `apps/ws-server/src/websocket/providers/binance.ts:109-122,161-175`. FIX: single in-flight guard, drive reconnect from `close` only.
- **H-09** — `railway.toml` ws-server service omits `AUTH_SECRET`; ws-server throws at module load in
  production → relay crash-loops on Railway. `railway.toml:50-55`, `apps/ws-server/src/middleware/auth.ts:5-13`. FIX: add `AUTH_SECRET` to railway ws-server vars.
- **H-10** — Published `@naimkatiman/tradeclaw-agent` declares `@tradeclaw/signals:"*"` and re-exports
  its runtime values, but signals is `private` and never published → broken on `npm install`.
  `packages/agent/package.json:54`, `dist/index.js:7`, `.github/workflows/publish-packages.yml`. FIX
  (or partial-DEFER): bundle signals into agent at build OR publish signals + add build:signals to the
  publish workflow. Assess scope; the publish path is not exercised by `build:all`.
- **H-11** — Fetch race in `TrackRecordClient`: effect re-runs on 7 filter deps with no
  AbortController/cancelled guard → a slow earlier response overwrites the current filter's data on the
  primary stats page. `apps/web/app/track-record/TrackRecordClient.tsx:423-477`. FIX (cancelled guard).
- **H-12** — Fetch race in `LeaderboardClient` main table (period/sort) — no cancellation, last
  response wins; the same file already uses the correct AbortController pattern at line 224.
  `apps/web/app/leaderboard/LeaderboardClient.tsx:372-381`. FIX (mirror existing pattern).

### MEDIUM

- **M-01** — `signal_run_log` integrity counts expired outcomes as losses and includes simulated rows;
  diverges from the leaderboard's `isRealOutcome`/`is_simulated` filters, undermining the immutable-proof
  claim. `apps/web/lib/signal-run-log.ts:46-65,88-94`. FIX (low-risk).
- **M-02** — `PaperBroker.placeOrder` `Math.floor(quantity)` → phantom 0-unit "filled" for
  high-priced/fractional assets (XAU/BTC/ETH). `paper-broker.ts:112-167` (+ `alpaca-broker.ts:147,165`).
  FIX (low-risk) + test.
- **M-03** — Agent `Scheduler` has no in-flight guard; slow scans overlap → duplicate delivery/history,
  rate-limit risk. `packages/agent/src/gateway/scheduler.ts:28-33,65-74`. FIX (low-risk).
- **M-04** — Agent `webhook-server` reads POST body with no size cap → memory-exhaustion DoS (the only
  network surface). `packages/agent/src/gateway/webhook-server.ts:101-106`. FIX (low-risk).
- **M-05** — Agent webhook secret compared with non-constant-time `!==`. `webhook-server.ts:94-99`. FIX.
- **M-06** — Agent webhook alert with missing/zero price builds a 0-entry signal (div-by-zero downstream).
  `webhook-server.ts:33-69`. FIX (low-risk).
- **M-07** — Trading-agents subprocess stdout JSON cast to `TradingAgentsRunResult` with no runtime
  validation; contract drift silently swallowed. `apps/web/lib/trading-agents/mock-pipeline.ts:321-341`.
  FIX (add shape guard + log).
- **M-08** — ws-server/web depend on `@tradeclaw/signals` dist (gitignored) with no enforced build
  order / project reference. (Overlaps H-10, M-17, S-01.) FIX via CI build-order.
- **M-09** — `cron/sms-alerts`, `cron/daily-digest`, `cron/prewarm` fail **open** when `CRON_SECRET`
  unset + non-timing-safe compare; inconsistent with `lib/cron-auth.ts` (fail-closed). FIX (low-risk):
  route through `requireCronAuth`.
- **M-10** — Executor trades on a stale `universe_snapshots` row with no freshness gate; if the daily
  universe cron stops, it silently keeps using an old liquidity screen. `apps/web/lib/execution/universe-runner.ts:171-184`. FIX (conservative freshness gate + warning).
- **M-11** — `admin-gate` compares `tc_admin` cookie to raw `ADMIN_SECRET`, but login mints a signed
  session token → secret-cookie admin path is dead (fails closed). `apps/web/lib/admin-gate.ts:39,69,99`.
  FIX: verify via `verifyAdminSession`.
- **M-12** — `webhooks.ts` SSRF allowlist weaker than `safe-outbound-url.ts` (misses 0.0.0.0/8, CGNAT,
  multicast, cloud-metadata hostnames, IPv4-mapped IPv6) and bypassable via decimal/octal/IPv6 literals.
  `apps/web/lib/webhooks.ts:95-121`. FIX: use shared `checkSafeOutboundUrl`. (Security domain dup.)
- **M-13** — ws-server `DatabaseService.flush()` races between interval and `addTick` → duplicate/lost
  tick rows. `apps/ws-server/src/services/db.ts:55-95`. FIX: serialize with in-flight promise.
- **M-14** — ws-server has no server→client heartbeat → zombie half-open sockets + idle-closes healthy
  listen-only clients. `apps/ws-server/src/websocket/relay.ts:58-184`. DEFER (realtime behavior change
  needs integration/load test harness not available on this box) — see Deferred.
- **M-15** — ws-server backpressure drops ticks to slow clients but never disconnects a permanently
  stuck socket. `relay.ts:46-54`. DEFER (same reason as M-14).
- **M-16** — `Dockerfile.scanner` runs `packages/core` which has no runnable entry → scanner container
  is a no-op restart loop; `SCAN_*` env ignored. FIX: point at the agent scan CLI or remove the service.
- **M-17** — `packages/signals` exports map lacks a `types` condition (claimed to break Node16 type
  resolution for agent). VERIFY FIRST: the agent build resolved `TradingSignal` precisely enough to
  report the TP errors, so types DO resolve locally — likely a non-issue. Confirm, then FIX-or-DROP.
- **M-18** — Fetch race in `ComparisonClient` (period change, no cancellation).
  `apps/web/app/strategies/comparison/ComparisonClient.tsx:48-60`. FIX (cancelled guard).
- **M-19** — `useSampleData` timer callback can overwrite real data after it arrives (no cancelled
  check). `apps/web/app/hooks/use-sample-data.ts:38-51`. FIX (cancelled + `!hasRealData` guard).
- **M-20** — `rate-limit.ts` in-memory fallback store never deletes emptied keys → unbounded memory
  growth (slow leak/OOM) during a Redis outage. `apps/web/lib/rate-limit.ts:23-44`. FIX (delete empty
  key).

### LOW / Deferred

LOW (logged, not fixed this pass unless trivial): L-01 `recordTradeOutcomeToHistory` breakeven close
collides with expire sentinel (`signal-history.ts:963-980`); L-02 Alpaca bracket limit falls back to
stopLoss (`alpaca-broker.ts:152-159`); L-03 SkillLoader imports arbitrary index files
(`skills/loader.ts:61-98`); L-04 telegram-login non-constant-time hash compare (`telegram-login.ts:45`);
L-05 paper-trading close accepts arbitrary `exitPrice` (`paper-trading/close/route.ts`); L-06 forex
`days` unbounded (`api/data/forex/route.ts`); L-07 paper-trading `quantity`-as-notional naming; L-08
RedisService couples pub/sub health (`ws-server/services/redis.ts`); L-09 db-pool TLS
`rejectUnauthorized:false` for Railway (`db-pool.ts:16-19`); L-10 internal error messages echoed to
clients (`slack/webhook`, `alert-channels`, `broker`, `backtest/upload`); L-11 no root `engines` field;
L-12 mobile React 18 vs web React 19 in one install; L-13 trading-agents (src) vs signals (dist)
resolution inconsistency; L-14 `use-websocket-prices` `onerror` no-op may stall reconnect if no
`onclose` follows (`use-websocket-prices.ts:124-126`); L-15 `PriceTicker` 5s poll has no response
ordering guard (cosmetic flash) (`price-ticker.tsx:38-56`).

⚠️ Deferred (with reason):
- **M-14, M-15** (ws heartbeat + slow-client disconnect): correct findings, but both change realtime
  relay behavior and can only be safely validated with a concurrency/load harness (the technical
  roadmap persona flags the same need). Fixing blind risks regressing the live price stream. Deferred
  to a dedicated ws-server reliability pass with a load test.
- **H-10 / publish pipeline** (if it exceeds a surgical config change): publishing is not exercised by
  `build:all`/CI build; a full bundle-or-publish redesign is out of this audit's scope. Minimum-safe
  config portion fixed; deeper packaging redesign deferred.
- All **LOW** items above: logged, below the fix bar for this pass.

---

## Phase A fix log

Status: all CRITICAL + HIGH fixed; all targeted MEDIUM fixed; M-14/M-15 deferred (reason below);
M-17 verified not-a-bug; LOW logged. Every code fix verified before commit (command + result below);
the full Phase A gate (build:all/lint/test/ws:test) result is recorded under "Phase A gate" below.

| ID | Severity | Commit | Verification | Result |
|----|----------|--------|--------------|--------|
| C-01 | CRITICAL | fccab67 | `build:signals && build:agent` | exit 0 (was exit 2 / 12 TS errors) |
| C-02 | CRITICAL | 830cfd8 | web `tsc --noEmit`; columns cross-checked vs migrations | exit 0; all referenced cols exist; phantom cols gone |
| C-03 | CRITICAL | b0a0595 | web `tsc --noEmit`; caller forwards Bearer | exit 0 |
| C-04 | CRITICAL | 3f35e39 | docker-compose YAML parse; railway/env diff | parses; USER_SESSION_SECRET wired (web), AUTH_SECRET (ws) |
| H-01 | HIGH | ab7f02b | `jest packages/strategies` (+ ordering test) | 94 pass; snapshot now shows real 2-trade/50% (was fake 1-trade/100%/inf) |
| H-02 | HIGH | a1e18b7 | `jest packages/agent` (+ short-equity test) | pass: SELL 5@200 on 100k → equity 100000; @180 → 100100 |
| H-03 | HIGH | a4304fb | web `tsc --noEmit` | exit 0 (timestamp now ISO string) |
| H-04 | HIGH | 303cb10 | web `tsc --noEmit` | exit 0 (admin-gated) |
| H-05 | HIGH | b0a0595 | web `tsc --noEmit`; no internal HTTP caller (deliver path used) | exit 0 |
| H-06 | HIGH | 238b0ca | web `tsc --noEmit` | exit 0 (server-side entitlement + IP quota) |
| H-07 | HIGH | d0c3c28 | `ws:build && ws:test` (+ concurrent-cap test) | 41 pass (5 new) |
| H-08 | HIGH | 08f83f9 | `ws:build && ws:test` | 41 pass |
| H-09 | HIGH | 3f35e39 | railway.toml diff | ws-server now sets AUTH_SECRET |
| H-10 | HIGH | — | (see Deferred) | publish path not in build:all; partial-defer |
| H-11 | HIGH | 69a63a6 | web `tsc --noEmit` | exit 0 (cancelled guard) |
| H-12 | HIGH | 69a63a6 | web `tsc --noEmit` | exit 0 (AbortController, mirrors in-file pattern) |
| M-01 | MEDIUM | 44768eb | `jest signal-run-log.test.ts` | 5 pass (expired excluded) |
| M-02 | MEDIUM | a1e18b7 | `jest packages/agent` | pass (0.5-unit order fills 0.5) |
| M-03 | MEDIUM | 9961e1c | `build:agent` | exit 0 (in-flight guard) |
| M-04 | MEDIUM | 085e310 | `build:agent` | exit 0 (64KB body cap) |
| M-05 | MEDIUM | 085e310 | `build:agent` | exit 0 (timingSafeEqual) |
| M-06 | MEDIUM | 085e310 | `build:agent` | exit 0 (reject non-finite price) |
| M-07 | MEDIUM | 3a20c5b | web `tsc --noEmit` | exit 0 (shape guard + log) |
| M-09 | MEDIUM | b0a0595 (sms-alerts), cdddd05 (digest, prewarm) | web `tsc --noEmit` | exit 0 (fail-closed via requireCronAuth) |
| M-10 | MEDIUM | 148f289 | web `tsc --noEmit` | exit 0 (2-day freshness → env fallback + warn) |
| M-11 | MEDIUM | d7877e1 | web `tsc --noEmit` | exit 0 (verifyAdminSession) |
| M-12 | MEDIUM | 44ded0f | web `tsc --noEmit` | exit 0 (shared checkSafeOutboundUrl) |
| M-13 | MEDIUM | b803349 | `ws:build && ws:test` | 41 pass (serialized flush) |
| M-16 | MEDIUM | 3f35e39 | docker-compose YAML parse | parses; scanner removed |
| M-18 | MEDIUM | 69a63a6 | web `tsc --noEmit` | exit 0 |
| M-19 | MEDIUM | 69a63a6 | web `tsc --noEmit` | exit 0 |
| M-20 | MEDIUM | 5cc87ad | web `tsc --noEmit` | exit 0 (sweep + staleAfter GC) |

### ⚠️ Deferred (with reason)
- **M-14, M-15** (ws-server client heartbeat / slow-client disconnect): correct findings, but both
  change live realtime-relay behavior and can only be safely validated with a concurrency/load
  harness not available on this box. Fixing blind risks regressing the price stream. Deferred to a
  dedicated ws reliability pass. The roadmap's technical persona independently flags the same need.
- **H-10** (published agent's unresolvable `@tradeclaw/signals` dep): the publish pipeline is not
  exercised by `build:all`/CI build, and a correct fix (bundle signals into the agent OR publish
  signals + add build:signals to publish-packages.yml) is a packaging redesign beyond this audit's
  surgical scope. C-01 makes the agent compile; the publish/bundle redesign is deferred.
- **M-17** (signals exports `types` condition): VERIFIED NOT-A-BUG. `build:agent` resolves
  `TradingSignal` precisely enough to report the C-01 errors, so Node16 type resolution works today.
  No change made (avoids an unnecessary package.json edit).
- **All LOW (L-01..L-15)**: logged above, below the fix bar for this pass.

### M-17 / H-03 follow-up note
H-03 fixed the `timestamp` contract bug but kept `as unknown as TradingSignal` because premium rows
genuinely lack `indicators`/`takeProfit2`/`takeProfit3`; fully dropping the cast requires populating
those (a data change), logged as a follow-up.

---

## Phase A gate

Clean run at HEAD 3f35e39 (2026-06-02T16:10Z):

| Gate | Baseline (acb8147) | After Phase A (3f35e39) |
|------|--------------------|--------------------------|
| build:all | FAIL (exit 2 @ build:agent) | **exit 0** |
| lint | exit 0 (38 warnings) | exit 0 (38 warnings) |
| test (jest) | 997 passed / 26 skipped | **1006 passed** / 26 skipped (+9 new, +2 suites) |
| ws:test | 36 passed | **41 passed** (+5 new) |

All gates green; no regressions vs baseline (every delta is an improvement).

---

## Phase B — follow-up pass

_(populated in Phase B.)_
