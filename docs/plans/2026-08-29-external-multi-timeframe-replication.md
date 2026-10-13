# External Multi-Timeframe Trend Replication — Frozen Protocol

Date frozen: 2026-08-29 12:19 MPST (+0800)

Status: PRE-REGISTERED BEFORE ANY LOCAL RETURN, TRADE, OR VERDICT WAS COMPUTED

## Objective

Test whether one accessible strategy idea discovered through
[paperswithbacktest/awesome-systematic-trading](https://github.com/paperswithbacktest/awesome-systematic-trading)
has a reproducible, cost-adjusted edge on TradeClaw's source-backed candles.
This is an independent clean-room replication. It does not import the external
code, make the external backtest authoritative, or alter a live strategy.

The owner-supplied VGPER sponsored-access approval concerns optional product
access. It does not supply a trading edge, approve a profitability claim, or
authorize broker execution.

## Why this candidate

The linked catalog's 2026-08-27 commit
d9c98521c76662d5eae03ab97a4fc721d010dde3 highlights “How to Design a Simple
Multi-Timeframe Trend Strategy on Bitcoin.” The linked primary article publicly
describes all decision rules needed for a bounded replication:

- MACD(12, 26, 9) on H1
- long-only entry on an H1 bullish MACD crossover
- entry permitted only when MACD on the last fully closed D1 candle is bullish
- exit at the close of the first negative H1 candle

The catalog is discovery evidence, not performance evidence. Its highlighted
table says results are gross of trading costs. Its current headline for this
candidate also conflicts with its own detail page and the primary article. This
study therefore ignores every external return and computes the rule from frozen
local inputs.

Source article:
<https://quantpedia.com/how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin/>

Catalog:
<https://github.com/paperswithbacktest/awesome-systematic-trading>

## Frozen implementations

No parameter search is allowed. The three source-defined stages are:

1. h1-macd-one-bar
   - Detect an H1 MACD bullish crossover at the H1 close.
   - Enter long at the next H1 open.
   - Exit at that same H1 bar's close.
2. d1h1-macd-one-bar
   - Apply the same H1 signal and one-bar holding rule.
   - Admit the entry only when D1 MACD is above its signal on the latest D1 bar
     whose close time is at or before the H1 signal close.
3. d1h1-macd-negative-bar-exit
   - Apply the same completed-D1 admission filter.
   - Enter at the next H1 open.
   - Remain long through positive H1 bars (close >= open).
   - Exit at the close of the first negative H1 bar (close < open).
   - Ignore new entry signals while already long.

Indicator mechanics are fixed:

- EMA12 and EMA26 are seeded with their respective simple averages.
- MACD begins when EMA26 exists.
- EMA9 of the MACD line is seeded with the first nine finite MACD values.
- A bullish crossover exists only when previous MACD is at or below its signal
  and current MACD is above its signal.
- H1 and D1 candle timestamps are UTC bar-open timestamps.
- A D1 candle is eligible only after timestamp + 24h.
- Signal information available at H1 close can fill no earlier than the next H1
  open.

Malformed OHLCV, non-hourly/non-daily cadence, missing D1 coverage, a lookahead
match, or a non-finite calculation fails the run.

## Frozen data

Research window: 2018-12-01T00:00:00.000Z through the last common complete
source-backed bar in the frozen dumps.

Original replication market: BTCUSD.

External falsification market: ETHUSD. ETH is not used to tune the rule.

All four dumps use source label binance:

| File | Bars | First bar | Last bar | SHA-256 |
|---|---:|---|---|---|
| BTCUSD-H1.json | 78,035 | 2017-08-17 04:00Z | 2026-07-17 22:00Z | 2ae70142b058695e4bf4fd5b212712f0c2a2068646c7c19469e1effda8068e91 |
| BTCUSD-D1.json | 3,256 | 2017-08-17 00:00Z | 2026-07-16 00:00Z | e8ffc544670131dccb0a0717e45ac6504c2666d5e060755ebc546a711c669a91 |
| ETHUSD-H1.json | 78,035 | 2017-08-17 04:00Z | 2026-07-17 22:00Z | 4c6a77b50b254f358277e45e64f5ac2890362df59bf151bf0fe3606e02c30128 |
| ETHUSD-D1.json | 3,256 | 2017-08-17 00:00Z | 2026-07-16 00:00Z | eeee00aed94d5f51be5e315427c935e41519bab693726c62a0d1d1d209f91ed7 |

Publication-date holdout: signals whose entry is at or after
2025-11-14T00:00:00.000Z. The article is dated 2025-11-13; the next UTC day
avoids treating any publication-day bar as unseen.

Four equal contiguous chronological folds are stability checks. Indicators are
calculated on the full preceding history, then trades are attributed by entry
time to a fold. Positions are force-closed at a fold boundary for fold-only
metrics. The folds do not fit or select any parameter.

## Costs and fills

The headline uses TradeClaw's frozen crypto-perpetual model:

- fee: 0.05% of notional per side
- slippage/impact: 0.15% per side
- funding: 0.01% per eight held hours, accrued linearly and conservatively as a
  sign-agnostic cost

Every entry and exit pays the side cost. A terminal open position is closed at
the last available H1 close and pays the exit side. No leverage, shorting,
rebate, spread improvement, or favorable funding is modeled.

The external QuantConnect example's 0.005%-per-side fee is not the headline
model and cannot pass the gate. It may be reported only as a clearly labeled
forensic sensitivity with no slippage or funding.

## Metrics

For every configuration, symbol, full window, fold, and holdout:

- completed trades and held hours
- exposure fraction
- gross and cost-adjusted compounded return
- mean gross and net return per trade
- net win rate and profit factor
- trade-return t-statistic
- daily annualized volatility and Sharpe ratio
- maximum drawdown, CAGR, and Calmar ratio
- explicit fee/slippage/funding drag

Benchmarks:

- cash: 0%
- spot buy-and-hold: first-window open to last-window close, same entry/exit
  side costs, no funding
- perpetual buy-and-hold: same price path and side costs plus continuous frozen
  funding

The portfolio view is two independent 50/50 BTC/ETH sleeves with no
cross-rebalancing after inception. Its spot and perpetual benchmarks use the
same independent-sleeve construction.

## Predeclared gates

BTC_REPLICATION_PASS requires the final
d1h1-macd-negative-bar-exit configuration to satisfy all of:

- full-window cost-adjusted return > 0
- mean net trade return > 0
- trade-return t-statistic >= 1.96
- at least 100 completed trades
- at least 3 of 4 chronological folds have positive cost-adjusted return
- post-publication holdout has at least 20 completed trades, positive
  cost-adjusted return, and positive mean net trade return
- maximum drawdown is lower than spot buy-and-hold
- Calmar ratio is greater than spot buy-and-hold

PORTFOLIO_CANDIDATE_PASS additionally requires:

- ETH full-window cost-adjusted return > 0
- ETH mean net trade return > 0 and trade-return t-statistic >= 1.96
- at least 3 of 4 ETH folds are positive
- the 50/50 BTC/ETH portfolio has positive full-window and holdout
  cost-adjusted return
- the 50/50 portfolio has lower maximum drawdown and higher Calmar than its
  spot buy-and-hold benchmark

Any failed condition produces FAIL. A pass means only
eligible-for-prospective-review; it never changes a preset, broadcast gate,
allocation, or execution mode. A later prospective ledger and a separate owner
decision would still be required.

## Anti-bias rules

- Run all three source-defined stages and publish all three.
- Do not change the MACD periods, entry timing, D1 definition, exit rule, costs,
  symbols, window, folds, holdout, or gates after seeing output.
- Do not choose the best hour, asset, configuration, or cost model.
- Do not hide a negative result or replace the artifact.
- A code defect may be fixed, but the defect, correction, and rerun must be
  recorded.
- The frozen D1 slow-gate and its prospective ledger remain untouched.

## Out of scope

- importing a Python trading framework into the Next.js/Docker runtime
- copying unlicensed external source
- live signal generation, portfolio allocation, broadcast, or broker execution
- changing the prospective D1 candidate
- using VGPER deposits, Partner commission, or subscription status as evidence
  of strategy quality
- promising that any portfolio will be profitable
