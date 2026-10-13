# Bitcoin MAX10/MIN10 Replication - Result

Date: 2026-08-29

Task: TC-258

Verdict: **FAIL**

Prospective-review eligibility: **no**

Activation, publication, allocation, broadcast, and execution approval: **no**

## Bottom line

The published Bitcoin MAX10/MIN10 composite is a strong illustration of why
TradeClaw separates attractive historical gross curves from durable,
cost-adjusted evidence.

BTC compounded `+13,177.69%` gross and `+339.03%` after the frozen `0.25%`
per-side spot friction over the full 2015-2026 window. That full-history number
did not pass the preregistered decision. The net episode t-statistic was only
`1.73`, just `2/4` chronological folds were positive, Calmar was worse than
identically costed spot, and the untouched post-paper holdout lost `65.66%` net.

ETH showed the same break. Its full result was `+45,660.44%` gross and
`+1,892.72%` net, but only `2/4` folds were positive and its holdout lost
`67.28%` net. BTC replication and ETH cross-asset confirmation both fail. No
parameter, fill, cost, holdout, gate, or source choice changed after the run.

## Evidence receipt

- Candidate: `seasonality-trend-following-and-mean-reversion-in-bitcoin`
- Source audit:
  `docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md`
- Source-audit SHA-256:
  `834008ed2e8107d8f613c15096edaf9f225d8c43487efa123fb78f4056cafd82`
- Preregistration:
  `docs/plans/2026-08-29-bitcoin-max-min-replication.md`
- Preregistration SHA-256:
  `52b16a106559213c3fd42d42b25fd552dbab19bc250a61922ce7fb7fcc0f8e8a`
- Canonical artifact:
  `docs/research/experiments/bitcoin-max-min-BTCUSD_ETHUSD-D1-2015-11-26-2026-07-31-f4.json`
- Artifact SHA-256:
  `90778b74e93028278d434ea6269db9aa0bd960962413c99e9d8c3f58eba022dc`
- Primary-paper PDF SHA-256:
  `a8e7f1e4bb134a2ff3dea458872583463de2b69e8b895202a7d5b57ca99596a1`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`

All values below are deterministic modeled research. They are not observed
broker returns, a signal feed, or a profitability claim.

## Standing QA

Both canonical inputs matched their frozen SHA-256 and cropped observed-H1
subset SHA-256. BTC contained 3,901 UTC days and ETH 3,735. OHLCV ranges,
strict daily timestamps, source identity, licensing label, prefix invariance,
and the exact gap inventory passed.

Each series retained 3 observed 23-hour days: `2019-11-13` missing hour 0,
`2019-11-20` missing hour 2, and `2019-12-17` missing hour 1. The assembly used
the first and last observed H1 prices and never inserted a candle. None of the
headline episodes entered on the delayed-open day.

The input preparer is replayable through:

```bash
npm run research:prepare-bitcoin-seasonality
```

Raw and normalized market-data bytes remain ignored and are not redistributed.

## Paper-window diagnostic

The ungated, zero-cost, paper-formula BTC control over the source window
annualized at `105.56%`, with `48.25%` volatility and `43.37%` maximum drawdown.
The paper reports `98.43%`, `47.75%`, and `37.67%`, respectively. The close
agreement on return and volatility supports the rule reconstruction, while the
drawdown difference is consistent with the paper's unpinned data vintage,
daily-session boundary, and fill convention. It is not a pass gate.

## Headline results

Headline costs are `0.10%` fee plus `0.15%` slippage per side, with no funding.
Adjacent event days stay in one episode and pay only one entry and one exit.

| Metric | BTCUSD | ETHUSD |
|---|---:|---:|
| Full gross compounded return | +13,177.69% | +45,660.44% |
| Full net compounded return | +339.03% | +1,892.72% |
| Full episodes | 681 | 626 |
| Full exposure | 33.74% | 32.16% |
| Mean net episode return | +0.3473% | +0.7883% |
| Net episode t-statistic | 1.730 | 2.312 |
| Positive net folds | 2/4 | 2/4 |
| Full net maximum drawdown | 77.30% | 79.91% |
| Full net Calmar | 0.193 | 0.427 |
| Costed spot maximum drawdown | 83.67% | 94.00% |
| Costed spot Calmar | 0.732 | 0.648 |
| Full-history break-even cost per side | 0.3583% | 0.4881% |

The full-history positive result is concentrated in the first half. BTC folds
1-4 returned `+264.65%`, `+276.98%`, `-53.99%`, and `-31.27%` net. ETH folds
returned `+1,262.41%`, `+407.40%`, `-41.73%`, and `-51.02%` net.

## Untouched holdout

The holdout begins `2022-02-04`, immediately after the paper's stated sample,
and ends `2026-07-31`.

| Metric | BTCUSD | ETHUSD |
|---|---:|---:|
| Gross compounded return | +56.54% | +30.27% |
| Fee-only net return (`0.10%`/side) | -14.63% | -25.01% |
| Headline net return (`0.25%`/side) | -65.66% | -67.28% |
| Stress net return (`0.40%`/side) | -86.20% | -85.74% |
| Episodes | 303 | 276 |
| Mean headline-net episode return | -0.2760% | -0.2836% |
| Headline-net episode t-statistic | -1.226 | -0.957 |
| Break-even cost per side | 0.0739% | 0.0479% |

The post-paper gross paths stayed positive, but neither could clear the frozen
`0.10%` fee alone. This is a cost-and-decay failure, not merely a conservative
slippage assumption.

## Predeclared gates

BTC passed full net return, positive mean, minimum episode counts, and lower
drawdown than spot. It failed:

- full net episode t-statistic `>= 1.96`;
- at least 3/4 positive folds;
- positive holdout net return;
- positive holdout mean episode return; and
- Calmar above identically costed spot.

ETH passed its full net return, mean, t-statistic, episode counts, and drawdown
gate. It failed fold stability, both holdout return gates, and Calmar versus
spot. Overall verdict is therefore `FAIL`; prospective eligibility is false.

## All source-defined controls

All 15 published component/lookback combinations remain visible. None can
replace the preregistered `composite-10` headline.

| Configuration | BTC full net | BTC holdout net | ETH full net | ETH holdout net |
|---|---:|---:|---:|---:|
| at-max-10 | 352.19% | -25.40% | 2,825.79% | -34.55% |
| at-max-20 | 486.32% | -10.90% | 4,081.68% | -47.87% |
| at-max-30 | 634.15% | +3.21% | 4,676.61% | -25.49% |
| at-max-40 | 576.16% | -0.43% | 4,170.55% | -25.97% |
| at-max-50 | 409.79% | +5.08% | 3,327.90% | -18.22% |
| at-min-10 | -6.25% | -53.96% | -34.89% | -51.24% |
| at-min-20 | -28.40% | -41.67% | +60.33% | -25.82% |
| at-min-30 | -4.57% | -34.74% | -1.24% | -31.24% |
| at-min-40 | +12.18% | -35.28% | +186.23% | -23.02% |
| at-min-50 | +14.13% | -31.49% | +40.45% | -28.39% |
| composite-10 | +339.03% | -65.66% | +1,892.72% | -67.28% |
| composite-20 | +324.06% | -48.02% | +6,671.96% | -61.13% |
| composite-30 | +604.13% | -32.64% | +4,617.58% | -48.76% |
| composite-40 | +658.52% | -35.56% | +12,123.50% | -43.01% |
| composite-50 | +481.82% | -28.01% | +4,714.63% | -41.43% |

The small positive BTC holdouts for `at-max-30` and `at-max-50` are
post-result controls among alternatives the source already compared. Selecting
one now would be the prohibited retuning this protocol was designed to prevent.

## Separate two-hour cost no-go

No local intraday return series was run. The paper's daily `21:00-23:00 UTC`
lane has only `0.039031%` published-result break-even cost per side. The
`0.05%` fee alone is already higher; the frozen `0.25%` spot side cost would
turn the paper's 33% gross annualization into approximately `-78.63%`. That
lane remains source-audited and cost-infeasible without a parameter search.

## Limitations

- This is an independent current public-data replication, not the authors'
  unretained source vintage.
- UTC day construction is explicit; the paper does not name its daily session.
- First/last observed H1 prices are modeled fills, not broker confirmations.
- CryptoDataDownload labels the free archive CC BY-NC-SA 4.0. Source bytes are
  not shipped; any commercial raw-data use needs separate rights review.
- Fees and slippage are fixed modeled costs. Actual execution can be worse or
  occasionally better.
- ETH is a falsification market, not part of the original Bitcoin claim.
- A historical gross or net result, even when positive, is not live evidence.

## Human-review marketing handoff

Draft only; publish approval is false:

> A Bitcoin rule that looked spectacular in the full backtest failed where it
> mattered. The MAX10/MIN10 composite produced +13,177.69% gross and +339.03%
> net on BTC, yet lost 65.66% after costs in the untouched post-paper holdout.
> ETH repeated the pattern at -67.28%. Even fee-only holdouts were negative.
> TradeClaw verdict: FAIL—2/4 positive folds, no durable holdout, no trading
> authority.

No post, publication, push, merge, deployment, signal, allocation, broadcast,
broker action, billing change, or execution activation occurred.
