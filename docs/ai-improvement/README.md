# TradeClaw AI Improvement Baseline

Last updated: 2026-08-08 17:54 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent
Scope of latest run: regime-expectancy CLI `--json` path preflight inside the existing read-only research lane, plus tracking docs/STATE/central board/MemoryCore actualization.

## Executive Summary

Latest Max quota-burst run stayed inside the existing regime-expectancy research lane and hardened the read-only `scripts/research/regime-expectancy-study.ts` CLI artifact boundary. The new `validateJsonOutputPath(...)` preflight now validates `--json` output paths after `--help` and before `connect()`, rejecting missing parent directories, parent-as-file paths, and existing-directory targets before any Postgres credential path or local artifact write. New `scripts/research/__tests__/regime-expectancy-study-cli.test.ts` locks help/no-DB behavior, missing-parent, parent-is-file, existing-directory, and valid no-credentials boundaries. Branch `feat/premium-ui-overhaul` is synced with upstream at `f6ddc185`, `origin/main=58eee2b9`, merge-base `524fc44a`, `HEAD...upstream=0/0`, `HEAD...origin/main=37/61`, `origin_main_paths=203`, `local_head_paths=39`, branch path overlap `15`, dirty/`origin-main` overlap `140`, dirty inventory `168` rows (`103` tracked modified + `3` tracked deleted + `62` untracked). Fresh evidence passed: focused regime-expectancy CLI Jest `1` suite / `5` tests / `1.817s`; adjacent regime lane Jest `5` suites / `101` tests / `54.397s`; scoped TypeScript exit `0`; full root Jest `219` passed and `3` skipped suites / `1,868` passed and `26` skipped tests / `1,894` total / `93.517s`; websocket auth Vitest `4/4` / `944ms`; web typecheck exit `0`; lint exit `0` with `23` warnings; root build exit `0` with Next `16.2.6`, compile `14.9s`, and `324/324` static pages; focused two-file pygount `2` files / `297` code / `41` comments; focused source/test/config pygount `1,523` files / `146,396` code / `15,086` comments; dashboard quick-tunnel DNS returned `curl_exit=6`; local Hermes telemetry reported `1,071` sessions / `1,863,642,754` total tokens with `gpt-5.5` `394` sessions / `1,106,968,460` tokens, but provider weekly quota percentage remains unavailable; independent delegated verifier PASS (`gpt-5.4-mini` metadata; parent did not select/pin child tier) on live files, focused Jest, scoped TypeScript, and target diff-check. Known non-blocking output remains ts-jest `globals` deprecation, Jest force-exit notice, expected fallback-test console warnings/errors, existing lint warnings, Next middleware-to-proxy/Turbopack/NFT/static-generation warnings, and build-time `url.parse()` deprecation warnings.

Recent active regime/recost/slow-gate checkpoints: 2026-08-08 17:54 MPST (+0800) added the regime-expectancy CLI `--json` path preflight; 2026-08-06 05:49 MPST (+0800) added the regime-study `--json` option-token guard; 2026-08-05 23:41 MPST (+0800) added the regime-study CLI singleton-argument/blank-JSON guard; 2026-08-05 18:08 MPST (+0800) made the regime-study assembly branch-self-contained by inlining EMA; earlier entries remain in the implementation log and central board history.
Previous PM full-sweep/release state: localization URL/persistence/RTL fixes, Docker/self-host hardening, health readiness, production WebSocket fail-closed behavior, create-tradeclaw Windows/secret generation fixes, Fly/Replit retirement, recost helper work, regime-expectancy study work, and slow-gate research files remain in the shared dirty worktree. The clean release branch from the full-sweep localization lane has already deployed to Railway production per `STATE.yaml`; the current shared checkout is not merge-ready until owner/Fatin reviews the broad uncommitted lanes.

Previous production release (2026-07-16/19): premium emerald brand assets, product-integrity/truth surfaces, slow-gate/risk fixes, and five-locale product repair were deployed from clean reviewed or explicitly authorized lanes. The current shared worktree is a preserved integration/disposition surface, not a deployment candidate.

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
- `docs/ai-improvement/uncommitted-source-verification-handoff.md` — current `feat/premium-ui-overhaul` source-work handoff: branch synced with upstream at `f6ddc185`, `origin/main=58eee2b9`, merge-base `524fc44a`, `HEAD...upstream=0/0`, `HEAD...origin/main=37/61`, `origin_main_paths=203`, `local_head_paths=39`, branch path overlap `15`, dirty/`origin-main` overlap `140`, dirty inventory `168` rows (`103` tracked modified + `3` tracked deleted + `62` untracked). Latest regime-expectancy source-work gate validates `--json` output paths before DB connection; no web runtime, trading rule, schema, auth/billing, deployment, cron, secret, dependency, lockfile, branch operation, or live research activation changed.
- `docs/ai-improvement/source-review-metrics.md` — docs-only review-leverage packet whose active header now points to the 2026-08-08 17:54 MPST (+0800) regime-expectancy `--json` path preflight source gate (`1,523` files / `146,396` code / `15,086` comments in the focused source/test/config scope). The older 2026-06-22 branch posture below remains historical.
- `docs/ai-improvement/verification-command-matrix.md` — command matrix for revalidating the current regime-expectancy `--json` path preflight source gate, including focused/adjacent Jest, scoped TypeScript, full root Jest, websocket Vitest, web typecheck, lint, build, source metrics, dashboard DNS, quota context, secondary-verifier evidence, and deterministic finalizer checks.
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
- `apps/web/app/track-record/TrackRecordClient.tsx` — public track-record UI; carries compliance-safe copy (shipped to `main` via `528cd3c8`, now on `origin/main`) clarifying that realized-return figures are standardized research analytics, not implied subscriber earnings.
- `apps/web/app/pricing/page.tsx` — public pricing page; the pricing stats card is framed as Historical PnL with a nearby “not a forecast or guarantee” disclaimer (shipped to `main` via `528cd3c8`).
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
12. **Remote-clean remote-aligned feature branch + accumulated dirty diff (historical — superseded 2026-07-15):** this item described a checkout on `fix/track-record-compliance-copy` at `528cd3c8` with local `main` at `da2afa06`. That posture is gone and was later superseded by the detached recost lane, then by the current `feat/premium-ui-overhaul` branch.

13. **Detached checkout behind `origin/main` + uncommitted recost lane (historical — superseded 2026-07-15):** this item described detached `HEAD` `b6dd0ff4` behind `origin/main` with an inherited read-only recost lane. PR #167 is now the current `origin/main` base, and the live checkout is branch `feat/premium-ui-overhaul`; keep recost helper/test artifacts as a separate support lane, not the active branch posture.

14. **Current feature branch plus full-sweep/recost/slow-gate dirty lane needs owner/Fatin disposition (active 2026-07-31 23:35 MPST (+0800)):** the checkout is on `feat/premium-ui-overhaul` at `be5445bd`, synced with `origin/feat/premium-ui-overhaul`, and `HEAD...origin/main=15/41` against `origin/main=d87796cb`. Local changed paths since merge-base are `25`; `origin_main_paths=176`; branch overlap is `10`; dirty/origin-main overlap is `128` paths. The dirty inventory after this tracking refresh remains `145` rows (`96` tracked modified + `3` tracked deleted + `46` untracked). Latest code change remains inside the untracked read-only slow-gate source/test lane: `simulateDaily(...)` now rejects non-daily bar timestamp cadence before close-to-close returns, fee/slippage/funding, equity, or average-exposure math; no web runtime, trading-rule, DB/schema, auth/billing, deploy, secret, dependency, lockfile, cron, push/merge/rebase/reset, Docker runtime, or live research activation changed.

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

Active next move: **owner/Fatin should disposition the current `feat/premium-ui-overhaul` dirty worktree before any new runtime/product scope is added.** The branch is `13` commits ahead of `origin/feat/premium-ui-overhaul` and remains `33` ahead / `59` behind `origin/main=81a5f3f3`; the shared working tree carries `162` non-branch rows across PM full-sweep runtime/config/docs/tests, recost artifacts, regime-expectancy study source/tests, slow-gate research source/test/artifact files, AI tracking, support artifacts, generated image sources, product-localization files, and release-support residue. Passing checks prove the current read-only research helper lane is reviewable; they do not authorize push/merge/deploy of the dirty set.

Why this next:

- The full-sweep lane is high-value and trust-sensitive: it touches localization, Docker/self-host bootstrap, readiness health, WebSocket fail-closed behavior, deployment-provider truth, and create-tradeclaw bootstrap secrets.
- The branch-local premium UI/brand work is ahead of the feature upstream and not current main; the local branch path overlap with current main remains `10`, and dirty/current-main overlap remains `137` paths.
- More autonomous source work should stay inside an existing read-only research/helper lane until the broader branch/package decision is made, otherwise future agents can accidentally package support/recost/tracking artifacts with runtime behavior.

Suggested next steps:

1. Review and split the PM full-sweep runtime/config/test lane from AI tracking/support/recost/regime/slow-gate artifacts, then decide whether it should become a feature-to-main PR, a fresh-main reapply, or a discard/rework.
2. Before any release or PR, rerun the current source gates: targeted full-sweep/recost/regime/slow-gate Jest, websocket auth Vitest, `npm run typecheck:web`, `npm run lint`, `npm run build`, and Docker CI/runtime validation because Docker is unavailable locally.
3. Keep the recost, regime, and slow-gate research helpers credential/local-data gated and separate; do not add DB writes, schema changes, trading-rule changes, auth/tier changes, deployment changes, credentials, cron edits, dependency changes, or lockfile changes in the same lane.
