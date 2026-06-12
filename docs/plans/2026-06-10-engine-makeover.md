# Engine Makeover — regime-routed edge, honest track record, broker execution

Date: 2026-06-10
Status: Phases 0–2 merged to main; Phase 3 code-complete on branch worktree-phase3-regime-engine (awaiting PR review + merge); Phase 4 code-complete on branch worktree-phase4-strategy-dispatch (2026-06-11) — walk-forward gate FAILED on paper, live activation correctly blocked; Phase 5 not yet started
Owner goal (verbatim intent): consistent profit across three regimes — trending → catch the move, volatile → mean-revert both directions, neutral/range → range-bound with the smallest weight. The track record is the selling point; the engine is the moat.
Evidence base: 7-agent subsystem audit (2026-06-10, this session) + the 43-agent why-no-uptrend audit (PR #110, `docs/plans/2026-06-10-track-record-pro-uptrend.md`). All claims below were verified against current code on `main` @ `17309cf`.

This is the umbrella roadmap. It indexes existing plan docs as sub-plans instead of duplicating them. Update this doc in place as phases land.

## The honest baseline (what the audit found)

1. **Edge**: gross expectancy ≈ +0.06R/trade on the unfiltered firehose. Confidence is a relabeled TradingView `Recommend.All` snapshot (scanner) or an affine transform of an arbitrary weighted vote (TA engine, `signal-generator.ts:187`) — never calibrated to realized outcomes. "4-TF confluence" stacks autocorrelated inputs in both engines and is the only path to the premium band (`signal-generator.ts:742-744,808-810` cap + MTF re-boost).
2. **Regime layer is dead at runtime.** Nothing in the repo writes `market_regimes` (verified: zero `INSERT INTO market_regimes` matches). Every consumer — `regime-filter.ts`, regime-conditioned gates, regime-adaptive breakers — permanently resolves `neutral`. The HMM's states (crash/bear/neutral/bull/euphoria) encode drift direction, not trend/range/volatile structure; inference is T=1 (transition matrix unused); models were trained on synthetic OHLCV only (`scripts/hmm-regime/train_hmm.py`).
3. **Strategy dispatch is label-only.** `STRATEGY_PROFILES` contains only `classic`; `SIGNAL_ENGINE_PRESET=hmm-top3` silently downgrades, yet every recorded row is stamped `hmm-top3` — the public per-strategy track record misattributes, and Pro "strategy unlocks" sell labels (`signal-generator.ts:81-102`, `tracked-signals.ts:86-89`, `tier.ts:151-157`).
4. **The sellable record is unmeasured.** The cron records the raw firehose first and only console-warns the regime/breaker/allocator decision that shapes the Pro broadcast (`cron/signals/route.ts:316-337`). No regime tag, no broadcast-scope flag, no per-row cost, no immutable timestamps, no resolution provenance.
5. **No research loop.** No historical OHLCV store (every provider capped ~300 bars), zero cost model in `run-backtest.ts`, no walk-forward/out-of-sample/Monte Carlo (the glossary claims all three — false), backtest geometry (fixed 2%/1% TP/SL) ≠ live geometry (ATR-calibrated stops).
6. **Execution exists but is unsafe and unwired.** The Binance USDT-M pilot places real bracket orders with kill switches, but: SL-placement failure after a filled MARKET entry leaves a naked position with no tracking row (`executor.ts:291-300` — CRITICAL); no price-drift gate (entries up to ~6 min stale); status never re-polled; no reconciliation. Subscriber webhook fan-out is dormant — `dispatchToAll` is reachable only via manual HTTP endpoints, never from the pipeline.
7. **Honesty liabilities on the selling surface.** `/results` ships fabricated "Verified Backtests" (hand-typed metrics + seeded-PRNG curve + false "slippage and fees" copy, `backtest-results.ts:144-253`); four hardcoded marketing numbers (78% Acc, 67% win-rate banner, "92% of traders", fictional personas); `daily-track-record.yml` screenshots the contaminated stats to Telegram every day at 14:00 UTC.

## Why the webhook will not make money today (the math)

Costs in R-units = round-trip cost% ÷ stop-distance%. With 2.5×ATR stops on crypto majors (H1 ATR ≈ 0.3–0.8% → stop ≈ 0.75–2%) and Binance USDT-M taker fees (~0.05%/side) + the repo's own slippage model (~0.15%/side) + funding (absent from every model), round-trip cost ≈ 0.3–0.5% of notional ≈ **0.2–0.5R per trade**. Net expectancy = +0.06R gross − 0.2–0.5R costs = **negative**. The webhook is plumbing — it transmits whatever edge exists, minus costs. Plumbing first means automating a loss. Edge first, then plumbing.

## Phases

One concern per phase; each phase has a verification gate. Phases 2–3 can run parallel to Phase 1's data accrual.

### Phase 0 — Stop the bleeding (days)
Two tracks, both before any "improvement" work:
- **Honesty**: merge PR #110 (eyeball prod number shift first — resolved count drops); relabel or pull `/results` fabrication (strip "Verified" badge + false slippage/fees copy); fix the four hardcoded marketing claims; delete the glossary's walk-forward/Monte-Carlo claim; hold `daily-track-record.yml`/`weekly-report.yml` until PR #110 is live.
- **Safety**: fix the pilot's naked-exposure path (reduce-only market close instead of `cancelOrder`; persist the `executions` row before bailing). It is one EXECUTION_MODE flip away from being live-money risk.
- Gate: no public surface carries a number without a data source; pilot SL-failure path test-covered.

### Phase 1 — Measure the real product (wk 1–2 + 2wk data accrual)
The deferred Phase 2 of PR #110, plus schema for sellability:
- Re-sequence the cron: risk pipeline runs BEFORE persistence. Persist per row: `regime`, `broadcast_blocked`, veto/allocation reason, per-row cost estimate, wall-clock `published_at` (vs bar-time `created_at`), resolution provenance (provider/candle set). Prod migration — owner applies.
- Fix the calibration API row filter to use `isCountedResolved`; persist MAE on the cron path.
- Sub-plans: `2026-04-20-gate-blocked-recording.md` (pattern), PR #110 deferred item 1.
- Gate: after 2 weeks, /track-record renders a "Pro broadcast scope" curve from real rows.

### Phase 2 — Research loop: data + costs (wk 2–4, parallel)
The foundation of the secret sauce; without it every tweak is a guess.
- `candles` table + backfill job (Binance klines paginated; Stooq for FX/metals; ≥2 years of H1/H4/D1, point-in-time, reproducible).
- Cost model in `run-backtest.ts`: fees, spread, slippage, funding. Add a live-geometry preset (ATR stops) so backtests test the shipped strategy.
- Headless CLI runner (symbol/timeframe/date-range/strategy/costs → results to disk) + experiment registry (what was tested, on which window, with which parameters).
- Walk-forward split support. Re-run `simulate-full-risk-gates.js` on PR-#110-corrected outcomes — the +22.6pp validation may be partly an artifact of expired-as-win contamination.
- Gate: same backtest re-run twice gives identical output; a costed, live-geometry baseline number for the current engine exists (expect it to be ugly — that is the point).

### Phase 3 — Regime engine rebuild (wk 3–6)
- New structural classifier with the three states the product is built around: **trend / volatile / range**. Features: ADX, BB bandwidth, ATR percentile, return autocorrelation — not drift-direction. Keep the HMM machinery (viterbi already supports T>1) but with T>1 smoothing, hysteresis/min-dwell to prevent flapping; train and walk-forward-validate on the Phase-2 candle store.
- Build the missing `market_regimes` writer (cron over stored candles, per symbol). Add observability: alert when the regime map is empty — the current dead state was invisible for months.
- One canonical regime vocabulary; map the manual weekly card (`lib/weekly-regime/`) onto it as the operator-override layer. Retire the two stray vocabularies.
- Gate: prod regime distribution is no longer 100% neutral; label stability (flips/week) and walk-forward regime-conditional outcome separation reported.

**Phase 3 status — code-complete 2026-06-11.**
Branch `worktree-phase3-regime-engine`, 17 commits (`b0e5ec7..2f40bb8`). What landed:
- Structural trend/volatile/range classifier: T=64 Viterbi decode with hysteresis (minDwell 6 bars, confidence bypass at 0.80).
- Canonical vocabulary across all consumers; unknown-label fallback to `range` everywhere — `getBreakersForRegime` no longer throws.
- `market_regimes` writer cron + freshness alerting (empty-map Telegram alert, ops-digest regime-health section).
- Weekly-card operator override (`lib/regime-resolution.ts`): conviction-3 TRENDING → hard trend for that class; conviction 1–2 → tilt only; NEUTRAL/null → algo only.
- Stray vocabularies retired (agent skill, strategy-library `RegimeFit`).
- Real-data trainer (numpy Baum-Welch, self-test mode) + walk-forward validation on BTC/ETH/SOL H1 2024-06→2026-06.
Walk-forward gate evidence (4 folds, test windows only): no degenerate fold (max single-regime share 0.45), mean 8.29 flips/week, mean dwell 20.2 bars; regime-conditional |24h-return| separation present in 3/4 folds (≈0 in fold 2). Full report in `docs/research/experiments/` (REGISTRY.md entry 2026-06-11).
The gate's prod half — prod distribution no longer 100% neutral — is pending the operator deploy steps in the phase plan.
Calibration note for Phase 4: the trend state carries the highest ATR-percentile on crypto H1; "volatile" is the middle-magnitude state in 3/4 folds. Labels are structural (ADX-first), not a volatility ladder — Phase 4 must treat them accordingly.

### Phase 4 — Regime-routed strategies + calibrated confidence (wk 4–8)
The owner's spec, implemented as dispatch instead of labels:
- Real `STRATEGY_PROFILES` dispatch (kills the label-only preset and the `hmm-top3` misattribution stamp). Sub-plan: `2026-05-01-monetization-consolidation.md` Task 2 Phase 2/3 (already deferred there).
- Router: **trend** → momentum continuation (existing confluence engine + EMA-slope + ADX≥20 filter set from the pilot plan); **volatile** → mean reversion both directions (`vwap-ema-bb` BB-extreme entries are already coded); **range** → range-fade at band edges with the smallest allocation weight, per owner's weighting.
- **Confidence calibration — the only ceiling lifter.** Isotonic/logistic fit of features → realized P(TP1-before-SL) from `signal_history` (correct row filter); published confidence becomes a calibrated probability; shrink the autocorrelated-confluence bonus to its measured incremental value.
- Every strategy ships through the proven shadow playbook (`full-risk-gates-ab.md`): costed backtest → walk-forward → ≥4wk shadow recording → activate. Pre-registered criteria, no peeking.
- Gate: per-regime expectancy AFTER modeled costs > 0 on walk-forward AND in shadow before anything enters the Pro broadcast.

**Phase 4 status — code-complete 2026-06-11 on branch `worktree-phase4-strategy-dispatch` (16 commits, aa1ca52..e333857).** Sub-plan: `docs/plans/2026-06-11-phase4-strategy-dispatch.md`.

Machinery built (all shipped, all behind the gate):
- Pure regime→strategy router + trend-route filter (EMA-50 slope + ADX≥20), and honest strategy attribution — both `signal_history` writers now stamp the strategy that ACTUALLY ran (`scanner` / `classic`), killing the `hmm-top3` misattribution.
- Calibration features persisted at emission (migration 051: `pre_boost_confidence`, `mtf_agreement`, `confluence_bonus`, `cost_estimate_pct`) — forward-accruing, NULL on history.
- Regime-conditioned backtest harness (drives entry modules directly, dodging the top-3 window cap; 329-bar window saturates the atrPercentile to match the live writer's labels) + the per-regime walk-forward evidence run.
- Offline confidence calibrator (isotonic + logistic, time-ordered holdout) REPORTED through `/api/calibration` — published confidence unchanged.
- Shadow recorder (`TRADECLAW_STRATEGY_ROUTER_MODE`, default shadow) logging the would-be router + calibrated-confidence decisions, changing nothing live.

**Gate result — FAILED on paper (the finding that matters).** Per-regime walk-forward on BTC/ETH/SOL H1 2024-06→2026-06, after crypto-perp costs + live ATR geometry (`docs/research/experiments/regime-routed-walkforward-...json`, REGISTRY 2026-06-11): the trend route (the only non-thin cells, n=142–203) is NEGATIVE on all three symbols (−0.19% to −0.67% expectancy/trade after costs); the volatile and range routes (`vwap-ema-bb`) fire too rarely under live H1 geometry — every positive routed cell is THIN (<30 trades) and inconsistent across symbols. The current entry rules have no deployable per-regime edge after costs. This matches Phase 2's −11% live-geometry+costs baseline. The regime engine is correct; it can only route edge that exists.

**What this gates:** live activation of routing/calibration on the Pro broadcast stays BLOCKED (the umbrella gate: per-regime cost-adjusted expectancy > 0 on walk-forward AND ≥4wk shadow — the walk-forward half is negative). Path forward is a Phase-4.5 strategy-rethink (the entries, not the routing) and/or accruing shadow evidence; activation is a later operator decision against the pre-registered criteria. Confidence-bonus shrink remains data-gated on the migration-051 features accruing ≥4wk.

### Phase 5 — Execution hardening + webhook go-live (wk 6–10, gated on Phase 4 evidence)
- Order state machine (re-poll fills, persist transitions, `needs_attention` state); bidirectional reconciliation sweep + startup reconciliation; price-drift gate (reject if mark deviates > X bps/ATR-fraction from `sig.entryPrice`); live slippage measurement (signal price vs `avgPrice`, alert on degradation); runtime (DB/Redis) kill switch with per-symbol/per-strategy granularity.
- Wire `dispatchToAll` into the pipeline; HMAC-sign the alert-rules channel (currently plaintext secret, zero retries); unify the two webhook payload schemas; add sizing fields (risk%, stop distance) so a subscriber executor can size.
- Rollout: testnet ≥2wk → house-account small live ≥4wk. Pre-registered go/no-go: net expectancy after MEASURED costs > 0 over ≥100 trades, max drawdown within bound. Only then offer auto-execution to users.
- Sub-plan: `2026-05-01-tradeclaw-pilot-binance-futures.md` (risk rails already specced there).

## Owner decisions needed before work starts

1. Merge PR #110 after verifying prod numbers (resolved count will drop).
2. `/results`: relabel as illustrative, or pull the page. It cannot stay as-is.
3. Approve the Phase-1 prod DB migration.
4. Universe call: v1 execution is crypto-only (Binance USDT-M is the only executable leg). FX/metals stay signal-only until an MT5/MetaApi leg is built — or cut them from the public record to keep record and product congruent.
5. Data licensing: the scanner scrapes TradingView's screener via an unofficial package; Binance/Stooq redistribution terms unexamined. Selling signals + a track record built on it is a kill-risk to review.
6. Accept the timeline: ~8–10 weeks of focused work before a webhook should touch real money.

## Explicitly out of scope (logged, not creeping in)

- Multi-tenant per-user broker keys/consent — after the house account proves net-positive.
- Mobile payload contract changes (`apps/mobile` consumes the signal payload; coordinate separately).
- Marketing/blog content (`docs/blog/Satelite_Strike_Aggresive.md` is a 0-byte placeholder — write it from real tracked data after Phase 4 or delete it).
- LLM-advisory enforcement, breaker Math.abs signed-PnL fix, DrawdownTracker dedup — fold into Phase 3/5 work items, not separate efforts.

## What success looks like

Not a promise of profit — no engine can promise that. Success = the machinery that (a) finds and validates edge per regime against real costs, (b) deploys only what survives walk-forward + shadow, (c) kills strategies whose rolling net expectancy goes negative, and (d) produces a forward, cost-adjusted, regime-tagged, auditable track record. That track record — 90+ days of honest forward performance — is the only selling point that survives due diligence.
