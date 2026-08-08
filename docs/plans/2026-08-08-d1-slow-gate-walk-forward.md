# D1 Slow-Gate Walk-Forward Validation (2026-08-08)

Status: PRE-REGISTERED before the first run. Parameters, tolerances, and the
decision rule below must not change after a result is observed. A changed rule
requires a new dated study and cannot replace this result.

## 1. Question and hypothesis

Can the approved `d1-slow-gate` rule remain net-positive under the production
crypto cost model while improving drawdown-adjusted return over buy-and-hold
across time, without violating the frequency or data-integrity gates?

The tested rule is not tuned here. It is the 2026-07-18 sandbox survivor,
productized with the wide-stop constraint commissioned by the 2026-08-05
regime-expectancy verdict.

## 2. Frozen strategy

- Universe: BTCUSD and ETHUSD only.
- Timeframe: closed D1 candles, UTC day boundaries.
- Direction: long or flat. Long when close is strictly above EMA200; flat
  otherwise. No EMA-slope condition.
- Sizing: two independent sleeves, 50% capital each. No cross-rebalancing,
  volatility targeting, HMM sizing, leverage, shorts, or fallback variant.
- Entry: a flat-to-long gate transition at the decision bar close. The new
  exposure applies after that close; the decision cannot use the next bar.
- Exit: a long-to-flat gate transition at the decision bar close, or the fixed
  protective stop. No take-profit.
- Stop: SMA true-range ATR(14) × 2.5, floored so stop distance is at least 4.0%
  of entry. The 4.0% floor is derived, not fitted: production crypto fee plus
  slippage is 0.20% per side, 0.40% round trip; 0.40% / 4.0% = 0.10R.
- Stop execution: if the next or a later D1 bar trades through the stop, exit at
  `min(stop, bar open)` so a gap below the stop is not filled optimistically.
  A stopped sleeve cannot re-enter while the raw gate remains long; it must see
  at least one flat close followed by a new long cross.
- Frequency ceiling: at most 30 emitted direction changes per symbol in every
  rolling 365-day interval. Entries and both gate/stop exits count. Sizing
  changes do not exist in this variant and cannot be counted as trades.

## 3. Frozen data and folds

Input dumps are the same append-only D1 candle snapshots used by the committed
sandbox artifact, filtered to 2017-09-01 through 2026-07-16 inclusive:

| Symbol | SHA-256 of source dump |
|---|---|
| BTCUSD | `e8ffc544670131dccb0a0717e45ac6504c2666d5e060755ebc546a711c669a91` |
| ETHUSD | `eeee00aed94d5f51be5e315427c935e41519bab693726c62a0d1d1d209f91ed7` |

The harness evaluates four contiguous, non-overlapping chronological folds.
Indicators and position state are computed once from the full prefix-only
stream and carried across fold boundaries; each fold's equity is rebased to
1.0 for comparison. There is no fitted training step, so the folds measure
across-time stability rather than parameter optimization. Pre-fold history may
warm EMA/ATR because it is past data, never future data.

## 4. Costs and benchmark

The strategy and benchmark use the same production crypto model:

- fee: 0.05% per side;
- slippage: 0.15% per side;
- funding sensitivity: 0.01% per 8 hours, charged sign-agnostically while long;
- each entry and exit pays one side of fee plus slippage.

Buy-and-hold enters once at the first eligible bar, holds a full sleeve, and
exits at the last bar under the same fee, slippage, and funding assumptions.
The portfolio result is the arithmetic 50/50 combination of the independently
rebased BTC and ETH sleeves, with no cross-rebalancing.

## 5. Standing QA gates

All must pass before results may be interpreted:

1. **Reconciliation:** under the original no-stop spot exposure definition,
   the exact gate implementation must reproduce 86 BTC and 64 ETH direction
   changes from the committed sandbox window. Any mismatch fails closed.
2. **Lookahead:** at fixed checkpoints, running a candle prefix must reproduce
   byte-equivalent transitions and equity through that prefix from the full
   run. A future candle changing an earlier decision fails closed.
3. **Bar staleness/cadence:** timestamps must be strictly increasing D1 opens;
   gaps over 48 hours are stale. The requested end bar must be present. Any
   stale bar or missing end boundary fails closed.

Non-finite OHLCV, non-positive prices, malformed ranges, duplicate timestamps,
wrong symbols/timeframes, insufficient EMA warmup, or non-finite aggregates
also fail the run before a verdict is printed.

## 6. Frozen decision rule

The walk-forward is `PASS` only if every condition holds:

1. the 50/50 strategy portfolio has positive full-window net total return after
   the production cost model;
2. strategy Calmar is at least buy-and-hold Calmar in at least three of four
   folds (a strict majority);
3. neither symbol breaches 30 direction changes in any rolling 365-day window;
4. reconciliation, lookahead, and bar-staleness QA all pass.

Otherwise the verdict is `KILL`. A `PASS` is still not activation: the owner
must separately approve promotion out of the simulated lane. A `KILL` is
published on `/research` and the lane remains simulated and uncounted.

## 7. Output contract

The runner writes one deterministic JSON artifact under
`docs/research/experiments/` containing the frozen spec, source hashes, QA
evidence, per-symbol and 50/50 full/fold metrics, frequency evidence, decision
booleans, and final verdict. Runtime timestamps may differ; the evidence body
must be byte-stable for identical inputs.
