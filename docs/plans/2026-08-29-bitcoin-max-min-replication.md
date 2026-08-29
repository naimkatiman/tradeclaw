# Bitcoin MAX10/MIN10 Replication - Frozen Protocol

Date frozen: 2026-08-29 17:08 MPST (+0800)

Task: TC-258

Status: PRE-REGISTERED BEFORE ANY LOCAL STRATEGY RETURN, TRADE, OR VERDICT WAS
COMPUTED

## Objective

Independently test the paper's event-driven `MAX10 OR MIN10` Bitcoin rule under
TradeClaw's complete spot friction model, an untouched post-paper holdout, four
chronological folds, and ETH as an external falsification market. This is
modeled research only. It does not import vendor code, expose raw market data,
change a live strategy, or authorize execution.

The same paper's daily `21:00-23:00 UTC` lane is excluded from local return
testing because its published 33% gross annualization has only `0.039031%`
break-even cost per side. That is below the fee alone. This protocol must not
rescue that lane by reducing its daily turnover or choosing a cheaper model.

Source audit:
`docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md`

## Frozen source rule

For each symbol, calculate inclusive rolling extrema from daily closes. For
lookback `x` and return day `t`:

```text
atMax[x,t] = close[t-1] == max(close[t-x], ..., close[t-1])
atMin[x,t] = close[t-1] == min(close[t-x], ..., close[t-1])
composite[x,t] = atMax[x,t] OR atMin[x,t]
```

The equality is exact on the canonical numeric source values. A flat 10-day
window that is simultaneously at its maximum and minimum creates one composite
exposure, never two. No tolerance, near-high rule, volatility band, stop, short,
leverage, or parameter search is allowed.

The published headline is `composite-10`. The assembly must also report, but
must not select among, `at-max`, `at-min`, and `composite` for each source-defined
lookback `10, 20, 30, 40, 50`. Only `composite-10` enters decision gates.

## Frozen fills and position accounting

- A signal becomes known after the prior UTC day's last observed H1 close.
- A flat strategy enters at the current UTC day's first observed H1 open.
- If the following day's signal remains true, the position stays open across
  the UTC boundary and does not pay another entry or exit.
- When the following day's signal is false, exit at the current UTC day's last
  observed H1 close.
- If a fold, holdout, or evaluation boundary ends while long, force-exit at the
  final included day's last observed close and pay the exit side cost.
- A new window starts flat; no trade or equity is carried across a metric
  boundary.
- Each flat-to-long through long-to-flat sequence is one completed episode.
- Daily gross equity uses actual first/last observed prices. The three pinned
  one-hour gaps remain absent; no forward fill, interpolation, or synthetic
  value is permitted.
- The gross paper-formula control applies the same event exposure to prior
  close-to-current close without costs. It is diagnostic only and cannot pass a
  gate.

## Frozen data

Both canonical inputs are ignored local files prepared from the attributed
CryptoDataDownload Gemini H1 archives by
`scripts/research/prepare-bitcoin-seasonality-inputs.mjs`.

| Symbol | Input window | Canonical input SHA-256 | Cropped observed-H1 subset SHA-256 |
|---|---|---|---|
| BTCUSD | 2015-11-26/2026-08-01 | `ab1e468e9065a77ed744314116e6c3bb41cbd88f492cc60a6e6fc4fdc87e9c68` | `e1a03d0a0ae1e2fe30c85b963086f6753790e1aa57699d30a839b40e4a283623` |
| ETHUSD | 2016-05-10/2026-08-01 | `6f5bc428c67da5534829f3b567d0c1e7b2e7b1294d6dde1fc56019deeccc20e4` | `8bc32e4ef354ba2fd7c6644f1cb652082bfa42759b8f2ed96563459520a2f96d` |

The evaluation begins only after ten prior closes exist: `2015-12-06` for BTC
and `2016-05-20` for ETH. The common final return day is `2026-07-31`.

The untouched holdout begins `2022-02-04`, the day after the paper's stated
sample end. Indicators use only earlier closes; no holdout observation may
change a prior signal.

The canonical inputs contain one missing H1 observation on each of
`2019-11-13`, `2019-11-20`, and `2019-12-17`. Input QA must reproduce exactly
three 23-hour days for each symbol, all other retained days must contain 24
observed hours, and every daily timestamp must increase by exactly 24 hours.
Any hash, count, gap inventory, schema, OHLC range, date, or source-label drift
produces `INCONCLUSIVE` before performance gates.

The raw/archive license is `CC BY-NC-SA 4.0`. Raw and normalized market-data
bytes stay ignored and are not distributed with the artifact.

## Frozen costs

Headline Gemini spot model, applied multiplicatively at every position
transition:

- fee: `0.10%` per side;
- spread/slippage/impact: `0.15%` per side;
- total: `0.25%` per side, approximately `0.50%` per completed episode;
- funding, borrowing, and leverage: none.

Each entry and exit multiplies current equity by `1 - 0.0025`. Gross equity
pays no costs. A fee-only `0.10%`-per-side reading and a stress
`0.40%`-per-side reading (`0.10%` fee plus `0.30%` slippage) may be reported as
fixed sensitivities; neither can replace the headline or change the verdict.
No rebate, maker fill, spread improvement, favorable execution, or positive
cash interest is allowed.

## Frozen windows and folds

- Full BTC: `2015-12-06` through `2026-07-31` inclusive.
- Full ETH: `2016-05-20` through `2026-07-31` inclusive.
- Paper-window diagnostic: BTC through `2022-02-03` inclusive.
- Holdout: `2022-02-04` through `2026-07-31` inclusive.
- Four folds: equal contiguous elapsed-time partitions of each symbol's full
  evaluation window. A boundary moves to the next UTC day when needed.
- Every fold and the holdout starts flat and force-closes at its final day.
- Signals retain their trailing lookback before a window boundary, but no
  position or equity crosses the boundary.

The folds do not fit or select a parameter.

## Frozen metrics

For every configuration, symbol, full window, fold, holdout, and cost reading:

- eligible exposure days and exposure fraction;
- completed episodes and held days;
- gross and net compounded return;
- annualized return, volatility, and zero-risk-free Sharpe;
- maximum drawdown and Calmar ratio;
- mean gross and net episode return, net episode win rate, profit factor, and
  two-sided episode-return t-statistic;
- explicit fee/slippage drag and break-even side cost;
- source-gap inventory and any delayed first-observed-hour entry.

Benchmarks are cash at 0% and spot buy-and-hold from the first evaluation-day
open through the final evaluation-day close. Buy-and-hold pays the same
headline entry and exit side costs and no funding. The paper-window gross
`98.43%` annualized return, `47.75%` volatility, `-37.67%` drawdown, and `2.06`
return/volatility values are comparison targets only; exact reproduction is not
a gate because the paper does not pin its data vintage, session, or fill.

## Predeclared decision gates

`BTC_REPLICATION_PASS` requires `composite-10` under headline costs to satisfy
all of:

- standing input and causal QA passes;
- full-window net compounded return is positive;
- mean net episode return is positive with t-statistic at least `1.96`;
- at least `50` completed full-window episodes;
- at least `3` of `4` folds have positive net compounded return;
- holdout has at least `20` completed episodes, positive net compounded return,
  and positive mean net episode return;
- maximum drawdown is lower than the identically costed spot benchmark;
- Calmar ratio is greater than the identically costed spot benchmark.

`CROSS_ASSET_CONFIRMATION_PASS` additionally requires ETH `composite-10` to
satisfy:

- positive full-window net compounded return and positive mean net episode
  return with t-statistic at least `1.96`;
- at least `50` full-window and `20` holdout episodes;
- at least `3` of `4` positive-net folds;
- positive holdout net compounded return and mean net episode return;
- lower maximum drawdown and higher Calmar than ETH spot buy-and-hold.

Any failed BTC condition produces overall `FAIL`. QA failure produces
`INCONCLUSIVE` without evaluating performance gates. A BTC pass without ETH
confirmation may be labeled `BTC PASS / CROSS-ASSET FAIL`, but is not eligible
for prospective review. Prospective eligibility requires both gate sets and
still grants no promotion, allocation, signal, broadcast, broker, or execution
authority.

## Anti-bias rules

- Do not change the 10-day headline, exact extrema equality, UTC aggregation,
  fills, costs, dates, folds, holdout, benchmarks, minimum sample sizes, or
  gates after reading output.
- Report all 15 source-defined component/lookback configurations; do not select
  the best one.
- Do not use the later follow-up result to remove MIN10 or isolate MAX10.
- Do not transform the excluded two-hour lane into a lower-turnover strategy.
- Do not hide a negative result, overwrite an adverse artifact, or promote a
  gross control over the costed headline.
- A code defect may be fixed only with the defect, correction, and rerun
  retained in the result receipt.

## Out of scope

- raw market-data redistribution or a public data API;
- importing vendor backtest code or using its current chart as evidence;
- intraday seasonality return testing after the completed cost no-go;
- leverage, shorting, stops, volatility targeting, or parameter optimization;
- UI changes while the protected admin visual remains owner-confirmation-gated;
- live signals, allocation, broadcast, broker execution, billing, publication,
  push, merge, or deployment.
