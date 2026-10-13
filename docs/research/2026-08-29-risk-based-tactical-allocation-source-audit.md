# Risk-Based Tactical Asset Allocation - Source Audit

Date: 2026-08-29

Task: TC-260

Candidate: `a-risk-based-approach-to-tactical-asset-allocation`

Stage: source-audited

Disposition: verified no-go; do not preregister this published specification

TradeClaw backtest run: no

## Decision

Do not spend a TradeClaw replication cycle on the published specification. The
paper's weekly risk-allocation idea has a long post-publication horizon, but an
independent implementation would have to invent the decisive Filtered Bootstrap
parameters, replace proprietary and author-stitched index histories, repair a
same-close signal/fill assumption, and introduce a turnover-linked cost model
that the paper does not provide.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series, preregistration, result artifact, marketing draft, or prospective claim
was created. A public-proxy Expected-Shortfall study would be a materially new
hypothesis and must receive its own source record and preregistration.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- Catalog row: gross Sharpe `1.06`, t-statistic `6.4`, volatility `5.0%`, and
  `37` years tested; none of these figures was used to select or judge the
  candidate
- Primary paper: Stefano Colucci and Dario Brandolini, "A Risk Based Approach
  to Tactical Asset Allocation"
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965423>
- DOI: <https://doi.org/10.2139/ssrn.1965423>
- Audited SSRN PDF:
  <https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID1966391_code1715697.pdf?abstractid=1965423>
- Audited PDF SHA-256:
  `fb43ff7f323218ea4ebe043fa7b9bbdbe2232a9b65b6b9c3461c1c4d98f2faba`
- Audited PDF size and length: `492,231` bytes and `27` pages
- Cited risk-model paper: Stefano Colucci and Dario Brandolini, "Backtesting
  Value-at-Risk: A Comparison between Filtered Bootstrap and Historical
  Simulation", <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1965377>

The primary PDF was readable for this audit. Its SSRN record states that reuse
rights are reserved, so the PDF is not vendored in the TradeClaw repository.

## Published specification

For a single risky asset, the paper specifies this weekly overlay:

1. Target one-month, five-percent Expected Shortfall at `-6%`.
2. Re-estimate Expected Shortfall every five market working days.
3. When calculated ES is greater than the target, allocate `100%` to the risky
   asset.
4. Otherwise allocate the following fraction to the risky asset and the
   complement to the defensive asset:

   `ES_target / ES_calculated * (1.41 / (VaR_1% / VaR_5%))^2`

5. Use seven-to-ten-year US Treasuries as the defensive asset, except that the
   commodity sleeve uses cash.
6. Calculate the signal and transact at that same day's close.

The multi-asset illustration assigns `70%` to equities, `10%` to commodities,
and `20%` to US Treasuries. Equity country weights are based on five-year mean
GDP and refreshed every five years. The paper describes calibration beginning
in 1974 and reports its portfolio study from `2000-01-01` through `2011-08-22`.

## Inputs and published cost treatment

The paper uses a USD-denominated mix of S&P 500, Topix, DAX, MSCI UK, MSCI
France, Comit Globale, MSCI Canada, MSCI Emerging Markets, RJ/CRB or GSCI, and
Merrill Lynch seven-to-ten-year US Treasury/Agency indices. Most histories are
identified as Bloomberg series. Several are spliced across price-return and
total-return variants; earlier sections use author-created proxies, including
daily histories synthesized from monthly observations and another index's
volatility. The exact source files, vintages, splice code, and GDP release
vintages are not retained.

The five-day schedule permits as many as roughly `52` allocation decisions per
year, but the paper does not report realized turnover. Taxes, commissions, and
slippage are excluded from the single-asset studies. The portfolio comparison
applies a fixed `2%` annual total-expense ratio to the managed allocation and
`0.60%` to buy-and-hold; it does not disclose executable spread, fee, slippage,
market-impact, or turnover charges.

## Reproducibility blockers

- The allocation paper names a Filtered Bootstrap estimator but does not freeze
  its estimation window, volatility filter, innovation-resampling procedure,
  simulation count, random seed, horizon aggregation, missing-data treatment,
  or ES/VaR sign convention. Its cited risk-model abstract confirms a Monte
  Carlo Filtered Bootstrap and a separate 250-observation regulatory test, but
  that does not define the allocation paper's one-month estimator.
- Computing a close-derived risk estimate and filling at that same close is not
  a causal executable rule. Moving the fill to the next close would be an honest
  control, not an exact reproduction of the published result.
- The Bloomberg, MSCI, RJ/CRB, and Merrill Lynch histories are not immutable
  public inputs, and the author's synthetic prehistories cannot be regenerated
  from supplied bytes.
- Replacing those histories with modern ETFs or public index proxies would
  change inception dates, total-return construction, currencies, cash flows,
  defensive sleeves, and the tested hypothesis.
- The GDP weighting rule does not identify the exact country mapping, release
  dates, vintages, or point-in-time availability needed to prevent revision and
  look-ahead bias.
- A flat annual TER is not a replayable trading-friction model. Without realized
  turnover or an executable fee/spread/slippage schedule, the published net
  comparison cannot establish cost headroom for TradeClaw's full friction gate.
- The paper does not provide chronological folds, an untouched holdout, or an
  identically timed and costed public-data benchmark. The long 2012-2026 period
  is potentially useful only after a materially new proxy protocol is frozen.

## Gate outcome

- Rule clarity: fail; the core risk estimator and causal fill are not frozen.
- Data provenance and rights: fail for exact replication; the complete index,
  proxy, and GDP inputs are neither public nor independently hashable.
- Turnover: hold; weekly decisions are bounded, but realized reallocation is not
  reported.
- Cost evidence: fail; fixed TER assumptions do not establish turnover-linked
  fee, spread, slippage, and impact headroom.
- Chronological falsification: possible for a new public-proxy study, not for an
  exact replay of the unavailable source histories.
- Bounded implementation: fail; recreating the estimator, synthetic histories,
  and point-in-time GDP weights would require material unreported choices.
- Next action: archive this source-audited no-go. Screen another candidate whose
  complete rule and source bytes can be frozen before any return calculation.

## Safety receipt

No push, merge, deployment, publication, social post, signal, allocation,
broadcast, broker/execution action, billing change, or trading activation
occurred.
