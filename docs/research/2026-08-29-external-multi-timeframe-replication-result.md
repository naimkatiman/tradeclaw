# External Multi-Timeframe Trend Replication — Result

Date: 2026-08-29

Task: TC-255

Verdict: **FAIL — do not promote, allocate, broadcast, or execute**

This is the result companion to the byte-frozen
[preregistration](../plans/2026-08-29-external-multi-timeframe-replication.md).
The preregistration SHA-256 was
`8679c1aa033b5e52f1cc6c9097ed14d34aa101a6fd592188d8edb20f8a23cb8f`
before any local trade return or verdict was calculated.

## What was tested

The linked
[awesome-systematic-trading catalog](https://github.com/paperswithbacktest/awesome-systematic-trading)
was used only to discover a bounded public rule. TradeClaw independently
implemented the three preregistered stages described by the linked
[Quantpedia article](https://quantpedia.com/how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin/):

1. H1 MACD bullish crossover, next-open entry, one-bar exit.
2. The same rule filtered by bullish MACD on the last fully closed D1 bar.
3. The D1/H1 rule with exit at the first negative H1 candle.

### Source-ambiguity erratum

An exact post-result source audit found contradictory baseline wording in the
primary article. Its methodology says the pure H1 position closes on a bearish
MACD crossover, while the D1 section says its one-bar holding period “remains,”
implying the baseline was already one bar. The preregistered one-bar control was
retained, and the bearish-cross interpretation was added as a separately
labeled, ungated sensitivity. Neither interpretation supplies a gate input; the
D1 one-bar rule, final negative-candle exit, and FAIL verdict are unchanged.

The complete initial artifact is retained as
[`superseded-v1`](experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4-superseded-v1.json),
SHA-256
`98303cfb62bba1d4609125425e3333e49722ddc724002a6bab46a8f6e5d34759`.

No external source code, reported return, or catalog ranking was imported. The
headline model charged TradeClaw's frozen crypto-perpetual costs: 0.05% fee and
0.15% slippage per side plus 0.01% funding per eight held hours.

## Result

The final source-defined configuration failed every performance gate that
matters:

| Evidence | BTCUSD | ETHUSD | Fixed 50/50 |
|---|---:|---:|---:|
| Full gross compounded return | +69.43% | -12.75% | +28.34% |
| Full net compounded return | **-99.21%** | **-99.55%** | **-99.38%** |
| Completed trades | 1,334 | 1,308 | 2,642 sleeve trades |
| Mean gross return/trade | +0.0451% | -0.0049% | — |
| Mean net return/trade | **-0.3570%** | **-0.4068%** | — |
| Net trade t-statistic | -12.30 | -13.95 | — |
| Positive chronological folds | 0/4 | 0/4 | — |
| Holdout gross return | +13.53% | +15.64% | +14.58% |
| Holdout net return | **-33.30%** | **-25.75%** | **-29.53%** |
| Full maximum drawdown | 99.22% | 99.55% | 99.39% |
| Full Calmar | -0.474 | -0.510 | -0.490 |

The costed spot 50/50 benchmark returned +1,494.31% over the full historical
window, with 79.25% maximum drawdown and 0.552 Calmar. Cash returned 0%. The
strategy therefore lost to both comparators.

The two intermediate controls also failed after costs:

| Configuration | BTC net | ETH net |
|---|---:|---:|
| H1 MACD, one bar | -100.00% | -99.99% |
| H1 MACD, bearish-cross exit (ungated ambiguity sensitivity) | -99.97% | -99.83% |
| D1-filtered H1 MACD, one bar | -99.47% | -99.37% |
| D1/H1 MACD, negative-bar exit | -99.21% | -99.55% |

## Why it failed

This is a turnover/cost failure, not evidence that a D1 filter rescued the H1
rule. BTC's final stage averaged only +0.0451% gross per trade while every
round trip paid about 0.40% before funding. Across the full BTC window, the
analytical break-even fee-plus-slippage ceiling is approximately 0.0186% per
side. That is below the frozen 0.05% fee alone. ETH was gross-negative over the
full window, so no non-negative transaction cost could rescue it there.

The post-publication holdout reached the same conclusion. Both assets were
gross-positive in that short window, but neither survived the frozen costs.
Using a cheap-fee-only backtest as the headline would therefore answer a
different question and would not make this portfolio deployable.

## Integrity and reproducibility

- All four source hashes matched the frozen Binance dumps.
- BTC and ETH H1 timestamps aligned.
- Both D1 series had zero gaps. The H1 source had 28 shared, integer-hour gaps;
  no candle was synthesized, no signal crossed a gap, and funding used actual
  wall-clock holding time.
- Completed-D1 mapping had zero lookahead violations and at most 23 hours of
  staleness.
- Four prefix-invariance checkpoints passed on both symbols.
- Focused unit tests passed 12/12 after adding explicit next-open bearish-exit
  coverage.
- A second run to a separate path was byte-identical.
- Canonical artifact SHA-256:
  `762bb52991db266f79b08a104c811b7309668bf3f12b96f70f0fa15bd67f2c53`.

Canonical artifact:
[`external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json`](experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json)

## Portfolio and sponsored-access conclusion

There is no honest way to guarantee a profitable portfolio, and this external
candidate is not a viable route under TradeClaw's costs. The genuine route is
the slower one already encoded in TradeClaw's evidence policy: minimize
turnover, pre-register candidates, require cross-asset and holdout survival,
then collect a prospective ledger before any allocation decision. The existing
D1 slow-gate remains a simulated candidate collecting prospective evidence; it
is not made profitable or promoted by this result.

The owner-supplied VGPER sponsored-access approval is a commercial access
permission only. Partner deposits, attribution, commissions, or subscription
revenue must remain separate from portfolio P&L and cannot be represented as a
trading edge, rebate, guaranteed return, or broker-issued benefit.
