# Strategy Dispatch + Confidence Calibration — Operator Guide (Phase 4)

**SHADOW-ONLY — do NOT flip to active.** The walk-forward gate FAILED on paper:
the trend route (the only non-thin cells, n=142–203) is NEGATIVE after costs on all
three symbols tested (−0.19% to −0.67% expectancy/trade). Live routing and
calibration are not deployed to the Pro broadcast. All Phase 4 machinery is behind
the shadow recorder until the gate passes.

This guide covers the environment variables, migration 051, the calibration report,
and the pre-registered activation gate. It does not replace the
[regime-engine guide](./regime-engine.md), which covers the classifier, cron, and
weekly-card override.

## Environment / modes

`TRADECLAW_STRATEGY_ROUTER_MODE` controls the shadow recorder:

- `shadow` (default, unset behaves identically) — records would-be router and
  calibrated-confidence decisions to the NDJSON log and the per-row shadow columns.
  No change to the live Pro broadcast or published confidence.
- `active` — RESERVED. The current build records but does NOT enforce routing or
  calibration on the live broadcast. `active` is a placeholder for the future
  activation step; do not set it until the gate criteria are met and the enforcement
  code is deployed.
- `off` — disables shadow recording entirely. Use only during debugging; shadow data
  accrual is required for the activation gate.

Keep this variable unset or set to `shadow` in prod.

Shadow log path defaults to `/tmp/tradeclaw-router-decisions.log`. Override with
`TRADECLAW_ROUTER_LOG_PATH`.

## Migration 051

`051_calibration_features.sql` adds four nullable columns to `signal_history`:

- `pre_boost_confidence` — raw confidence before the MTF-agreement bonus is applied.
- `mtf_agreement` — 4-TF agreement survey result (0–4). Distinct from
  `MultiTFResult.agreementCount` (a separate 3-TF survey, 0–3) in `current.ts`.
- `confluence_bonus` — the bonus actually applied at emission.
- `cost_estimate_pct` — modeled round-trip cost as a percentage of notional.

The migration runs automatically via `scripts/run-migrations.mjs` on deploy. It is
additive (nullable columns only) and safe to apply without a rollback window.
Historical rows remain NULL — these features accrue forward only.

## Calibration report

`/api/calibration` now returns the standard reliability data plus:

- Isotonic regression calibrated curve (features → predicted P(TP1-before-SL)).
- Logistic baseline calibrated curve.
- Holdout reliability: raw vs calibrated Brier score and ECE on the time-ordered
  validation slice (last N days, no peeking).

These are reported only. Published confidence in the signal payload is unchanged.

Holdout metric fields return `null` when the validation slice has fewer than 8
resolved rows — too thin to trust; do not act on null metrics.

## The activation gate (pre-registered, currently FAILING)

Before any `active` flip or change to published confidence, BOTH must hold:

1. Per-regime cost-adjusted expectancy > 0 on the walk-forward evidence
   (`docs/research/experiments/regime-routed-walkforward-...json`, REGISTRY entry
   2026-06-11).
2. Per-regime cost-adjusted expectancy > 0 on ≥4wk of accrued shadow data.

Condition 1 is currently NEGATIVE across all symbols. Activation is blocked.

The honest path forward is to improve the entry strategies — the current confluence
and `vwap-ema-bb` entries have no deployable edge after costs — not to flip the
switch. Volatile and range route cells are THIN under live H1 geometry; the routing
thesis is neither confirmed nor refuted on those routes, only the (negative) trend
route is conclusive.

The confluence-bonus shrink (umbrella plan ask) is separately data-gated on
migration-051 features (`pre_boost_confidence`, `mtf_agreement`, `confluence_bonus`)
accruing ≥4wk of resolved rows. Do not act on it before then.

## Re-running the walk-forward evidence

Candle backfill must be run first:

```
npx ts-node scripts/research/backfill-candles.ts --out-dir <dir>
```

Then run the regime-conditioned backtest CLI:

```
npx ts-node scripts/research/regime-backtest-cli.ts [options]
```

See each script's `--help` for flags. Expect ~20 min for BTC/ETH/SOL H1 over the
full 2024-06→2026-06 window. To iterate faster, reduce symbols or shorten the
window. Do not duplicate the flag set here — reference the scripts directly.
