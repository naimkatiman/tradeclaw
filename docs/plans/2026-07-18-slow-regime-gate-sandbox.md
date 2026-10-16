# Slow Regime-Gate Sandbox Study (2026-07-18)

## Goal

Owner asks: can ANY configuration of this engine show a positive long-term
result after real costs, on 1-2 assets, quality over quantity? Prior registry
evidence forecloses entry timing (regime-routed gate FAILED 2026-06-11; daily
momentum, carry, xsection all FAILED). The zero-cost run shows gross edge
exists (+1.3% expectancy regime-aware) — costs eat it. The untested axis is
trade FREQUENCY: a slow long/flat exposure gate that trades a handful of times
per year amortizes the ~0.4-0.5% round-trip cost that kills per-bar entries.

## Hypothesis

A long-only, long-or-flat slow trend gate on BTC (and ETH), with position size
scaled by the production HMM structural regime, beats buy-and-hold on
drawdown-adjusted return (Calmar/MAR) after full costs — because it sidesteps
the deep bear drawdowns without paying meaningful cost drag.

Explicitly NOT claimed in advance: that it beats buy-and-hold on absolute
return. The honest benchmark is both.

## Pre-registered parameters (no tuning; sources cited)

- Direction gate: close > EMA200 on D1 -> long, else flat. EMA200 is the
  textbook default slow filter; chosen before seeing results.
- Regime sizing: production crypto HMM (committed crypto_hmm.json, H1-native,
  production-mirror inference), daily regime = regime of last H1 bar of day.
  Size ratios from the SHIPPED allocator regime rules (maxSinglePositionPct
  15/8/6): trend 1.0, volatile 8/15 = 0.533, range 6/15 = 0.4. Not fitted.
- Variants (all reported): buy-and-hold, ema200 gate alone, ema200 x HMM
  sizing, ema200 x inverse-vol targeting (40% ann target, 20d realized).
- Assets: BTCUSD, ETHUSD, and 50/50 both. Crypto-only (Stooq FX/metals
  backfill is blocked — known repo blocker).
- Costs: repo crypto cost constants; spot-style for long-only (no funding
  when using spot; perp variant with funding reported as sensitivity).
- Window: max Binance history (~2017-08 ->), 4 contiguous folds + full range.
- Metrics: CAGR, max drawdown, Calmar, ann. Sharpe, trades/yr, cost drag %.

## Honesty rules

- No parameter sweeps. The parameters above are final before the first run.
- All variants reported including failures; thin/fluke flags kept.
- Deterministic spec + results appended to docs/research/experiments/REGISTRY.md
  following run-backtest-cli conventions.
- Result feeds a LinkedIn-post audit; wording must survive an adversarial quant
  reading the public repo.

## Implementation

- `scripts/research/slow-gate-assembly.ts` — pure functions (gate series,
  regime downsample, equity sim with costs, metrics). TDD: tests first in
  `scripts/research/__tests__/slow-gate-assembly.test.ts`.
- `scripts/research/slow-gate-cli.ts` — loads candle dumps
  (backfill-candles.ts --out-dir shape), runs variants, writes JSON + REGISTRY
  line. No Date.now() in metrics (determinism contract, mirrors
  regime-backtest-cli.ts).
- New files only; no edits to shipped engine code; no commits without owner ask
  (parallel writers active on this repo).

## Verification

- Unit tests green (npx vitest run scripts/research/__tests__/slow-gate-*).
- Typecheck green on new files.
- CLI run reproduces identical metrics on re-run (determinism).
- Sanity: buy-and-hold CAGR must match hand-computed close[last]/close[first].
