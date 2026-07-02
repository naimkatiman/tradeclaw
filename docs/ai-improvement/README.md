# TradeClaw AI Improvement Baseline

Last updated: 2026-07-02 06:46 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent
Scope of latest run: verification-only refresh of the existing docs-only checkpoint; no application/source/runtime changes, and the root README discoverability hook remains in place.

## Executive Summary

TradeClaw now has a verified standalone strategy-audit monetization path: a product-facing audit note, a dedicated `packages/strategy-audit-agent` workspace package, and a fresh AI-improvement note that documents the safe boundary. The audit package turns existing Backtest Lab output into a historical-only paid deliverable; it does not change live execution, billing, or broker access. Code changes: none from this run.

Latest recurring increment: verification-only refresh of the existing docs-only checkpoint for the current dirty tree. The read-only research CLI `scripts/research/recost-segment.ts` remains an intentional local tool, the root README discoverability hook remains in place, and the script typechecked cleanly while failing closed when `DATABASE_PUBLIC_URL` / `DATABASE_URL` were absent. No application source, tests, package scripts, dependencies, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, or deployment targets were changed this run.

Previous recurring increment: verified the new strategy-audit package with `npm test`, `npm run check`, and `npm run validate:fixture`; the fixture run produced `Completed: 3/4` and wrote `packages/strategy-audit-agent/tmp/fixture-validation/report.md`. The current checkout still contains the pre-existing `package-lock.json` modification plus the untracked audit package/docs surfaces, but this run only added AI-improvement documentation and state updates.

Previous recurring increment: refreshed current verification evidence at 08:36 MPST without changing the branch, source, tests, package scripts, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, deployment targets, or secrets. Fresh `git fetch --prune` still shows current branch `fix/track-record-compliance-copy` at `528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer`, upstream `origin/fix/track-record-compliance-copy`, ahead/behind `0 / 0`; local `main` remains `da2afa06 [origin/main: ahead 1]`; merge-base with `origin/main` remains `004190974821f789b8b56979680de03fd77ebcad`; `origin/main` changed-path set remains zero; dirty/remote overlap remains zero. The dirty set is still **13 paths**: 12 tracked modified files plus untracked `docs/ai-improvement/source-review-metrics.md`. Pre-checkpoint tracked shortstat is now 12 files / 1,611 insertions / 226 deletions after prior tracking updates. Verification reran targeted app ESLint, `npm run typecheck:web`, targeted Jest (2 suites / 22 tests), `npm run build --workspace=apps/web` (exit 0, 332/332 static pages, known warnings only), entrypoint syntax/help markers, package parse, and focused source/test/config `pygount` (1,419 files / 144,113 code / 16,085 comments). Code changes: none this run.

Previous recurring increment: refreshed current verification evidence without changing the branch, source, tests, package scripts, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, deployment targets, or secrets. Fresh `git fetch --prune` still showed current branch `fix/track-record-compliance-copy` at `528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer`, upstream `origin/fix/track-record-compliance-copy`, ahead/behind `0 / 0`; local `main` remained `da2afa06 [origin/main: ahead 1]`; merge-base with `origin/main` remained `004190974821f789b8b56979680de03fd77ebcad`; `origin/main` changed-path set remained zero; dirty/remote overlap remained zero. The dirty set was still **13 paths**: 12 tracked modified files plus untracked `docs/ai-improvement/source-review-metrics.md`. Verification reran targeted app ESLint, `npm run typecheck:web`, targeted Jest (2 suites / 22 tests), `npm run build --workspace=apps/web` (exit 0, 332/332 static pages, known warnings only), entrypoint syntax/help markers, package parse, and focused source/test/config `pygount` (1,419 files / 144,113 code / 16,085 comments). Code changes: none that run.

Previous recurring increment: refreshed `docs/ai-improvement/source-review-metrics.md`, `uncommitted-source-verification-handoff.md`, and `verification-command-matrix.md` after live git state moved beyond the prior no-upstream `b52aae7d` packet. Fresh `git fetch --prune` showed current branch `fix/track-record-compliance-copy` at `528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer`, with upstream `origin/fix/track-record-compliance-copy` and ahead/behind `0 / 0`; local `main` remained `da2afa06 [origin/main: ahead 1]`; merge-base with `origin/main` was `004190974821f789b8b56979680de03fd77ebcad`; `origin/main` changed-path set remained zero; dirty/remote overlap remained zero. The dirty set was still **13 paths**: 12 tracked modified files plus untracked `docs/ai-improvement/source-review-metrics.md`. The refreshed packet recorded public/operator docs + tooling (5 files / 178 insertions / 144 deletions), test/static/state pre-checkpoint (3 files / 306 insertions / 6 deletions), and AI tracking/status docs, and recorded source/test/config pygount scope (1,419 files / 144,113 code / 16,085 comments). No application source, tests, package scripts, dependencies, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, or deployment targets were changed by that checkpoint refresh.

Previous recurring increment: refreshed `docs/ai-improvement/uncommitted-source-verification-handoff.md` and `docs/ai-improvement/verification-command-matrix.md` after live git state showed current branch `fix/track-record-compliance-copy`, current `HEAD` `b52aae7d fix(track-record): replace implied-earnings claim with compliance-safe analytics copy`, no configured upstream for the current branch, and a remote-clean merge-base probe (`origin/main` changed-path set zero; dirty/origin overlap zero). The previous handoff classified `apps/web/app/track-record/TrackRecordClient.tsx` as an uncommitted review lane; it is now committed in `HEAD`, while the remaining working tree had **12 tracked modified files** and no untracked files: 8 non-AI review-lane files plus 4 AI tracking/status docs. That refresh reran the targeted verification snapshot (`typecheck:web` exit 0; targeted Jest 2 suites / 22 tests pass with `--forceExit`; targeted app-workspace ESLint exits 0; entrypoint syntax/help markers and package parse pass), and kept branch/local-lane stabilization as the active next move.

Previous recurring increment: refreshed `docs/ai-improvement/uncommitted-source-verification-handoff.md` and `docs/ai-improvement/verification-command-matrix.md` for the then-current `main` local-ahead snapshot at `da2afa06`. That handoff added a separate public-copy review lane before the later `b52aae7d` commit moved the copy change into `HEAD`.

Earlier recurring increment: refreshed `docs/ai-improvement/uncommitted-source-verification-handoff.md` and `docs/ai-improvement/verification-command-matrix.md` after live git state changed to `main...origin/main [ahead 1]`: local commit `da2afa06` now carries the middleware matcher characterization test plus AI improvement docs/smoke/lineage artifacts, while the remaining working tree was recorded as 8 tracked modified files and no untracked files. That refresh recorded a real verification snapshot and made local-commit plus dirty-lane stabilization the active next move before new runtime work.

Previous recurring increment: added `docs/ai-improvement/uncommitted-source-verification-handoff.md` and `docs/ai-improvement/verification-command-matrix.md` after detecting an accumulated dirty working tree plus not-yet-committed AI/test/docs artifacts at that time. The handoff inventoried the docs/tooling/test/static-asset lanes and recommended source-diff stabilization before new runtime work.

Previous recurring increment: added `docs/ai-improvement/middleware-proxy-migration-note.md`, a source-inspected docs-only preflight for the reproducible Next 16 `middleware` → `proxy` convention warning. It maps the current global middleware contract (CORS preflight, API rate limiting, admin auth, security headers, matcher coverage), cites the installed Next docs/codemod/test-helper path, and keeps the actual file rename owner/Fatin-approved because it protects auth/rate/header behavior. No source files, Next config, CI behavior, dependencies, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, or deployment targets were changed.

Previous recurring increment: added a root `npm run typecheck:web` alias for the already-documented CI-style web TypeScript sequence (`npm run build:signals && tsc --noEmit --project apps/web/tsconfig.json`) and aligned README/CONTRIBUTING plus `docs/ai-improvement/build-typecheck-parity.md` to point contributors at the shorter command. No Next config, CI behavior, dependencies, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, or deployment targets were changed.

Earlier recurring increment: added `docs/ai-improvement/build-typecheck-parity.md` and aligned README/CONTRIBUTING command guidance with the live build/typecheck contract. The note documents that `next build` currently skips TypeScript validation via `typescript.ignoreBuildErrors`, while CI first builds `@tradeclaw/signals` and then runs `npx tsc --noEmit --project apps/web/tsconfig.json`; it also records the current successful local verification snapshot and observed build warnings. No Next config, package scripts, CI behavior, dependencies, runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, or deployment targets were changed.

Earlier recurring increment: extended `apps/web/app/api/signals/__tests__/route.test.ts` with the final narrow TA worker fallback premium-band route-response pair. When `readLiveSignals()` is absent and `getSignalsCached()` returns a fresh confidence >= 85 fallback signal, anonymous/free callers now have route-level coverage proving the response returns `signals: []`, `count: 0`, and `lockedSignals: []`, while Pro callers retain the premium signal with full entry, stop loss, TP1/TP2/TP3, reasons, indicators, and fallback provenance. Application/runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, and deployment targets were not changed.

Earlier recurring increment: extended `apps/web/app/api/signals/__tests__/route.test.ts` with the paired TA worker fallback Pro/full-detail route-response contract test. When `readLiveSignals()` is absent and `getSignalsCached()` returns a fresh standard-band signal for a Pro session, the assembled `/api/signals` response now has test coverage for `signals[0]` preserving entry, stop loss, TP1/TP2/TP3, reasons, raw indicators, fallback provenance, `count: 1`, and `lockedSignals: []`. Application/runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, and deployment targets were not changed.

Earlier recurring increment: extended `apps/web/app/api/signals/__tests__/route.test.ts` again with a route-response contract test for the TA worker fallback branch. When `readLiveSignals()` is absent and `getSignalsCached()` returns a fresh standard-band free symbol, anonymous/free callers still receive `signals: []`, `count: 0`, and a narrow public-safe `lockedSignals` stub with no entry, SL/TP, indicators, or reasons. Application/runtime behavior, trading logic, tier definitions, DB schema, env vars, Compose services, cron behavior, and deployment targets were not changed.

Prior docs increment: added `docs/signal-data-lineage.md`, a source-inspected maintainer map for the trust-sensitive signal path: scanner output, TA fallback, tier-gated disclosure, `signal_history`, outcomes, premium signals, broadcasts, and public proof surfaces. Application code, trading behavior, auth, billing, DB schema, env vars, Compose services, and deployment targets were not changed.

Codebase inspection with `pygount` (excluding `.git`, `node_modules`, build/cache folders) found **1,743 files**, **167,805 code lines**, and **32,781 comment/documentation lines** during the first-run baseline. The largest active languages are TSX (**522 files / 76,988 code lines**) and TypeScript (**739 files / 63,920 code lines**). The previously reported `apps/web/public/readme-banner.svg` duplicate-attribute warning was fixed in the 2026-06-18 SVG polish increment.

## Product Thesis

TradeClaw's strongest wedge is **verified AI-assisted trading signals that users can inspect, self-host, and upgrade from**.

User value:

- Anonymous/free users get delayed public signals, a dashboard, track-record proof, backtests, widgets, and self-hosting.
- Pro users get real-time/full-depth signals, broader symbols, premium signal feeds, Telegram/private-group delivery, and execution scaffolding where credentials are present.
- Developers/self-hosters get an MIT-licensed platform with Docker Compose, API/webhook surfaces, workspace packages, MCP/CLI/integration packages, and transparent source.

Business value:

- The open-source repo is the acquisition loop: stars, self-hosters, demos, docs, extensions, and community contributions.
- The hosted `tradeclaw.win` experience monetizes operational convenience, premium feed operations, subscription/billing, private alerts, and execution workflows.
- Public track-record honesty is the trust moat: the product should continue emphasizing wins **and** losses, delayed/free vs real-time/pro gating, and clear data provenance.

## Current Repo Map

### Root

- `package.json` — npm workspaces across `apps/*` and `packages/*`; root scripts for `dev`, `build`, `typecheck:web`, `lint`, `test`, `test:e2e`, websocket server, and signal outcome resolution.
- `README.md` — public product pitch, self-hosting, Free vs Pro, env vars, monitoring, repo layout, signal flow, market data, execution, strategy presets, API, notifications, and contribution links.
- `docs/signal-data-lineage.md` — maintainer map for scanner/TA signal generation, tier disclosure, `signal_history`, outcome resolution, premium feeds, Pro/public broadcasts, and public proof surfaces.
- `docs/MONETIZATION_STRATEGY_AUDIT.md` — product-facing companion note for the fixed-price, historical-only strategy-audit offer.
- `docs/ai-improvement/monetization-strategy-audit.md` — current AI-improvement note with package verification and next-move guidance.
- `docs/ai-improvement/uncommitted-source-verification-handoff.md` — current remote-clean, remote-aligned feature-branch/dirty-tree handoff that distinguishes current branch `fix/track-record-compliance-copy` at `528cd3c8`, upstream parity with `origin/fix/track-record-compliance-copy`, local `main` at `da2afa06`, the remaining dirty non-AI review-lane files, and AI tracking/status docs modified by recurring-agent bookkeeping.
- `docs/ai-improvement/source-review-metrics.md` — current docs-only review-leverage packet with branch/upstream/merge-base counts, grouped dirty-lane numstats, source/test/config `pygount` metrics, verification snapshot, anti-scope, and recommended review sequence before new runtime work.
- `docs/ai-improvement/verification-command-matrix.md` — command matrix for reviewing/stabilizing the current feature-branch commits, dirty review lanes, the source-review metrics artifact, and AI tracking/status docs before new runtime work.
- `docs/ai-improvement/build-typecheck-parity.md` — operator note mapping `next build`/root build output versus the CI-style web TypeScript check, including current warning snapshot and safe follow-up boundaries.
- `docs/ai-improvement/middleware-proxy-migration-note.md` — docs-only preflight for the Next 16 middleware-to-proxy warning, current global middleware responsibilities, test/verification plan, and owner/Fatin approval boundary before the file convention migration.
- `.env.example` — root self-host/prod configuration placeholders for DB, app/session secrets, websocket, market data hub, Redis, email, Stripe, cron, `DATABASE_URL`, and `SIGNAL_ENGINE_PRESET`.
- `docker-compose.yml` + `Dockerfile` + `docker-entrypoint.sh` — production self-host path with Timescale/Postgres, Redis, migration service, app, websocket server, and optional monitoring.
- `.github/workflows/ci.yml` — CI covers lint/typecheck, unit tests, build, Docker build, strategy backtests, and non-blocking Playwright E2E with a Postgres sidecar.
- `STATE.yaml` and many `docs/plans/*` files — historical PM/task state and implementation planning; useful context, but live manifests/source are the current authority.

### Apps

- `apps/web` — primary Next.js app. Active surfaces include landing, dashboard, track record, pricing, strategy/backtest pages, widgets, docs/API pages, auth/session/tier flows, Stripe, Telegram, Discord/webhooks, signal cron, market data, and execution scaffolding.
- `apps/web/app/api/signals/route.ts` — public/private signal read API. It prefers live Python scanner output when coverage is adequate, falls back to the TA worker cache, filters by regime, applies tier gates and free-tier delays, and returns locked stubs instead of leaking price levels.
- `apps/web/app/api/signals/__tests__/route.test.ts` — route-response coverage for `/api/signals` tier gating, including free masking, Pro unmasking, live-scanner premium-band exclusion/preservation, live-scanner fresh free standard-band `lockedSignals` stubs, TA worker fallback fresh free standard-band `lockedSignals` stubs with no trade-detail leakage, TA worker fallback Pro/full-detail preservation, and TA worker fallback premium-band free-drop/Pro-retain parity.
- `apps/web/app/track-record/TrackRecordClient.tsx` — public track-record UI; current branch commits compliance-safe copy clarifying that realized-return figures are standardized research analytics, not implied subscriber earnings.
- `apps/web/app/pricing/page.tsx` — public pricing page; current branch `528cd3c8` reframes the pricing stats card as Historical PnL and adds a nearby “not a forecast or guarantee” disclaimer.
- `apps/web/app/api/cron/signals/route.ts` — cron path for precomputing/recording/resolving/broadcasting signals, with cron auth, scanner/TA fallback, dedupe, cost estimates, broadcast decisions, Telegram Pro catch-up, and outcome resolution.
- `apps/web/lib/tracked-signals.ts` — request-side signal path, recording side effects, gate/winning-cell logic, social enqueue, premium signal merging, and strategy access filtering.
- `apps/web/lib/tier.ts` — Free/Pro/Elite/Custom tier symbols/history/delay/strategy gates with fail-closed access context and non-production-only E2E Pro stubs.
- `apps/web/migrations` — ordered SQL migrations through current monetization, telemetry, signal history, Discord, regimes, candles, calibration, and funding-rate features.
- `apps/ws-server` — Fastify websocket relay with Redis/database optional degradation and market-data provider manager.
- `apps/mobile` — Expo/React Native shell for mobile client work.

### Packages

- `packages/signals` — shared signal types, indicators, ATR calibration, regimes, allocation, risk/circuit-breaker exports, symbols.
- `packages/strategies` — deterministic strategy/backtest engine and Jest test suite.
- `packages/strategy-audit-agent` — standalone Playwright/OpenAI computer-use runner for the productized strategy audit; verified with tests/check/fixture.
- `packages/agent` and `packages/trading-agents` — trading agent runtime/CLI and integration bridge types.
- `packages/cli`, `tradeclaw-cli`, `create-tradeclaw`, `tradeclaw-js`, `tradeclaw-mcp`, `tradeclaw-action`, `tradeclaw-demo`, `tradeclaw-extension`, `telegram-bot`, `tradeclaw-discord` — ecosystem and distribution/integration packages at varying maturity levels.

### Scripts / research / ops

- `scripts/scanner-engine.py`, `scripts/run-signal-engine-cron.sh`, outcome resolution, backfill, calibration, HMM regime, DockerHub publish, signal-gate simulation, research backtest CLIs, and the read-only `scripts/research/recost-segment.ts` cost-reality probe support operations and experimentation.
- `docs/research`, `docs/reports`, `docs/superpowers`, and `docs/plans` contain accumulated product/research rationale and should be consulted before changing trading behavior.

## Detected Patterns

- **Trust-first product copy:** README and app emphasize verified track record, no cherry-picking, and explicit self-host vs hosted differences.
- **Fail-closed access control:** tier resolution and session helpers fall back to free access; E2E bypasses are gated by `NODE_ENV !== 'production'`.
- **Tier-safe disclosure:** free users receive delayed `lockedSignals` stubs instead of premium price levels.
- **Service-first monetization stays isolated:** the strategy-audit package repackages existing analysis output into a historical-only paid deliverable; keep checkout, billing, broker, and live-execution surfaces out of scope until owner/Fatin approve distribution.
- **Signal provenance matters:** scanner rows are tagged differently from TA fallback rows; README documents that live `SIGNAL_ENGINE_PRESET` is currently a label in some paths rather than full per-preset generation.
- **Side effects are throttled/fire-and-forget:** request paths avoid blocking users on recording, social enqueue, or alert dispatch.
- **DB migrations are append-only and central to behavior:** changes here affect billing, signal history, gating, audit logs, research jobs, and should require approval unless purely docs/tests.
- **CI separates app build and TypeScript typecheck:** Next build ignores TS errors, while CI runs `npx tsc --noEmit --project apps/web/tsconfig.json` after building `@tradeclaw/signals`; local contributors can now run the same sequence via `npm run typecheck:web`.
- **Middleware/proxy is a global security surface:** the current Next middleware handles CORS preflight, rate limiting, admin auth, and security headers; the Next 16 convention rename should be tested/reviewed rather than treated as a cosmetic file move.
- **Remote-clean branch/dirty-tree stabilization comes before new runtime work:** when the checkout sits on a local branch with committed copy/test/docs work plus accumulated docs/test/tooling/static diffs, future agents should decide branch/local-main posture and split keep/revert/commit lanes before adding unrelated changes. `docs/ai-improvement/source-review-metrics.md` now gives grouped numstats, post-packet dirty-path count, and source/test/config pygount metrics so owner/Fatin review can prioritize lanes without redoing inventory; AI tracking/status docs are their own lane, not proof that the prior source/test lanes are reviewed.
- **E2E is intentionally non-blocking today:** Playwright runs with a Postgres sidecar but `continue-on-error: true` until stable.
- **Self-host flow is sacred:** README, `.env.example`, Dockerfile, compose, migrations, and health endpoints must remain aligned.

## Guardrail Assessment

Autonomous safe work for future runs:

- Documentation alignment, repo maps, onboarding/runbook improvements, backlog grooming, static checks, small tests where the test harness is already clear, and tiny low-risk UI/copy/readability fixes.
- Small verified bugfixes that do not change trading rules, auth, billing, DB schema, deployment targets, env var semantics, or broker execution behavior.

Approval required before touching:

- Trading/business rules, signal generation semantics, strategy preset behavior, execution/broker behavior, subscription/tier gates, auth/session logic, Stripe/payment flows, DB/schema migrations, production env vars, deploy targets, large dependencies, broad refactors, major UI redesigns, major renames, or removal of major functionality.

First-run result:

- `docs/ai-improvement/` was absent at the start of this run, so this run intentionally created analysis artifacts only.
- Code changes: none.

## Risks and Technical Debt

1. **Context drift:** Loaded project context still describes a much smaller Next.js/Postgres scaffold and Alpha Screener decision history, while the live repo is a mature monetized platform with many additional surfaces. Future agents should treat live manifests/source as authoritative.
2. **Contributor docs drift (mitigated 2026-06-18):** `CONTRIBUTING.md` now points contributors to root `.env.example`, optional `apps/web/.env.local`, `packages/signals/src/*`, and `apps/web/app/lib/ta-engine.ts`. Keep it aligned as setup scripts and package boundaries evolve.
3. **Signal preset honesty gap:** README says `SIGNAL_ENGINE_PRESET` defaults to `hmm-top3`, but live generation still routes through the `classic` profile in key paths until per-preset live generation is wired. This is already documented, but it remains a product trust hotspot.
4. **Non-blocking E2E:** Playwright E2E is currently allowed to fail in CI. This is pragmatic, but the project should keep shrinking flakes until it can be blocking.
5. **Route disclosure coverage improved:** the live-scanner and TA worker fallback `/api/signals` read branches now both have route-response tests for fresh standard-band disclosure and premium-band access: free callers receive only narrow `lockedSignals` stubs for delayed standard-band rows, free callers drop confidence >= 85 rows entirely, and Pro callers retain full entry/SL/TP/indicator detail across live-scanner and worker-fallback route assemblies. Future signal-disclosure work can now move to broader typecheck/build parity or new route surfaces instead of adding more coverage to this specific seam.
6. **Build/typecheck split (documented and eased 2026-06-18):** `docs/ai-improvement/build-typecheck-parity.md`, README, and CONTRIBUTING now state that `next build` skips TypeScript validation while CI runs `npm run build:signals` before `npx tsc --noEmit --project apps/web/tsconfig.json`; root `npm run typecheck:web` now wraps that sequence for contributors. Local `npm run build` alone can still hide type failures unless contributors run the explicit alias/check.
7. **Large migration and integration surface:** Billing, Telegram, premium signals, execution, webhooks, research, and track record share DB-backed flows; changes need careful targeted tests.
8. **SVG quality warning (mitigated 2026-06-18):** `apps/web/public/readme-banner.svg` no longer has the duplicated `x` attribute reported by `pygount`; targeted XML parsing and `pygount` checks now pass without that warning.
9. **Missing skill artifact:** `maulana-improvement-stack` was requested for this cron job but was not available in this Hermes profile; the shared central template still provided the external source list.
10. **Legacy setup-doc drift (mitigated 2026-06-18):** `docs/QUICKSTART.md` and `docker-entrypoint.sh --help` now describe the current Compose/PostgreSQL/websocket/metrics path instead of stale API-port, SQLite, scanner-package, and retired setup assumptions. Keep deeper deployment docs aligned as the self-host flow evolves.
11. **Next middleware convention warning (triaged 2026-06-19):** `npm run build --workspace=apps/web` still prints the Next 16 middleware-to-proxy deprecation warning. The preflight note documents the codemod/manual migration path and recommends matcher characterization before any owner/Fatin-approved file rename.
12. **Remote-clean remote-aligned feature branch + accumulated dirty diff (active 2026-06-22 05:30):** the checkout is on `fix/track-record-compliance-copy` at `528cd3c8`, aligned with upstream `origin/fix/track-record-compliance-copy` (`0 / 0` ahead/behind), while local `main` remains at `da2afa06 [origin/main: ahead 1]`. `git fetch --prune` plus merge-base comparison found `origin/main` changed-path set zero and dirty/origin overlap zero, so this is branch/local-lane review rather than remote-conflict triage. The working tree contains 13 dirty paths: 12 tracked modified files plus untracked `docs/ai-improvement/source-review-metrics.md`. The refreshed packet groups public/operator docs + tooling, test/static/state, and AI tracking/status docs; the current pre-checkpoint tracked shortstat is 12 files / 1,879 insertions / 226 deletions. The latest verification checkpoint reran targeted app ESLint, `typecheck:web`, targeted Jest, app build, entrypoint/package probes, and focused source/test/config `pygount`. Treat metrics and passing checks as review aids, not push/merge/deploy approval, until Fatin/owner/maintainer decide the feature branch, local-main posture, and dirty-lane keep/revert/commit split.

## 30-Year Roadmap

### 0-30 days — Trust, onboarding, and safe self-hosting

- Keep README, CONTRIBUTING, `.env.example`, Docker Compose, migrations, and CI docs perfectly aligned.
- Add/maintain smoke-test checklists for Docker Compose, API health, signal API, track-record, webhook, and Telegram surfaces.
- Document data lineage clearly: scanner → TA fallback → cache → signal history → track record → broadcasts.
- Preserve and test Free vs Pro non-leak guarantees.

### 1-6 months — Conversion and reliability flywheel

- Stabilize E2E enough to make core journeys blocking: landing, dashboard, pricing, auth/session, Pro gating, track record, signal API, cron health.
- Expand self-host diagnostics (`doctor`/CLI or docs) for env vars, DB migrations, Redis, websocket, and cron secrets.
- Continue track-record honesty polish: provenance, cost estimates, stale/pending outcomes, source labels, and public explanations.
- Improve hosted Pro onboarding: trial, Telegram private group, billing portal, signal delivery confidence.

### 6-18 months — Strategy quality and integrations

- Wire per-preset live signal generation only after a plan, tests, and owner approval because it changes trading behavior.
- Build stronger strategy/research promotion gates: research experiments graduate only with reproducible backtests, cost modeling, and live shadow telemetry.
- Harden broker integrations behind explicit testnet/paper gates and kill switches.
- Expand ecosystem packages (JS SDK, MCP, action, extension, CLI) based on measured developer demand.

### 2-5 years — Trading OS for self-hosters and prosumers

- Become the default open-source trading signal OS: auditable signal pipelines, marketplace strategies, alert routing, paper/live execution, team workspaces, and data provenance.
- Maintain a strict separation between open-source framework value and hosted operational/premium-feed value.
- Build compliance-aware, region-aware deployment templates and broker adapters.

### 5-10 years — Trust network and marketplace

- Strategy creators publish verifiable strategies with transparent backtests, live shadow records, fees/costs, and risk metadata.
- Users compose strategies, alerts, brokers, and risk limits without surrendering custody or secrets to TradeClaw unless they choose hosted convenience.
- Track record becomes a public trust graph across strategy, market regime, broker, cost model, and user-selected risk profile.

### 10-30 years — Durable financial autonomy infrastructure

- TradeClaw evolves from a signal app into a self-hostable personal/organizational trading control plane.
- The core remains inspectable and portable; hosted services monetize reliability, data, premium operations, and managed integrations.
- The product survives market cycles by prioritizing risk controls, auditability, and honest performance over hype.

## Prioritized Backlog

| Priority | Initiative | Horizon | Type | User Value | Business Value | Technical Value | Risk | Suggested Action | Verification |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Keep and document the research CLI lane | Active next move | Stability / Developer Experience | Future agents can re-run the cost-reality probe without spelunking | Preserves repo velocity and honest data gathering | Separates the read-only research lane from runtime work | Low | Keep `scripts/research/recost-segment.ts` documented in the root README and use the handoff/matrix to rerun it only when live Postgres is available | README read-back, CLI typecheck, fail-closed guard, docs/static checks |
| P0 | Align contributor setup and extension docs with current repo | Done 2026-06-18 | Developer Experience | Contributors follow working setup and edit the right package | More successful community PRs | Reduces stale-doc support load | Low | Updated `CONTRIBUTING.md` to use root `.env.example`, optional web-only env overrides, current root scripts/typecheck guidance, and active signal/symbol locations | Read-back, stale-string search, `git diff --check`, `git diff --stat`, `git status` |
| P0 | Align legacy quickstart/help copy with current Compose path | Done 2026-06-18 | Documentation / DX | New self-hosters avoid stale API port, SQLite, retired scanner package, and legacy setup assumptions | Fewer failed installs and support loops | Keeps public setup docs consistent with live source | Low | Updated `docs/QUICKSTART.md` and `docker-entrypoint.sh --help`/migration comment to match the current Compose/PostgreSQL/websocket/metrics flow without changing runtime behavior | Read-back, stale-string search, `sh -n`, `sh docker-entrypoint.sh --help`, `git diff --check`, `pygount`; Docker runtime validation remains host-blocked because Docker is unavailable |
| P1 | Document signal data lineage as a maintainer map | Done 2026-06-18 | Documentation / Stability | Users and contributors understand scanner/fallback/history/broadcast behavior | Protects trust narrative | Reduces accidental behavior changes | Low | Created `docs/signal-data-lineage.md` referencing current files/routes and approval boundaries | Read-back, source-token/link checks, manifest parse, static checks, no-index checks, final status |
| P1 | Plan per-preset live generation before implementation | Owner-approved | Product / Architecture | Preset labels match real live behavior | Stronger premium differentiation and trust | Forces tests before trading-behavior changes | Medium | Write a design/approval plan, not code, for `SIGNAL_ENGINE_PRESET` semantics | Owner approval; targeted strategy and API tests before merge |
| P1 | Stabilize core Playwright E2E to blocking | 1-2 months | Stability | Fewer broken user journeys reach production | Higher conversion reliability | Better CI signal | Medium | Triage current flakes, start with one core journey at a time | `npm run test:e2e` against sidecar/local env; eventually remove `continue-on-error` |
| P2 | Tighten build/typecheck parity | Done 2026-06-18 | Developer Experience / Quality | Contributors understand why a green web build is not a web typecheck and have one root command for the CI-style check | Fewer CI surprises | Reduces hidden build risk without changing Next/CI behavior | Low | Added `docs/ai-improvement/build-typecheck-parity.md`, then added root `npm run typecheck:web` and aligned README/CONTRIBUTING guidance with the alias and underlying CI contract | Raw `npm run build:signals && npx tsc --noEmit --project apps/web/tsconfig.json`, `npm run typecheck:web`, `npm run build --workspace=apps/web`, read-back, static checks |
| P2 | Triage Next middleware-to-proxy warning | Done 2026-06-19 | Developer Experience / Stability | Maintainers get a safe path to remove a noisy build warning without risking admin/rate/header coverage | Cleaner Next 16 upgrade posture | Maps the global middleware contract and required tests before rename | Low | Added `docs/ai-improvement/middleware-proxy-migration-note.md`; actual file convention migration remains owner/Fatin-approved | Reproduced `next build` warning, inspected `apps/web/middleware.ts` and installed Next proxy docs, read-back/static checks |
| P2 | Add/expand contract tests for tier-gated `/api/signals` payloads | Done 2026-06-18 | Security / Stability | Free users cannot inspect premium details accidentally; paid users still receive promised detail | Protects Pro revenue and trust | Locks non-leak/full-detail behavior across route assembly paths | Medium | Added live-scanner and TA worker fallback route-response tests proving fresh standard-band free rows appear only as narrow `lockedSignals` stubs, confidence >= 85 rows are dropped for free callers, and Pro rows preserve entry, SL/TP, reasons, indicators, and provenance across both branches | Targeted Jest route test and targeted app-workspace ESLint |
| P3 | Self-host `doctor` command or checklist-backed CLI | 3-6 months | Automation / DX | Faster setup diagnosis | Better OSS adoption | Encodes env/DB/Redis/websocket checks | Medium | Start as docs; later implement in existing CLI/package if demand is proven | Unit tests + local dry run with fake env |
| P3 | Broker execution hardening roadmap | Owner-approved | Security / Compliance / Platform | Safer path from signals to execution | Enables high-value paid tiers | Clarifies kill switches, paper/testnet defaults, audit logs | High | Plan first; do not change execution without approval | Owner review; testnet-only verification; no live secrets |

## Recommended Next Move

Active next move: **keep `scripts/research/recost-segment.ts` as an intentional local research utility, and when a Postgres connection is available run the real-data probe against Railway Postgres to answer the cost edge question.** The keep/drop decision is now resolved in favor of keep; the open question is live-data output, not the tool's existence.

Settlement note (2026-07-02): the cost edge question was already answered against production Postgres on 2026-06-26 — the identical script was merged to main in PR #136 and run over 3,796 resolved trades (gross +0.0149R, net −0.4317R/trade; no asset-class × band cell is net-positive at n ≥ 100). See `docs/plans/2026-06-26-real-cost-track-record.md`. The only remaining probe follow-up is re-running with `--json` to commit the raw per-cell table as an artifact.

Why this next:

- The script already typechecks cleanly and fails closed without DB env, so the remaining question is production data, not correctness.
- The root README now surfaces the tool, so future agents can find it without spelunking through the AI packet.
- Leaving the lane undocumented or half-decided would invite drift and confuse later stabilization runs.

Suggested next steps:

1. Keep the root README hook in sync if the script path or usage changes.
2. If a live Postgres connection becomes available, run the probe against Railway Postgres and record the result as LOCAL vs PROD-verified.
3. Continue unrelated safe improvements one at a time; keep them isolated from trading logic, auth/rate/header behavior, billing, DB/schema, env vars, Docker Compose, deployment targets, and other approval-gated surfaces unless explicitly approved.
