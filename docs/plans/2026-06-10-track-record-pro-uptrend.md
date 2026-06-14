# Track Record — "why no uptrend" audit + fix plan

Date: 2026-06-10
Branch: `worktree-fix+track-record-pro-uptrend`
Author: Claude (Opus 4.8) for Naim
Method: 43-agent audit workflow (6 subsystem audits → adversarial verify → synthesis), reconciled against direct reads of the equity route, live signal generator, tier gate, and frontend.

## One-line restatement

The public equity curve runs to +700% then bleeds to +170% (−73% max drawdown); find why it has no sustained uptrend, fix the genuine bugs, and make the track record reflect the strategy actually deployed in Pro.

## Verdict (the honest answer)

There is no hidden uptrend that bugs are eating. Three causes, unequal blame:

1. **Measurement choice (dominant for the visible shape).** The default view measures the **all-signal firehose** (`band='all'`, 1% risk on ~100 signals/day) and the cron **records the raw scanner output while discarding the regime/circuit-breaker/allocator gate decision** that actually shapes the Pro broadcast. So the public curve is the *least* representative slice of the engine, not the product.
2. **Thin real edge (dominant for the ceiling).** Gross expectancy ≈ **+0.06R** against a borrowed, uncalibrated confidence signal (TradingView `Recommend.All`) and autocorrelated multi-TF "confluence". At that edge with 1% sizing over 3,192 trades, the path is a biased random walk — it *will* spike and give back. No display change manufactures edge.
3. **Genuine bugs (minor, mostly self-penalizing).** The heavy hitters from the old diagnosis (SL-priority same-bar loss, −1.5R gap floor, 100%-bankroll sizing) are **already fixed or are intentional conservative choices that bias the curve down**. The real bugs left are metric-coherence + a documented-contract violation, not curve-destroyers.

`audit: 36 candidate findings, 20 confirmed real.` Full memo archived in the workflow transcript.

## In scope NOW (this branch) — track-record-surface bug fixes

All locally verifiable, branch-isolated, one concern per commit. These align the displayed numbers to the engine's own documented definitions; they do not flatter the curve.

- **A. Exclude auto-expired closes from win-rate/equity.** The UI promises "Excludes auto-expired rows / not counted in win-rate" (`stat-hints.ts:29-32`) but `isRealOutcome` counts drift-expired rows as wins/losses and `landing-stats.ts:101-103` explicitly scores `target='expired' AND pnl_pct>0` as a win. Fix `isCountedResolved`, the history `expired` counter, and both landing-stats CTEs. Win-rate and resolved-count will shift to match the stated methodology (direction indeterminate; resolved count drops). Verify magnitude against prod before merge.
- **B. Compute `expectancyR` from the sized-trade population.** Currently multiplies a full-population win-rate by SL-subset R-averages — incoherent when legacy null-SL rows exist (`equity/route.ts:236`). Add `sizedWins`; keep `summary.winRate` full-population to preserve the `/history` byte-match invariant.
- **C. Use sample stddev (÷N−1) for the daily Sharpe** (`equity/route.ts:219-220`). Removes a small upward bias (largest at the N=5 floor).
- **D. Regression test pinning the sizing constants** (`riskPerTradePct=1`, `hardRCap=8`, `roundTripCostPct=0.02`, ~19R fixture clips to ~8%) so the prior sizing-blowup fix can't silently loosen.

Verification: `npm test` on `equity/route.test.ts`, `signal-history*` tests, landing-stats test; `tsc --noEmit` on apps/web.

## Deferred — OWNER DECISIONS (not implemented; need your call)

1. **Broadcast-filtered "Pro strategy" scope — the real answer to your ask.** Make the gated subset measurable: re-sequence the cron to run regime + risk pipeline *before* persistence, tag rows `broadcast_blocked`, keep raw rows, and expose a "broadcast-filtered" equity scope next to all/premium. **Needs a DB migration you apply to prod + ~2 weeks of data before it shows anything.** Do NOT silently default the public curve to `band='premium'` — the premium band's edge is unproven (borrowed confidence), so that would be cherry-picking. Recommend: greenlight this as Phase 2.
2. **`/results` "Verified Backtests" fabrication.** `backtest-results.ts` ships hand-typed metrics (+12%–45%, 55–72% WR) + a seeded-PRNG equity curve, presented as real engine output with false "realistic slippage and fees / 12 months historical data" copy. Separate surface, but a real honesty/liability defect. Recommend: relabel "Illustrative — not live engine results", strip the false copy, drop the "Verified" badge.
3. **Edge calibration — the only real uptrend lever.** Calibrate confidence to realized P(TP1-before-SL) and shrink the autocorrelated confluence bonus. This is the only change that lifts the +0.06R ceiling. Larger effort; flag for a dedicated plan.

## Explicitly NOT bugs (do not spend effort)

SL-priority same-bar loss (intentional, test-guarded, biases down); −1.5R gap floor (already fixed `219d7cc`, raises losses toward zero); 100%-bankroll sizing (already replaced `0082e01`); default `band='all'` headline (the anti-cherry-pick choice); round-trip 2bps cost (correct + disclosed); zero-anchored y-axis; `run-backtest.ts` hardcoded TP/SL (offline harness, not the live curve).

## Honesty line

A fix is honest when it makes the displayed number track reality regardless of direction. A–D do that (A's sign is indeterminate; it just stops the code contradicting its own captions). The cherry-pick to avoid is defaulting the public curve to premium-only before the gated subset has earned it with real data.
