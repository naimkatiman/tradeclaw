# Rolling vs. Expanding Mean-Reversion - Source Audit

Date: 2026-08-30

Task: TC-264

Candidate: `rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of the published
empirical study

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The paper states a
useful low-frequency commodity-ratio hypothesis, but the published result cannot
be replayed without inventing decisive data, instrument, fill, position, and cost
rules.

The study uses Investing.com daily closes for gold and silver spot plus copper
and Brent futures. It does not identify immutable source files, exact futures
contracts, continuation or roll rules, time zones, revisions, calendars, or
missing-value alignment. It also does not define the executable instrument used
to earn each denominator return, the entry fill after a lagged close signal,
overlapping-entry treatment, capital accounting, or a realized friction ledger.

The paper acknowledges a 72-combination full-sample sweep and explicitly says
the parameters were selected using the full 2000-2026 sample before presenting
the 2016-2026 period as temporal out-of-sample validation. That later split is a
retrospective stability check, not an untouched holdout. The paper was written
in February 2026, leaving no meaningful post-publication sample for a strategy
that reports about two gold/silver trades per year.

The Papers With Backtest page is not a substitute specification. It labels the
clone daily, starts in 1990 rather than 2000, displays a current short SPX
position, and reports a negative net worth and drawdown above 1,200 percent for
a paper whose stated strategy is long the denominator commodity after an
extreme ratio signal. The clone output was not used to select or judge TC-264.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series, preregistration, result artifact, marketing draft, or prospective claim
was created. A public-data commodity proxy would be a materially new hypothesis
and must receive its own later UTC receipt and frozen protocol before returns.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- One-based catalog row: `27`
- Catalog metadata: gross Sharpe `0.36`, t-statistic `2.2`, volatility `98.5%`,
  and `37` years tested; none of these values was used to select or judge TC-264
- Discovery page:
  <https://paperswithbacktest.com/strategies/rolling-vs-expanding-windows-in-mean-reversion-strategies-evidence-from-gold-silver-and-cross-asset-validation>
- Observed discovery HTML: `203,968` bytes, SHA-256
  `ae252fd968872a8932e67b4e48aa75c88188ae9aad305a3e811ced1e50145455`
- Primary paper: Akshit Gupta, "Rolling vs. Expanding Windows in
  Mean-Reversion Strategies: Evidence from Gold-Silver and Cross-Asset
  Validation"
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6217778>
- DOI: <https://doi.org/10.2139/ssrn.6217778>
- Official SSRN PDF audited through the record's public download control:
  `636,787` bytes and `19` pages, SHA-256
  `94ce5ddb4c6f211989440b087cf7f9fcc368907bb0f0d8955058a0cb935197e6`
- Machine-readable local extraction used only for audit: `50,556` bytes,
  SHA-256 `e1188a944503603ec29bd02c50f68c13f92b62dec081a413a0f229608f49b70b`
- SSRN record facts observed on 2026-08-30: written February 10, 2026; posted
  February 18, 2026; all rights reserved

The SSRN record does not grant repository redistribution rights. The PDF,
discovery HTML, rendered pages, and extracted text are therefore not vendored in
the MIT repository.

## Published specification

The paper's primary gold/silver rule can be stated at a high level:

1. Use daily closes from January 2000 through February 9, 2026 for gold
   (`XAU/USD`) and silver (`XAG/USD`) from Investing.com.
2. Form the gold/silver ratio and compute a z-score using either all history or
   a rolling window. Lag the z-score by one trading day.
3. For the chosen baseline, use a seven-year rolling window and enter long the
   denominator asset when z-score is greater than `1.25`.
4. Require the ratio to have declined at least `2%` from its recent ten-trading-
   day peak.
5. Hold for `15` trading days with no early exit.
6. Apply `10` basis points per side.
7. In the paper's final production description, size at `1.15x` when the prior
   day's VIX is above `20`; otherwise use baseline size.

The baseline was selected from `72` combinations: expanding, five-year,
seven-year, and ten-year windows; `10`, `15`, and `20` trading-day holds;
z-thresholds `1.0`, `1.25`, and `1.5`; and the confirmation filter on or off. A
five-year warmup precedes signal generation.

The highest reported full-sample result used the seven-year window, `1.5`
threshold, 15-day hold, and confirmation filter: 28 trades and Sharpe `2.19`.
The paper instead designates the rank-seven `1.25` threshold as primary because
its 47 trades provide more power for later regime analysis; it reports Sharpe
`1.63` and cumulative return `344.9%` after the flat 10-basis-point-per-side
assumption. Those are source claims, not TradeClaw evidence.

The paper's final VIX sizing rule is adopted after pooled regime analysis, while
its transaction-cost sensitivity table is labeled for the primary rule without
showing a separate identically calculated final-VIX ledger. That distinction is
another reason not to infer a single executable production record.

## Published validation is not an untouched holdout

The temporal table divides signals into 2005-2015 and 2016-2026 and reports 19
and 27 trades respectively. The text introduces that split by acknowledging
that the parameters were selected using the full 2000-2026 sample. The chosen
configuration ranks 16th of 72 on the earlier period alone. The later period is
useful as a retrospective robustness view, but it cannot undo full-sample
selection and must not be labeled an untouched TradeClaw holdout.

The paper applies the chosen gold/silver parameters to gold/copper,
silver/copper, copper/oil, and gold/oil and reports 350 pooled trades across five
pairs. It also says platinum and palladium pairs were considered and excluded on
economic grounds, and it performs an additional independent gold/copper
parameter sweep. These analyses may motivate a later hypothesis, but they share
the same unpinned source package, mixed spot/futures construction, and
pre-publication research process. They are not an immutable external
falsification record.

## Source/clone mismatch

The observed Papers With Backtest page labels the strategy daily, offers
commodity and index daily-price datasets, and displays a `1990-2026` clone. The
paper uses data beginning in 2000, a five-year warmup, event-conditioned entries,
and a fixed 15-trading-day hold.

The clone page displayed net worth `-1,237,483` from `100,000`, Sharpe `0.36`,
volatility `97.55%`, maximum drawdown `1236.31%`, and one current position: short
`304` units of `SPX`. Its embedded position data also listed flat `CL1` and VIX.
Those instruments, signs, exposure, sample, and solvency behavior do not identify
the paper's long-denominator commodity-ratio implementation.

The dynamic clone cannot be treated as a reproduction of the paper or as
TradeClaw evidence. Its displayed metrics and current positions are recorded
only to make the mismatch auditable; they were not treated as candidate
performance.

## Inputs and published cost treatment

The paper names Investing.com as the source for XAU/USD, XAG/USD, copper
futures, and Brent crude futures; FRED supplies `VIXCLS` and `FEDFUNDS`. It does
not supply the actual commodity files, download timestamp, stable vendor
identifiers, revision policy, or licenses for repository redistribution.

"Copper futures" and "Brent crude oil futures" do not identify a contract,
expiry selection, roll date, roll price, adjustment method, or collateral and
carry convention. Combining those series with spot metal quotes also leaves the
tradable denominator vehicle and ratio units unresolved. A current download,
ETF substitution, or unrelated continuous-futures vendor would change both the
signal and earned returns.

The paper reports cost sensitivity from `10` through `50` basis points per side,
with source-reported Sharpe declining from `1.63` to `1.26`. This is a scalar
sensitivity on the published trade returns, not an executable friction model.
There is no trade file linking entries and exits to fees, spread, slippage,
futures rolls, financing, collateral yield, taxes, market impact, or vehicle-
specific minimums.

## Reproducibility blockers

- The exact Investing.com source bytes, stable tickers, retrieval timestamp,
  revisions, time zones, calendars, and redistribution rights are not frozen.
- Copper and Brent futures contracts, continuation method, expiry choice, roll
  dates, back-adjustment, and carry or collateral treatment are unspecified.
- The tradable denominator vehicle is not fixed for each ratio; spot, ETF, and
  futures returns have materially different funding, roll, dividend, and access
  assumptions.
- Ratio units, cross-market holiday alignment, missing-close behavior, and the
  exact definition of a seven-year window are not executable from the paper.
- Lagging the close-derived signal one day prevents direct lookahead, but the
  next executable entry price, order type, session, and exit-price timestamp are
  not defined.
- The paper does not state whether qualifying signals can overlap, whether a
  position creates a cooldown, how repeated entries share capital, or how
  concurrent ratio positions are netted.
- Confirmation inclusion, recent-peak endpoints, z-score variance convention,
  equality and tie behavior, and numerical rounding are not frozen.
- The flat cost assumptions are not tied to realized trades and omit spread,
  slippage, futures rolls, financing, collateral yield, taxes, impact, and
  vehicle-specific fees.
- The primary configuration was chosen after a 72-combination full-sample sweep;
  the `1.25` threshold was then preferred over the better-looking `1.5` result
  to increase downstream regime sample size.
- The 2016-2026 temporal split is retrospective because the paper explicitly
  says parameters were selected using the full 2000-2026 sample.
- The February 2026 publication leaves no meaningful prospective sample by
  August 2026 for a rule reporting about two primary trades per year.
- Cross-asset pooling uses the same unpinned source family and pre-publication
  analysis, while the final VIX sizing rule is adopted only after pooled testing.
- The dynamic discovery clone contradicts the paper's sample, exposure, and
  current instrument while its implementation is not an accepted specification.

## Gate outcome

- Rule clarity: pass for the research concept; fail for an exact executable
  instrument, data alignment, entry/exit fill, overlap, and accounting protocol.
- Data provenance and rights: fail; decisive commodity bytes and futures lineage
  are neither independently hashable from the source package nor licensed for
  repository redistribution.
- Turnover: pass for initial frequency screening; the primary paper reports only
  47 gold/silver trades over about 21 years.
- Cost evidence: hold for source-reported gross headroom and scalar sensitivity;
  fail for a replayable full-cost model because no deterministic trade ledger or
  vehicle-specific friction schedule exists.
- Chronological falsification: fail for exact replay; the temporal split followed
  full-sample selection and the post-publication window is too short for this
  low-frequency rule.
- Bounded implementation: fail; a run would require material choices about
  vendor series, futures rolls, tradable vehicles, fills, overlap, costs, and
  accounting that the source did not freeze.
- Next action: archive this source-audited no-go. Screen another candidate in a
  later UTC window; any public-commodity version must begin as a new hypothesis
  with pinned inputs, causal fills, complete costs, controls, and a prospective
  holdout.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff, signal,
allocation, broadcast, broker/execution action, billing change, or trading
activation occurred.
