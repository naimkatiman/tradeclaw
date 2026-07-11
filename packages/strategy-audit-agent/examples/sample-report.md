# TradeClaw Strategy Audit — Paid Pilot

Generated: 2026-06-24T09:38:28.788Z
Request fingerprint: `80f5c464595d3322c3edbc0cffe23c6851273daf9a11b7ab64536611a9926485`

> Historical simulation only. This report is not investment advice, a performance guarantee, or authorization to execute a trade.

## Executive verdict

Some cells look promising, but the result is fragile across the tested matrix. The next step is out-of-sample and sensitivity testing, not live deployment.

## Scope and assumptions

- Objective: Test whether two standard TradeClaw strategies remain usable across BTC and ETH after slippage is enabled.
- Strategy rules supplied: Run the unmodified EMA Crossover + RSI and ATR Trend Follow presets. Do not tune parameters after seeing results.
- Initial balance: 10000
- Risk per trade: 1%
- Slippage toggle: enabled
- Requested/completed: 4/3

## Matrix summary

- Promising cells: 1
- Marginal cells: 1
- Weak cells: 1
- Insufficient-sample cells: 0
- Median return: 4.10%
- Median profit factor: 1.08
- Worst observed drawdown: 26.30%
- Total observed trades: 150

## Run details

| Symbol | TF | Period | Strategy | Return | PF | Win rate | Max DD | Trades | Screen | Runner |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|---|
| BTCUSD | H1 | 90D | EMA Crossover + RSI | 12.40% | 1.31 | 44.80% | 13.20% | 50 | promising | deterministic |
| BTCUSD | H1 | 90D | ATR Trend Follow | 4.10% | 1.08 | 39.10% | 18.90% | 50 | marginal | deterministic |
| ETHUSD | H1 | 90D | EMA Crossover + RSI | -3.20% | 0.92 | 36.40% | 26.30% | 50 | weak | computer |
| ETHUSD | H1 | 90D | ATR Trend Follow | n/a | n/a | n/a | n/a | n/a | failed | hybrid |

## Failure log

- ethusd__h1__90d__atr-trend-follow: Fixture example: result panel did not become visible

## Required next validation

1. Freeze the rules before expanding the search space.
2. Run an untouched out-of-sample window and a walk-forward test.
3. Stress fees, spread, slippage, latency, and missing-candle assumptions.
4. Reject conclusions driven by one symbol, one period, or fewer than 20 trades.
5. Paper trade before considering any live use; keep execution outside this browser agent.

## Method note

The labels in this report are screening labels, not forecasts. “Promising” means only that a historical cell passed simple minimum thresholds: positive return, profit factor at least 1.2, maximum drawdown no greater than 25%, and at least 20 observed trades.
