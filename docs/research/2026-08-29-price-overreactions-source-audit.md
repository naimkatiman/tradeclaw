# Price Overreactions in Cryptocurrency - Source Audit

Date: 2026-08-29

Task: TC-256

Candidate: `price-overreactions-in-the-cryptocurrency-market`

Stage: source-audited

Disposition: verified no-go; do not preregister this published specification

TradeClaw backtest run: no

## Decision

Do not spend a TradeClaw replication cycle on the published specification. The
primary paper already tests both of its trading variants with spread-aware robot
simulations and concludes that neither provides statistically non-random,
exploitable profit. Its contrarian variant loses money; its momentum variant is
positive in the selected historical sample but is not statistically different
from random results.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series was generated, no result was promoted, and no marketing draft is allowed.
A materially new hypothesis would require a new source record and a fresh
preregistration rather than silently changing this candidate.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- Catalog row: gross Sharpe `0.53`, t-statistic `3.1`, volatility `32.3%`, and
  `35` years tested
- Primary paper: Guglielmo Maria Caporale and Alex Plastun, "Price
  overreactions in the cryptocurrency market"
- Institutional record:
  <https://bura.brunel.ac.uk/handle/2438/17194>
- DOI: <https://doi.org/10.1108/JES-09-2018-0310>
- Audited repository PDF:
  <https://bura.brunel.ac.uk/bitstream/2438/17194/3/FullText.pdf>
- Audited PDF SHA-256:
  `b979248a3d5d1abe47876a43fae2575b61ade80c8d3508a5077985d23e2168ee`

The institutional repository made the paper readable for this audit. No reuse
or redistribution license was established, so the PDF is not vendored in the
TradeClaw repository.

## Published rule

The paper uses daily CoinMarketCap OHLC data for Bitcoin, Litecoin, Ripple, and
Dash over `2013-04-28` through `2017-12-31`. Its trading robot is reported only
for Bitcoin over `2015-01-01` through `2017-12-31`.

1. Define daily movement magnitude as `(High - Low) / Low * 100`.
2. Mark an overreaction when that magnitude is greater than the rolling
   `n`-day mean plus `k` rolling standard deviations.
3. After preliminary comparisons, use `n = 30` and `k = 1`.
4. On the next day, enter at the open and close the position at the end of that
   day.
5. Variant 1 is contrarian: short after an abnormal increase and buy after an
   abnormal decrease.
6. Variant 2 is continuation: buy after an abnormal increase and short after an
   abnormal decrease.

Expected turnover is event-driven rather than daily. The paper reports `155`
Bitcoin trades over the three-year `2015-2017` trading sample, or roughly `52`
round trips per year.

## Primary-source result

For the full `2015-2017` Bitcoin sample, the paper reports:

| Variant | Successful trades | Total profit | Trade t-statistic | Paper finding |
|---|---:|---:|---:|---|
| Contrarian | 46.53% | -6,279.29 USD | -1.53 | Unprofitable |
| Continuation | 53.55% | +5,879.08 USD | 1.44 | Not statistically different from random |

The paper uses a 5% one-sided critical value of approximately `1.66`. Its test
report labels spread as `Current`; it does not freeze a numeric spread, fee, or
slippage schedule that TradeClaw can replay. The authors' conclusion is that the
detected statistical anomaly does not create exploitable profit and that the
answer depends critically on transaction costs.

## Reproducibility blockers

- The event magnitude formula is unsigned, but the trading rules require an
  abnormal increase/decrease direction. The exact sign discriminator is not
  formally specified beside the formula.
- The paper does not state whether the current observation is included in the
  rolling mean and standard deviation, nor the warm-up and missing-data rules.
- `End of day`, daily timezone, and the exact executable closing fill are not
  frozen.
- The cost input is a floating MetaTrader `Current` spread rather than an exact,
  immutable fee, slippage, and spread model.
- The threshold parameters were selected after comparing alternatives on the
  research sample; no untouched holdout or nested selection protocol is frozen.
- CoinMarketCap is described as a cross-market volume-weighted source, while the
  trading appendix uses a `BTCUSD` MetaTrader instrument. The venue/proxy mapping
  and exact historical export are not retained.
- The pinned catalog reports 35 years of gross reconstruction metadata even
  though the primary cryptocurrency data begins in 2013. That common-basis
  catalog result cannot be treated as the paper's evidence or as a cost-aware
  validation.

## Gate outcome

- Rule clarity: fail; material fill, sign, and rolling-window choices remain.
- Data provenance and rights: hold; the paper is readable, but the exact source
  export and a redistributable historical dataset are not pinned.
- Turnover: approximately 52 round trips per year in the paper's Bitcoin test.
- Cost evidence: no-go; the source's own spread-aware variants do not establish
  statistically non-random net edge.
- External falsification market: possible in principle, but unnecessary for
  this published specification after the earlier gates fail.
- Next action: archive this source-audited no-go. Continue screening for a
  reconstructible, lower-turnover hypothesis with independently hashable data
  and explicit cost headroom.

## Safety receipt

No push, merge, deployment, publication, social post, signal, allocation,
broadcast, broker/execution action, billing change, or trading activation
occurred.
