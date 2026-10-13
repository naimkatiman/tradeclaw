# Cryptocurrency Factor Investing - Source Audit

Date: 2026-08-29

Task: TC-261

Candidate: `know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of this published specification

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The 2017 paper is
unusually helpful about its weekly factor definitions, original coin universe,
portfolio weighting, turnover, and approximate costs. It does not, however,
supply the point-in-time Coin Metrics source bytes used for the study. The
current official community catalog cannot reproduce the paper's full 11-coin
price universe, and the current PIVX archive cannot reconstruct the study period.

The strongest reported factor portfolios also use long and short positions. The
paper itself says cryptocurrency shorts were not available at scale. Replacing
those positions with modern perpetual futures would require new venue,
listing-eligibility, funding, borrow, liquidation, and fill histories. Removing
PIVX, using a current data vintage, or testing only the paper's clipped long-only
combination would likewise change the source hypothesis and its inputs.

This is a source-audit no-go, not a TradeClaw performance FAIL. No return series,
preregistration, result artifact, marketing draft, or prospective claim was
created. A current-vintage, reduced-universe, executable cryptocurrency factor
study may be worthwhile, but it must begin as a separately hashed hypothesis in
a later research window.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- One-based catalog row: `33`
- Catalog metadata: gross Sharpe `1.53`, t-statistic `6.2`, volatility `9.6%`,
  and `16` years tested; none of these figures was used to select or judge the
  candidate, and the 16-year label is not the source paper's roughly four-year
  sample
- Primary paper: Stefan Hubrich, "Know When to Hodl 'Em, Know When to Fodl
  'Em': An Investigation of Factor Based Investing in the Cryptocurrency Space"
- Version: second draft dated `2017-10-28`; `54` pages
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3055498>
- DOI: <https://doi.org/10.2139/ssrn.3055498>
- Indexed primary-document URL used for page-level reading:
  <https://assets.super.so/e46b77e7-ee08-445e-b43f-4ffd88ae0a0e/files/a2ce438a-42de-40d6-9eb7-272b28ce1cec.pdf>
- SSRN delivery URL identified by the primary record:
  <https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3061151_code231136.pdf?abstractid=3055498>

The paper text and page structure were readable through the indexed document,
but both direct PDF endpoints denied a source-byte fetch during this audit. No
CAPTCHA or access control was bypassed. Therefore no primary-PDF byte count or
SHA-256 is claimed, and the copyrighted paper is not vendored. The SSRN record
states that reuse requires permission.

## Published specification

The paper studies the 11 coins for which Coin Metrics data were available in
September 2017: BTC, DASH, DCR, DOGE, ETC, ETH, LTC, PIVX, XEM, XMR, and ZEC.
Its Table 1 reports these first observations:

| Coin | First observation |
| --- | --- |
| BTC | 2013-04-28 |
| DASH | 2014-02-14 |
| DCR | 2016-02-10 |
| DOGE | 2013-12-15 |
| ETC | 2016-07-24 |
| ETH | 2015-08-07 |
| LTC | 2013-04-28 |
| PIVX | 2016-02-13 |
| XEM | 2015-04-01 |
| XMR | 2014-05-21 |
| ZEC | 2016-10-29 |

The paper uses Coin Metrics for raw data and CryptoCompare for maximum coin
supply. Its base case is weekly:

1. Rebalance once every seven days and hold for seven days.
2. Construct all seven possible weekday schedules, then pool their overlapping
   weekly returns for analysis.
3. Keep total cryptocurrency gross exposure at `10%` and cash at `90%`, with a
   zero cash return. Positive benchmark weights sum to `10%`; factor-portfolio
   absolute weights sum to `10%`.
4. Start factor portfolios only after at least four coins are available.
5. Define raw momentum as the prior week's return. Define value as market value
   divided by trailing seven-day average on-chain transaction value. Define
   carry from protocol-driven coin issuance relative to supply.
6. For complete portfolios, standardize using only information available by the
   rebalance date and retain both time-series and cross-sectional information.
   For cross-sectional portfolios, standardize again across coins at each date.
7. Equal-weight factor portfolios assign absolute weight `10% / n`; signs come
   from the longitudinal score for complete portfolios or top-half/bottom-half
   ranks for cross-sectional portfolios.
8. Risk-weight factor portfolios divide factor scores by the longest available
   trailing volatility estimate, then rescale absolute weights to `10%`. The
   benchmark volatility estimate uses daily overlapping seven-day returns and a
   30-day minimum burn-in.

The individual factor portfolios allow negative coin weights. The later
benchmark-plus-composite illustration adds equal-weight factors to the
equal-weight benchmark, and risk-weight factors to the risk-weight benchmark,
then clips any negative resulting coin weight to zero.

## Source-reported evidence and costs

These are paper results, not TradeClaw returns. Table 4 reports momentum as the
strongest individual factor. Its annualized return and Sharpe pairs are `5.6% /
0.91` for cross-sectional equal weight, `9.3% / 1.06` for cross-sectional risk
weight, `6.3% / 0.77` for complete equal weight, and `19.8% / 1.70` for complete
risk weight. The paper estimates Newey-West-adjusted attribution statistics, but
does not provide TradeClaw-style chronological folds or an untouched holdout.

Appendix 5 reports annual trading volume of roughly `5-9%` for benchmarks,
`80-90%` for momentum, `30-50%` for value, `10-25%` for carry, and `28-32%`
for combined factors. It assumes spreads plus exchange fees of `0.2-0.5%` of
notional, estimates at most `15` bps of cost for a combined portfolio at about
`30%` trading volume, and explicitly assumes away market impact. The same
appendix says a USD `10 million` BTC trade then implied about `0.5-1%` impact,
with lower feasible ticket sizes in the other coins.

## Current official-data receipt

This audit observed the official `coinmetrics/data` archive and Community API
after the TC-261 receipt was frozen. No response was used to calculate returns.

- Official archive: <https://github.com/coinmetrics/data>
- Observed `master` commit:
  `f1a36afb962731c387bb03982758ab0103063da5`
- Archive license: `CC BY-NC 4.0`; the repository says archives update daily and
  gives no guarantee that asset or metric sets remain stable
- Community catalog query:
  <https://community-api.coinmetrics.io/v4/catalog/assets?assets=btc,dash,dcr,doge,etc,eth,ltc,pivx,xem,xmr,zec&pretty=true>
- Exact observed catalog response: `96,382` bytes, SHA-256
  `1eb632d06eceaa2a4112fd81f771c4963543f5afeb7d64e8af489c4fb9463d63`
- Pinned PIVX archive file:
  <https://raw.githubusercontent.com/coinmetrics/data/f1a36afb962731c387bb03982758ab0103063da5/csv/pivx.csv>
- Exact PIVX response: `100,864` bytes, `3,043` data rows, SHA-256
  `104d69d15fc28b1e594cb8be64b39fc36433bea98d98e64aca5870ff4db94b39`

The observed Community catalog has daily `PriceUSD` coverage through
`2026-08-28` for 10 of the 11 paper assets. PIVX has no catalogued `PriceUSD`
range. The pinned PIVX CSV begins only on `2018-01-24`, its reference-rate
columns remain empty until `2026-05-18`, and the file ends on `2026-05-24`.
It therefore contains neither the paper's `2016-02-13` PIVX start nor a usable
PIVX price series across the paper or later holdout period.

The current daily `PriceUSD` start dates also differ from the paper for several
assets: DASH `2014-02-08`, DCR `2016-05-17`, DOGE `2014-01-23`, ETC
`2016-07-25`, ETH `2015-08-08`, LTC `2013-04-01`, and XMR `2014-05-20`.
Those differences are direct evidence that today's community catalog is not the
paper's point-in-time source vintage.

## Reproducibility blockers

- The paper does not supply immutable Coin Metrics or CryptoCompare bytes,
  extraction code, exchange composition, timestamps, missing-data rules, or
  revision policy for the September 2017 data vintage.
- The current official archive cannot reproduce the full original universe.
  PIVX is absent from current `PriceUSD` coverage, and DCR and DOGE lose early
  observations that the paper used.
- Omitting PIVX or substituting another provider changes the cross-sectional
  ranks, longitudinal standardization, risk weights, universe-entry path, and
  all seven weekly portfolio schedules.
- The headline individual factor portfolios require scalable historical short
  positions that the paper acknowledges did not exist. A modern perpetual
  implementation is a different instrument and requires point-in-time venue
  eligibility, funding, borrow, margin, liquidation, spread, and fill records.
- The clipped benchmark-plus-factor construction avoids final negative coin
  weights, but it still depends on the unavailable source vintage and on
  factor inputs that are not supplied as immutable bytes. Selecting only this
  later construction would not reproduce the strongest reported factor result.
- Pooling seven overlapping weekly schedules creates dependent observations.
  Newey-West errors address the paper's inference, but do not supply frozen
  chronological folds, a post-publication holdout, or a same-window,
  identically costed benchmark protocol.
- The cost appendix estimates period-specific spreads and fees and assumes away
  impact. It does not freeze executable venue-by-asset fees, spreads, slippage,
  funding, custody transfers, delistings, or capacity for a 2017-2026 replay.
- The official current archive is noncommercially licensed and unstable by its
  own notice. TradeClaw has not approved mixing those data bytes into an MIT
  repository or hosted-product dataset, so no raw data is vendored here.

## Gate outcome

- Rule clarity: pass for the paper's mathematical portfolio family; fail for a
  single exact executable implementation because seven schedules and multiple
  factor/weight variants are reported without a preregistered canonical winner.
- Data provenance and rights: fail for exact replication; the 2017 inputs are
  not supplied and today's official community data cannot rebuild the universe.
- Tradability: fail for the strongest long/short factor portfolios; later
  clipping does not repair unavailable inputs or establish historical fills.
- Turnover and cost evidence: hold; turnover and approximate fees are reported,
  but scalable impact and an executable historical cost ledger are absent.
- Chronological falsification: possible only for a new current-vintage study
  after immutable inputs, folds, and a post-2017 holdout are frozen.
- Bounded implementation: fail for an exact replay; too many decisive source,
  universe, and instrument choices would have to be invented.
- Next action: archive this source-audited no-go. Treat any 10-coin, long-only,
  spot-only, or perpetual-futures study as a new hypothesis with its own later
  receipt and preregistration before returns.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff,
signal, allocation, broadcast, broker/execution action, billing change, or
trading activation occurred.
