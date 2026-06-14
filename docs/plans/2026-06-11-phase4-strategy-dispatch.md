# Phase 4 — Regime-routed strategy dispatch + calibrated confidence

Date: 2026-06-11
Status: CODE COMPLETE 2026-06-11 — all 9 planned commits landed (plus review-fix commits, 16 total aa1ca52..e333857); walk-forward gate FAILED on paper (current entries have no per-regime edge after costs); live activation blocked; awaiting final branch review + PR
Parent: `docs/plans/2026-06-10-engine-makeover.md` Phase 4 (lines 55–61)
Branch: `worktree-phase4-strategy-dispatch` (base `aa1ca52` = Phase 3 head; PR #115 still open, so this branch is stacked on Phase 3 and its PR retargets `main` once #115 merges)
Evidence base: 5-agent read-only survey (2026-06-11) over dispatch, confidence, calibration data, pipeline order, and research/backtest infra. File:line refs verified at `aa1ca52`; any line cited from a survey is re-verified before the commit that touches it.

## What Phase 4 must deliver (from the umbrella plan)

1. Real strategy dispatch that kills the label-only preset and the `hmm-top3` misattribution stamp.
2. A regime router: **trend** → momentum continuation (confluence engine + EMA-50 slope + ADX≥20 from the pilot plan); **volatile** → mean reversion both directions (`vwap-ema-bb` BB-extreme entries, already coded); **range** → range-fade at band edges with the smallest allocation weight.
3. Confidence calibration: isotonic/logistic fit of features → realized P(TP1-before-SL) from `signal_history`; published confidence becomes a calibrated probability; shrink the autocorrelated-confluence bonus to its measured incremental value.
4. Every strategy ships through the proven shadow playbook: costed backtest → walk-forward → ≥4wk shadow recording → activate. Pre-registered criteria, no peeking.

Gate: per-regime expectancy AFTER modeled costs > 0 on walk-forward AND in shadow before anything enters the Pro broadcast.

## Ground truth that shapes the design (verified, with the honest reframes)

- **The live generator is the Python scanner, not the TA presets.** `cron/signals/route.ts:collectNewSignals` uses `readLiveSignals()` (scanner `data/signals-live.json`) when coverage ≥8 symbols and fresh; only on the fallback does it call the Next.js TA engine `getSignals()`. The scanner is one strategy (Zaky EMA21/VWAP/RSI/Supertrend). So in prod, most live rows are scanner-generated.
- **There are two parallel "strategy" systems.** (a) `apps/web/app/lib/signal-generator.ts` `STRATEGY_PROFILES` — the LIVE TA engine — defines only `classic`. (b) `packages/strategies/src/presets.ts` `PRESETS` — five strategies (`classic`, `regime-aware`, `hmm-top3`, `vwap-ema-bb`, `full-risk`) — is reachable ONLY from the backtest runner. `getActivePreset()` (`preset-dispatch.ts`) stamps the env preset id (`hmm-top3` in prod) onto live rows, but the entry modules in (b) never run live. **The misattribution: live rows are stamped `hmm-top3` while the actual live generation is scanner or the `classic` TA profile.** (`preset-dispatch.ts`'s `VALID_STRATEGY_IDS` does contain all five — correcting the survey — so the bug is the cross-system stamp, not the whitelist.)
- **Allocation is metadata-only at runtime.** The allocator writes `allocation_pct` to `signal_history` but does not size or gate anything live (sizing is Phase 5 execution). So "range gets the smallest weight" is a recorded number today, not a live lever. The live levers Phase 4 can pull are: which signals reach the **Pro broadcast**, and what **confidence** they carry.
- **Regime tags only exist since migration 048 (2026-06-10).** Older rows carry NULL or legacy `neutral`; structural `trend/volatile/range` accrues only forward. `isCountedResolved` (`signal-history.ts:41-54`) is the canonical resolved filter (excludes simulated, gate-blocked, non-real, and `expired`).
- **Calibration's headline feature is not yet measurable.** Pre-MTF-boost confidence and the MTF agreement count are **not persisted** — only final post-boost `confidence` is. The premium ≥85 band is reachable ONLY via the hardcoded confluence bonus (+15 for 4/4) on top of a 70 cap. To "shrink the confluence bonus to its measured incremental value" we must FIRST persist pre-boost confidence + agreement count, THEN let data accrue. No per-row cost fields exist in `signal_history` either.
- **The shadow playbook already exists and is reusable.** `TRADECLAW_GATE_MODE=shadow|active`, NDJSON decision log, pre-registered activation (≥30 resolved would-blocks, hit-rate delta, Wilson CI) — `docs/plans/full-risk-gates-ab.md` + `full-risk-gates.ts`.
- **The backtest runner window-caps `hmm-top3`/`full-risk`** (3 trades/2y — the top-3 cap applies to the whole window, not per scan cycle: `run-backtest-cli.ts` `WINDOW_CAPPED_PRESETS`). Regime-conditioned backtests must drive the entry modules directly (classic/confluence, vwap-ema-bb), not the top-3 slice. `options.context = {symbol, timeframe}` already routes the regime classifier to the correct asset-class HMM (`crypto_hmm.json`).

## What Phase 4 ships now vs. what is operator/data-gated (the honest line)

Phase 4 is the largest phase (umbrella wk 4–8). Following Phase 3's precedent, the CODE deliverable is the machinery + offline evidence + shadow recording. **Live activation is operator-gated after ≥4wk shadow and the cost-adjusted per-regime gate passes** — exactly the umbrella gate. This branch does NOT flip the Pro broadcast onto routed/calibrated output.

Ships now (code + offline evidence):
- Honest strategy attribution (kills the misattribution stamp).
- A pure regime→strategy router + the trend-route filter set (EMA-50 slope + ADX≥20), additive then dispatched in the TA path, recorded per row.
- Regime-conditioned costed walk-forward backtests of the three routed strategies → registry evidence (offline half of the gate; expect ugly honest numbers).
- Persisting the missing calibration features going forward (pre-boost confidence, MTF agreement, confluence bonus, per-row cost estimate).
- An offline calibration fitter (isotonic + logistic) → calibrated-probability artifact, surfaced through the existing `/api/calibration` as a REPORTED curve (not yet the published confidence).
- A shadow recorder (`TRADECLAW_STRATEGY_ROUTER_MODE=shadow` default) for router + calibrated confidence, so forward data accrues for the activation gate.

Operator/data-gated (NOT in this branch's live path):
- Routing actually changing the Pro broadcast set.
- Published confidence becoming the calibrated probability.
- Confluence-bonus shrink to measured incremental value (needs the newly-persisted features to accrue ≥4wk).

## Design decisions

**D1 — Router is a pure function.** `selectStrategyForRegime(regime, direction): StrategyId` lives in `packages/strategies` (or `packages/signals`), no I/O. Mapping: `trend` → momentum continuation (the confluence/classic entry gated by EMA-50-slope-agrees + ADX≥20); `volatile` → `vwap-ema-bb` (mean-revert both directions); `range` → range-fade at band edges (`vwap-ema-bb` geometry with the smallest allocation weight). Unknown/missing regime → the smallest-weight `range` route (matches the Phase 3 unknown-label policy). Direction is an input but never overridden — the router selects a strategy, it does not impose direction (Phase 3 D2 holds).

**D2 — Trend-route entry filter.** Encode the pilot plan's set (`docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md`): H1 EMA-50 slope must agree with signal direction, ADX(14) ≥ 20. A pure, tested predicate reused by both the live router and the backtest harness — one implementation, no parity drift (the Phase 3 D5 discipline).

**D3 — Honest attribution first, independent of routing.** Record the strategy that ACTUALLY produced each live row: `scanner` for scanner rows, the real TA profile id for fallback rows. Stop stamping `hmm-top3` when the hmm-top3 entry module did not run. This is the audit's headline correctness fix and is a standalone commit. Verify the exact `strategyId` flow in `signal-generator.ts` + `cron/signals/route.ts` before editing; the public per-strategy track record and Pro "strategy unlock" copy depend on it.

**D4 — Persist calibration features forward (migration + recording).** Add to `signal_history`: `pre_boost_confidence`, `mtf_agreement` (0–4), `confluence_bonus`, `cost_estimate_pct` (modeled round-trip cost in R or %, documented unit). Populate at emission in the cron path. Migration idempotent, additive (nullable columns; historical rows stay NULL and are legacy per Phase 3 D11). This UNBLOCKS the confluence-bonus-shrink measurement — which then accrues forward, it is not retroactive.

**D5 — Regime-conditioned backtest harness.** Add a backtest mode that classifies each bar's regime (`classifyRegime` over the trailing window using the committed `crypto_hmm.json`, via `options.context`) and restricts a chosen entry module to bars whose regime == the target, emitting per-regime metrics (trades, win rate, expectancy AFTER modeled costs, profit factor, max DD) per walk-forward fold. Drives entry modules directly to dodge the top-3 window cap. Deterministic (seeded, model-hash recorded), same conventions as `run-backtest-cli.ts`.

**D6 — Offline per-regime walk-forward run (the gate evidence).** Run D5 for the three routed strategies on BTC/ETH/SOL H1 (2024-06→2026-06): trend-route (confluence + EMA-slope + ADX≥20), volatile-route (`vwap-ema-bb` BB-extreme), range-route (band-edge fade). Per-regime, per-fold, after crypto perp costs + live ATR geometry. Output to `docs/research/experiments/` + `REGISTRY.md`. Honest numbers only — if a route's cost-adjusted per-regime expectancy is ≤0, that is the finding, reported as-is (the gate is allowed to FAIL on paper; that gates live activation, not the commit).

**D7 — Offline confidence calibrator.** Fit isotonic regression and a logistic baseline of available features → realized P(TP1-before-SL) over `isCountedResolved` rows, with a time-ordered train/validation holdout (last N days validation, no peeking). Features limited to what history actually carries (final `confidence`, `entry_atr`, `atr_multiplier`, `regime` where present, `direction`, `timeframe`, `symbol`, `strategy_id`, `mode`, hour-of-day). Emit a calibrated-probability model artifact + Brier/ECE/reliability on validation. Surface the calibrated curve through the existing `/api/calibration` as a REPORTED comparison against raw confidence — published confidence is NOT changed in this branch. Explicitly document that the confluence-bonus shrink (umbrella ask) is data-gated on D4 accrual.

**D8 — Shadow recorder for router + calibrated confidence.** `TRADECLAW_STRATEGY_ROUTER_MODE=shadow|active|off` (default `shadow`), mirroring the gate-shadow pattern. In shadow, record per candidate what the router WOULD select and what confidence the calibrator WOULD publish, without changing the live broadcast or published confidence. NDJSON log + the per-row columns from D4. Pre-registered activation criteria documented (per-regime cost-adjusted expectancy > 0 on ≥4wk shadow AND on walk-forward; calibration not degrading published reliability). This is the forward-data engine for the activation gate.

**D9 — Out of scope (logged, not creeping in).** Live activation of routing/calibration on the Pro broadcast (operator, post-shadow); live position sizing from `allocation_pct` (Phase 5 execution); mobile payload contract changes (`apps/mobile` renders whatever confidence number it receives — no schema change); the subscriber webhook fan-out (Phase 5); rewriting historical `strategy_id`/`regime` rows (immutable; legacy vocabulary per Phase 3 D11); retraining the regime HMM (Phase 3 artifact is reused as-is).

## Commit sequence (one concern per commit, ≤15 files each)

1. `docs(plan): Phase 4 strategy-dispatch + calibration implementation plan` — this document.
2. `feat(strategies): pure regime→strategy router + trend-route filter set` — `selectStrategyForRegime`, EMA-50-slope/ADX≥20 predicate, types, unit tests. Additive; no live wiring.
3. `fix(web): honest strategy attribution — record the strategy that actually ran` — kill the `hmm-top3` misattribution stamp; scanner rows stamped `scanner`, TA rows stamped the real profile. Tests + a note on the public track-record/tier copy implications.
4. `feat(web): persist calibration features at emission` — migration (`pre_boost_confidence`, `mtf_agreement`, `confluence_bonus`, `cost_estimate_pct`) + cron recording. Idempotent, additive. Data starts accruing.
5. `feat(strategies): regime-conditioned backtest mode + per-regime metrics` — bar-regime tagging via classifier, entry-module restriction, per-regime/per-fold cost-adjusted expectancy. Tests + determinism.
6. `feat(research): per-regime walk-forward evidence for the three routed strategies` — CLI run + report + `REGISTRY.md` entry. The offline gate evidence (honest numbers).
7. `feat(web): offline confidence calibrator + reported calibrated curve` — isotonic/logistic fit, artifact, `/api/calibration` reported comparison; confluence-shrink documented as data-gated. Tests.
8. `feat(web): shadow recorder for router + calibrated confidence` — `TRADECLAW_STRATEGY_ROUTER_MODE` shadow path, NDJSON + columns, no live-broadcast change. Tests.
9. `docs: umbrella plan Phase 4 status + operator runbook + deferred observations`.

## Verification gates

- Per commit: `npx jest --modulePathIgnorePatterns=standalone <touched suites>` green in the worktree; `npm run build:signals`/`build:strategies` as relevant (and `build:all` at the end) green; no `console.log` in production paths (CLI scripts exempt).
- Router: unit tests for every regime→strategy mapping, the trend filter predicate (EMA-slope/ADX boundaries), and unknown-regime → range fallback.
- Attribution fix: a test proving a scanner row is stamped `scanner` and a fallback row is stamped its real profile (never a not-run module id).
- Migration: idempotent re-run safe; additive nullable columns; recording populates them at emission (route handler test with mocked db-pool).
- Backtest harness: same input → identical per-regime metrics (seeded, model-hash recorded); entry modules not window-capped under it.
- Calibrator: deterministic fit (seeded); reliability (Brier/ECE) reported on a time-ordered holdout; reported-only (published confidence unchanged — assert the live payload is untouched).
- Shadow: route handler test that shadow mode records router/calibrator decisions WITHOUT altering the broadcast set or published confidence.
- End-to-end (operator, post-merge): the offline registry shows per-regime cost-adjusted expectancy; shadow columns/NDJSON accrue in prod; activation is a later operator decision against the pre-registered criteria.

## Operator actions required (surfaced at PR time)

1. Review + apply the D4 migration to prod (auto-runs via `scripts/run-migrations.mjs` on deploy; additive nullable — safe).
2. Confirm `TRADECLAW_STRATEGY_ROUTER_MODE` is unset or `shadow` in prod (default shadow; nothing changes live until an explicit `active` flip after the gate passes).
3. Let shadow data accrue ≥4wk, then evaluate the pre-registered per-regime cost-adjusted expectancy gate before any `active` flip or confidence-publishing change.
4. The confluence-bonus shrink remains data-gated until D4 features have ≥4wk of resolved rows — do not act on it before then.

## Deferred observations (logged, not creeping in)

1. `active` mode of `TRADECLAW_STRATEGY_ROUTER_MODE` records but does NOT enforce — enforcement is the operator-gated activation step (post-shadow-evidence), intentionally not built this branch.
2. Multi-feature calibration + the confluence-bonus shrink are data-gated on migration-051 features (`pre_boost_confidence`, `mtf_agreement`, `confluence_bonus`) accruing ≥4wk of resolved rows — NULL on history; v1 calibrates confidence→P(win) only.
3. `current.ts`'s `MultiTFResult.agreementCount` is a separate 3-TF survey (range 0–3) and is NOT the persisted `mtf_agreement` (4-TF survey, 0–4) — disambiguated in-code; do not conflate in the calibrator.
4. The regime-conditioned backtest runs 3 separate conditioned backtests per route (per-regime attribution); a trade entered in regime R runs its exit through other regimes' bars — correct semantics for "expectancy of entering in R", documented.
5. The per-regime walk-forward run takes ~20 min (real classifier per signal over ~17.5k bars × routes × folds); operators should budget time or reduce symbols/window for iteration. Volatile/range route cells are THIN under live H1 geometry — the routing thesis is neither confirmed nor refuted on those, only the (negative) trend route is.
6. The calibration `/api/calibration` route reads full history per request (5-min revalidate-gated); the router shadow path uses the cached history layer. `normalizeConfidence` is now single-sourced in `confidence-calibration.ts`.
7. The shadow recorder refits the calibration map once per tick (cached read); a high-frequency activation path could cache the fitted map — follow-up if/when active enforcement lands.
