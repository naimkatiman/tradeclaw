# Most Diversified Portfolio - Source Audit

Date: 2026-08-30

Task: TC-262

Candidate: `properties-of-the-most-diversified-portfolio`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of the published empirical study

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The paper defines
the long-only Most Diversified Portfolio objective clearly and reports an
infrequent semiannual schedule, but the tested implementation depends on
point-in-time MSCI World constituents, Bloomberg total returns and market
capitalizations, MSCI foreign-exchange data, and an author-developed
cross-time-zone correlation estimator whose executable specification is not
published.

The constrained portfolio also uses time-zone caps relative to the changing
MSCI World, plus a turnover-reduction penalty described only by its tracking-error
effect. The source does not freeze the penalty function, numerical tolerances,
same-day information cutoff, executable fill, or a replayable friction ledger.

The Papers With Backtest page is not a substitute specification. It labels the
strategy quarterly, starts its clone in 1990, and shows a much smaller current
stock portfolio; the primary paper rebalances at the end of May and November,
tests 1999-2010, and uses a point-in-time universe averaging 793 eligible stocks.
Its subscription-only pseudo-code was not accessed or inferred.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series, preregistration, result artifact, marketing draft, or prospective claim
was created. A public-data US-equity or ETF implementation would be a materially
new hypothesis and must receive its own later receipt and preregistration.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- One-based catalog row: `7`
- Catalog metadata: gross Sharpe `1.50`, t-statistic `9.0`, volatility `14.3%`,
  and `37` years tested; none of these values was used to select or judge TC-262
- Discovery page:
  <https://paperswithbacktest.com/strategies/properties-of-the-most-diversified-portfolio>
- Observed discovery HTML: `237,452` bytes, SHA-256
  `cf875317e7ea4631195152ed0d924fff627157bdecb99f80a4b65b761e44e6d3`
- Primary paper: Yves Choueifaty, Tristan Froidure, and Julien Reynier,
  "Properties of the Most Diversified Portfolio"
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1895459>
- DOI: <https://doi.org/10.21314/JOIS.2013.033>
- Audited journal PDF:
  <https://www.tobam.fr/wp-content/uploads/2021/12/2013-choueifatyfroidurereynier-properties-of-the-most-diversified-portfolio-jis.pdf>
- Audited PDF SHA-256:
  `bef4ce6719f3355d30c51ea2e7bc0005e8ece43cd422c3d612056a50147d7916`
- Audited PDF size and length: `171,320` bytes and `22` pages
- Machine-readable local extraction used only for audit: `64,657` bytes,
  SHA-256 `8703f6eb14f7b86cb9db7aeb928d5115a9f6279d5018d695b26f41973fa2f45e`

The SSRN record reserves reuse rights. The paper, discovery HTML, and temporary
text extraction are therefore not vendored in the MIT repository.

## Published specification

The paper defines the diversification ratio as the portfolio's weighted average
asset volatility divided by portfolio volatility. The long-only MDP maximizes
that ratio subject to nonnegative weights summing to one. Its empirical study
compares market-cap weighted, equal weighted, equal-risk-contribution, minimum
variance, MSCI minimum volatility, and MDP portfolios.

The tested MDP implementation is described as follows:

1. Use point-in-time MSCI World membership.
2. At each rebalance, exclude stocks with fewer than six months of price history.
3. Rank the remaining members by market capitalization and retain the top half,
   averaging `793` eligible stocks and about `90%` of index capitalization.
4. Estimate volatilities and covariances from the prior one year of daily local
   total returns converted to USD.
5. Rebalance semiannually at the end of May and November.
6. Maximize the long-only diversification ratio.
7. Apply a `1.5%` maximum stock weight.
8. Limit America, Europe, and Asia weights to no more than five percentage points
   above their contemporaneous MSCI World weights.
9. Add a turnover-reduction penalty whose annualized tracking error relative to
   the unpenalized solution is no more than `1.5%`.

The paper also reports a half-to-identity correlation shrinkage sensitivity.
That sensitivity does not replace the missing source universe, prices, FX,
primary estimator, or penalty implementation.

## Source/clone mismatch

The observed Papers With Backtest page describes quarterly rebalancing, stock
and index daily-price datasets, a `1990-2026` clone window, and `56` current long
positions. The primary paper instead specifies end-May/end-November rebalancing,
a `1999-2010` empirical window, approximately `1,500` point-in-time MSCI World
members before filtering, `793` eligible names on average after filtering, and
`137` MDP holdings on average.

Those differences affect every weight, trade, cost, benchmark, and return. The
clone output cannot be treated as a reproduction of the paper or as TradeClaw
evidence, and its displayed result was not used in this decision.

## Inputs and published cost treatment

The paper states that local-currency total returns and market capitalizations
came from Bloomberg, currency conversion used official MSCI FX data, and index
membership came from MSCI. It does not supply those source bytes, point-in-time
membership files, corporate-action history, extraction code, or vendor licenses.

The primary covariance estimate uses an author-developed "plesiochronous"
correlation estimator to address non-synchronous global market closes. The paper
names related literature but does not publish a complete estimator formula or
implementation.

For `1999-2010`, the paper reports `82%` annual one-way MDP turnover versus
`14%` for the market-cap benchmark. Its footnote says an all-in trading cost of
about `3.4%` would eliminate the MDP's reported advantage over that benchmark.
This is source-reported gross headroom, not a TradeClaw cost result. The paper
does not define whether the percentage is charged per side or round trip, nor
does it provide stock/date-specific commissions, spreads, slippage, taxes,
foreign-exchange costs, market impact, or realized trade files.

## Reproducibility blockers

- Exact point-in-time MSCI World membership, region weights, official FX, and
  Bloomberg total-return and capitalization histories are proprietary and are
  not supplied as immutable source bytes.
- A current-constituent or US-only universe would introduce survivorship,
  geography, currency, liquidity, and benchmark changes.
- The plesiochronous estimator is author-developed and not executable from the
  paper's description; ordinary close-to-close covariance is a different rule.
- The turnover-reduction penalty is specified by an outcome constraint, not by
  its objective term, calibration, solver, convergence tolerance, or tie-breaking.
- The paper does not freeze missing-return handling, corporate actions, market
  holidays, time-zone cutoffs, or the precise information available at each
  rebalance.
- A covariance estimate using rebalance-date closes cannot be filled at that
  same close causally; the source does not identify an executable next-session
  or next-common-market fill convention.
- The `1.5%` stock cap and region constraints require contemporaneous vendor
  classifications and index weights that are unavailable in the source package.
- The cost discussion is a break-even sensitivity, not a deterministic full
  friction ledger tied to the realized trades.
- The paper supplies no chronological folds, preregistered post-publication
  holdout, identically costed external market, or immutable replay artifact.
- The dynamic Papers With Backtest clone contradicts the primary cadence and
  sample and hides its pseudo-code behind a subscription; TradeClaw will not
  infer or purchase a hidden implementation to fill source gaps.

## Gate outcome

- Rule clarity: pass for the mathematical long-only MDP objective; fail for the
  complete empirical implementation, estimator, constraints, timing, and costs.
- Data provenance and rights: fail for exact replication; decisive MSCI and
  Bloomberg inputs are unavailable as independently hashable public bytes.
- Turnover: hold; only two scheduled rebalances occur each year, but each can
  trade a large global stock basket and the paper reports `82%` one-way turnover.
- Cost evidence: hold for initial gross headroom, fail for a replayable full-cost
  model because no realized trade ledger or executable friction schedule exists.
- Chronological falsification: a long post-2011 period exists only for a new
  public-proxy hypothesis, not an exact continuation of the source implementation.
- Bounded implementation: fail; recreating the source requires material vendor,
  estimator, penalty, classification, and fill choices not frozen by the paper.
- Next action: archive this source-audited no-go. Screen another candidate in a
  later UTC window; any public-universe MDP study must begin as a new hypothesis.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff, signal,
allocation, broadcast, broker/execution action, billing change, or trading
activation occurred.
