# Phase 3 — Regime engine rebuild: structural classifier, live writer, one vocabulary

Date: 2026-06-11
Status: CODE COMPLETE 2026-06-11 — all 10 planned commits landed (plus review-fix commits); awaiting final branch review + PR
Parent: `docs/plans/2026-06-10-engine-makeover.md` Phase 3 (lines 49–53)
Branch: `worktree-phase3-regime-engine` (base `b0e5ec7` = Phase 2 merge)
Evidence base: 7-agent code survey (2026-06-11) over the regime machinery, every consumer, all five live vocabularies, cron/alerting infra, and the Phase-2 research toolkit. All file:line refs verified at `b0e5ec7`.

## What Phase 3 must deliver (from the umbrella plan)

1. A structural classifier with the three states the product is built around — **trend / volatile / range** — using ADX, BB bandwidth, ATR percentile, return autocorrelation (not drift direction). HMM machinery kept, now with T>1 smoothing and hysteresis/min-dwell. Trained and walk-forward-validated on the Phase-2 candle store.
2. The missing `market_regimes` writer (cron over stored candles, per symbol) plus observability: alert when the regime map is empty/stale — the dead state was invisible for months.
3. One canonical regime vocabulary; the manual weekly card mapped onto it as the operator-override layer; the two stray vocabularies retired.

Gate: prod regime distribution no longer 100% neutral; label stability (flips/week) and walk-forward regime-conditional outcome separation reported.

## Ground truth that shapes the design

- The 5-state vocabulary (`crash/bear/neutral/bull/euphoria`) is defined at `packages/signals/src/regime/types.ts:8` and is exhaustively keyed in REGIME_ALLOCATION_RULES, REGIME_BREAKER_THRESHOLDS, REGIME_BASELINE_VOL, GATE_THRESHOLDS_BY_REGIME, plus duplicated as local unions in `GateStateBadge.tsx:10`, `RegimeClient.tsx:8`, `AllocationClient.tsx:8` and as a runtime whitelist at `regime-filter.ts:33`.
- `market_regimes` has a CHECK constraint pinning the old labels (`004_hmm_regime.sql:13`); the table has **no writer anywhere** and is empty in prod, so a clean constraint swap is safe — no data remap.
- Unknown-label failure modes are mutually inconsistent today: `filterSignalsByRegime` fails open, `getAllocationRules` fails closed-to-crash, `getBreakersForRegime` **throws** (cascading to an unfiltered Pro broadcast via the outage fallback in `broadcast-decision.ts:119-135`), `GateStateBadge` crashes at render, the two dashboard clients silently coerce to neutral.
- `'neutral'` is load-bearing as the default in ~10 places. The new vocabulary has no neutral member.
- Old direction semantics (bear → SELL-only via `allowedDirections`) do not translate to a structural vocabulary. They also never fired in prod (regime was permanently neutral), so dropping them is not a live regression.
- The existing models are fitted to **synthetic** data; the Python trainer's feature math already disagrees with the TS runtime's (summed vs compounded returns, raw vs log-return vol) — a known parity bug class.
- Candle store coverage: 10 crypto symbols backfillable from `data-api.binance.vision`; BTCUSD H1 = 17,497 bars (2024-06-10 → 2026-06-09) evidenced in REGISTRY.md. FX/metals have zero stored candles (Stooq PoW blocker) — crypto-only training, matching the owner's crypto-only execution decision.
- Cron infra: in-process timers in `instrumentation.ts` → `/api/cron/sync` fan-out (55s shared budget, hourly slot = `hour % n === 0 && minute < 10`); route pattern to copy = `cron/universe/route.ts`; ops alert pattern = `cron/ops-digest/route.ts` (`sendTelegramMessage` + `parseOpsAdminIds`).
- Worktree footguns: all edits target `D:\Chatbot\tradeclaw\.claude\worktrees\phase3-regime-engine\...`; jest needs the worktree-ignore pattern overridden; `@tradeclaw/signals` dist is gitignored — `npm run build:signals` before anything that resolves the package by name.

## Design decisions

**D1 — Canonical vocabulary.** `MarketRegime = 'trend' | 'volatile' | 'range'` (spelling from the umbrella plan). One unified unknown-label policy everywhere: fall back to `range` semantics (the smallest-weight state per the owner's spec), never throw, never silently drop. `range` replaces `neutral` as the universal default. `getBreakersForRegime` stops throwing.

**D2 — Direction moves out of the regime layer.** All three states allow both directions (`allowedDirections: ['BUY','SELL']`). Direction-conditional dispatch is Phase 4's router (trend → momentum, volatile → mean-revert both ways, range → fade smallest weight). Documented as intentional.

**D3 — Allocation rules re-specified (not renamed).** trend: 80% exposure / 2x / 15% single; volatile: 40% / 1x / 8% / tightenStops; range: 30% / 1x / 6% (smallest weight per owner). Initial constants, recalibrated in Phase 4 against measured per-regime outcomes.

**D4 — Breakers re-specified.** trend widest (old-bull-like), volatile tightest (old-crash-like), range middle. risk-veto `TRENDING_REGIMES = ['trend']`.

**D5 — One feature implementation, in TypeScript.** `packages/signals/src/regime/features.ts` is the only place the four features exist: ADX(14) Wilder, BB bandwidth(20,2σ) in percent (existing repo convention), ATR(14)/close percentile rank over a trailing 252-bar window, lag-1 Pearson autocorrelation of the last 30 log returns. Array/single-pass (not scalar-per-bar O(n²)). Warmup returns null — no silent fallbacks (the live engine's `price*0.01` ATR fallback must never reach training data). The Python trainer consumes **exported feature vectors**, never recomputes features — kills the parity bug class structurally.

**D6 — Classifier.** 3-state full-covariance Gaussian HMM. Inference = `viterbiDecode` over the trailing T=64 feature observations (the T>1 smoothing the plan asks for; the math layer already supports it), confidence = forward-algorithm posterior of the terminal state. Features standardized using train-window means/stds stored in the model JSON (no lookahead). State→label mapping is deterministic from emission means: highest ADX mean → trend; of the rest, higher ATR-percentile mean → volatile; remainder → range. Hysteresis/min-dwell is a pure, tested function (`applyHysteresis`): a label switch requires the previous label to have been held ≥ minDwell bars (default 6 H1 bars) unless the new label's posterior ≥ 0.80. `PriceBar` widens to full OHLCV (high/low required by ADX/ATR). Old model JSONs deleted; new `crypto_hmm.json` trained on real BTC/ETH/SOL H1; `getDefaultModel` rewritten as a documented 3-state heuristic fallback (covers forex/metals until real data exists).

**D7 — Trainer + walk-forward (gate evidence).** `backfill-candles.ts` gains `--out-dir` (dump fetched candles to JSON files — training runs need no prod DB). New `scripts/research/export-regime-features.ts` (candles from DB or `--candles-dir` → TS features → per-symbol feature files). `scripts/hmm-regime/train_hmm.py` rewritten: reads real exported features (synthetic generator deleted), pools BTC/ETH/SOL H1, walk-forward folds (train 12mo → test 3mo, step 3mo), per fold on TEST only: regime distribution, flips/week, mean dwell, and regime-conditional forward outcomes (next-24-bar return mean/std and |return| separation). Outputs model JSON + validation report to `docs/research/experiments/` + REGISTRY.md append. Determinism: seed 42, fixed fold boundaries; spec mirrors run-backtest-cli conventions. **EM implementation**: hmmlearn has no Python 3.14 wheel (source build fails without a compiler toolchain — verified 2026-06-11), so the trainer ships a self-contained numpy Baum-Welch (full covariance, ridge-regularized, log-space) and `requirements.txt` drops to numpy only; the fitter is verified by a `--self-test` mode that recovers known parameters from a synthetic 3-state HMM (synthetic data unit-tests the fitter; the product model trains on real candles only).

**D8 — Writer.** Migration `050_market_regimes_vocab.sql` swaps the CHECK constraint (table empty — safe). `apps/web/lib/candle-store.ts`: read recent candles via db-pool + `refreshCandles` pulling latest **closed** H1 bars from `data-api.binance.vision` with `ON CONFLICT DO NOTHING` (append-only, same source/mapping as backfill) — without this the writer would classify frozen backfill data forever. `apps/web/lib/regime-writer.ts`: per crypto symbol → refresh → last ~400 H1 bars → classify → hysteresis vs latest persisted row → INSERT. Route `/api/cron/regime` (universe pattern), hourly slot in `cron/sync`. Observability: `lib/regime-health.ts` (`rows / latestAt / distinctSymbols / stale>2h / allOneLabel`), wired into the daily ops-digest, plus an immediate ops Telegram alert from the regime cron when 0 rows were written. Health checks query the table directly — **not** through `fetchRegimeMap`, whose error-swallowing hid the dead layer.

**D9 — Operator override.** `apps/web/lib/regime-resolution.ts`: `fetchResolvedRegimeMap()` = algo map ⊕ weekly-card override. Mapping: class TRENDING + conviction 3 → hard `trend` override for that class's symbols (bias/conviction carried alongside for Phase 4, not collapsed); conviction 1–2 → recorded tilt only; NEUTRAL or null card → defer to algo (documented fail-safe). Symbol→class: crypto→crypto, XAU/XAG→commodities, else forex (via `getSymbolCategory`). Consumers (`broadcast-decision.ts`, `risk-pipeline` callers, `/api/signals`, `telegram-broadcast`) switch to the resolved map. weekly-regime README/types "never conflate" guidance updated to describe the override mapping.

**D10 — Stray vocabularies retired.** `packages/agent` regime-detector skill relabels to trend/volatile/range; strategy-library `RegimeFit` → `'trend' | 'range' | 'both'` with `data/strategy_library.json` + admin page updated.

**D11 — Out of scope (logged, not creeping in).** Phase-4 strategy routing/dispatch; confidence calibration; per-regime backtest re-baselining beyond the validation report; LLM-advisory enforcement; breaker signed-PnL Math.abs fix and DrawdownTracker dedup (Phase 5 execution work); rewriting historical `signal_history.regime='neutral'` rows (immutable record — analytics must treat old rows as legacy vocabulary).

## Commit sequence (one concern per commit, ≤15 files each)

1. `docs(plan): Phase 3 regime-engine implementation plan` — this document.
2. `feat(signals): structural regime feature extractors` — `features.ts` + tests (additive; no vocabulary change yet).
3. `feat(signals)!: canonical trend/volatile/range vocabulary + T>1 classifier with hysteresis` — types, classifier, default model, regime-rules, allocator baselines, breaker-config, risk-veto, index exports + package tests updated.
4. `feat(strategies): backtest entries follow the structural vocabulary` — regime-aware/hmm-top3 + tests (pass-through direction filter documented; real routing is Phase 4).
5. `feat(web): migrate regime consumers to the canonical vocabulary` — migration 050, regime-filter, full-risk-gates, GateStateBadge (crash → graceful fallback), RegimeClient, AllocationClient (incl. fixing the drifted display table — page rewritten anyway), api/v1 regime + docs string, llm-risk-verify prompt + web tests.
6. `feat(web): market_regimes writer cron + regime/candle freshness alerting` — candle-store, regime-writer, regime-health, cron route, sync slot, ops-digest section + tests.
7. `feat(web): weekly card maps onto canonical regimes as operator override` — regime-resolution, weekly-regime mapping, consumer call-site switch, docs + tests.
8. `refactor: retire stray regime vocabularies (agent skill, strategy library)`.
9. `feat(research): real-data regime trainer + walk-forward validation` — backfill `--out-dir`, export-regime-features, train_hmm.py rewrite, new model JSON, validation report + REGISTRY entry, old models deleted, hmm-regime README.
10. `docs: umbrella plan Phase 3 status + operator runbook updates`.

## Verification gates

- Per commit: `npx jest --modulePathIgnorePatterns=standalone <touched suites>` green in the worktree; `npm run build:signals` (and `build:all` at the end) green; no `console.log` additions.
- Classifier: unit tests for feature math (known-value fixtures), hysteresis (flap suppression), state-labeling determinism, unknown-label fallbacks (allocation/breakers/UI all resolve to range, none throw).
- Trainer: same input → byte-identical model JSON + report (seeded). Validation report exists in `docs/research/experiments/` with flips/week, dwell, and per-regime forward-outcome separation on test windows — the umbrella plan's gate evidence.
- Writer: route handler test with mocked db-pool (writes rows, hysteresis respected, 0-row path triggers alert payload); health check flags empty + stale + single-label degenerate states.
- End-to-end (operator, post-merge): apply migration 050, let the hourly cron run, then `/api/v1/regime` shows non-range diversity across symbols within a day; ops-digest carries the regime-health section.

## Operator actions required (surfaced at PR time)

1. Approve + apply migration 050 to prod (runs automatically via `scripts/run-migrations.mjs` on next deploy — review before merging).
2. Confirm `OPS_TELEGRAM_ADMIN_IDS` + `TELEGRAM_BOT_TOKEN` are set in prod so the empty-regime alert can fire.
3. Optional: re-run the trainer against the prod candle store (`railway run`) to regenerate the model from the canonical store; the committed model is trained on identical public Binance data fetched at build time.

## Deferred observations (logged, not creeping in)

1. `packages/agent/skills/__tests__/regime-detector.test.ts` re-implements `classifyRegime` inline (the skill imports dist at module top) — test and skill can silently diverge; restructure candidate for an agent-package pass.
2. `packages/agent/skills/regime-detector/index.js` JSDoc says "ADX < 25" but the gate is the upstream `adx.trending` boolean whose threshold lives in the signals engine — pre-existing doc imprecision.
3. `apps/web/data/strategy_library.json` `generated: 2026-06-03` is stale after the C8 `regime_fit` relabel; `_meta` lacks a `regime_fit` values legend.
4. `apps/web/lib/full-risk-gates.ts` header claim "importable without server-only" is now transitively false via `regime-resolution` → `weekly-regime/service` (all real importers are server-side; jest stubs it).
5. Hysteresis barely binds in walk-forward (raw ≈ smoothed flips): label stability comes from the 64-bar decode window; revisit dwell/override params with Phase 4 data.
6. Phase 4 calibration note: deterministic ADX-first state labeling means the trend state may also be the highest-ATR state on crypto H1 (observed 3/4 folds).
