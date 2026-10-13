# Good Carry, Bad Carry - Source Audit

Date: 2026-08-30

Task: TC-265

Candidate: `good-carry-bad-carry`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of the published
empirical study

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The paper supplies
a clear monthly currency-carry concept and explicitly embeds transaction costs
through observed bid and ask quotes, but the decisive source bytes are not
publicly reproducible.

The published returns require Barclays Bank G-10 spot and one-month forward bid
and ask quotes distributed through Datastream. Neither the paper, the authors'
official records, NBER, nor the publisher supplies an immutable raw data package
or executable replication code. Current official Datastream access is offered
through the commercial LSEG Workspace, bulk feed, or API. No authorized copy of
the required series is present in TradeClaw.

The Papers With Backtest page is not a substitute specification. Its visible
dataset is only `Forex Daily Price`, its clone spans 1990-2026 instead of the
paper's 1984-2014 sample, and its implementation is hidden behind subscription
access. Daily spot prices cannot reconstruct the one-month forward differential
used for ranking or the forward-bid/spot-ask and forward-ask/spot-bid returns
used for fills and costs.

The paper also separates a causal expanding-history exercise from the headline
fixed "good" and "bad" currency subsets. The dynamic exercise chooses exclusions
using only information available before each next month. The fixed subsets are
then chosen after observing that exclusion history and evaluated over the full
sample. The authors explicitly describe those fixed results as suffering from
look-back bias and say a full correction would require a much longer ex-ante
sample.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series, preregistration, result artifact, marketing draft, or prospective claim
was created. Replacing forwards with spot momentum, public interest-rate
proxies, synthetic forwards, midpoint fills, or assumed spreads would create a
materially new hypothesis and must receive a separate later UTC receipt and
frozen protocol before returns.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- One-based catalog row: `28`
- Catalog metadata: gross Sharpe `1.74`, t-statistic `10.6`, volatility `4.6%`,
  and `37` years tested; none of these values was used to select or judge TC-265
- Discovery page:
  <https://paperswithbacktest.com/strategies/good-carry-bad-carry>
- Observed discovery HTML: `205,367` bytes, SHA-256
  `88888b8a6ab2dec7a4590c3f0f00927e0f318e8be13beee720c61c11026c6f3d`
- Primary working-paper copy: Geert Bekaert and George Panayotov, "Good Carry,
  Bad Carry," Columbia Business School, version dated January 16, 2018
- Author-hosted working paper:
  <https://business.columbia.edu/sites/default/files-efs/pubfiles/26212/good_carry.pdf>
- Author-hosted PDF audited: `380,097` bytes and `88` pages, SHA-256
  `24d54034c6b74944d4dd3bcfc20ddf2db85871f914d91be5833af0eba8435727`
- NBER record: <https://www.nber.org/papers/w25420>
- NBER Working Paper 25420 DOI: <https://doi.org/10.3386/w25420>
- NBER PDF audited: `344,309` bytes and `78` pages, SHA-256
  `afb9d2a98720f87659c2ba8b6c675e1b616ef0403ef39bfd17b4a662dbd595a5`
- Final article: *Journal of Financial and Quantitative Analysis* 55(4), June
  2020, pages 1063-1094; published online October 21, 2019
- Final DOI: <https://doi.org/10.1017/S0022109019000887>
- Publisher record:
  <https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/abs/good-carry-bad-carry/3BD4883026CA735E1F206588E0B957C4>

The publisher's named supplementary material is the paper's online appendix,
not a raw data or code package. The Columbia PDF already includes that appendix.
The vendor data, discovery HTML, downloaded papers, text extractions, and
rendered audit pages are not vendored in this MIT repository.

## Published specification

The paper's standard carry rule is understandable at a research level:

1. Use the last trading day of each month from December 1984 through June 2014,
   for 354 monthly observations.
2. Use New Zealand dollar, Australian dollar, British pound, Norwegian krone,
   Swedish krona, Canadian dollar, US dollar, euro, Swiss franc, and Japanese
   yen. Use the German mark before the euro begins in 1999.
3. Quote spot and one-month forward exchange rates as foreign currency units per
   US dollar.
4. Rank currencies at month end by the mid-quote one-month forward differential,
   `F / S - 1`.
5. With all ten currencies, hold equal absolute weights: the highest five long
   and the lowest five short. Total gross absolute investment equals one.
6. For an even subset of `N`, split equal weights between the high and low
   halves. For odd `N`, drop the median-ranked currency before splitting.
7. Rebalance at each month end and liquidate at the next month end.
8. Calculate a long return as forward bid divided by next-month spot ask minus
   one. Calculate a short return as one minus forward ask divided by next-month
   spot bid. Those quote sides embed the observed bid/ask cost.

The exact quote orientation, rank, weights, and return equations are stated.
That semantic clarity does not supply the historical source series, identifier
map, vendor vintage, timestamp conventions, holidays, stale-quote rules, or
authorized redistribution rights required for byte-reproducible execution.

## Dynamic exercise versus fixed headline subsets

The paper's dynamic enhancement starts at the end of December 1994 and runs
through May 2014, covering 234 next-month trading dates. At each date `t`, it:

1. Uses all return information from December 1984 through `t - 1` to calculate
   the standard carry Sharpe ratio.
2. Tests each possible one-currency exclusion on that expanding history.
3. Uses the exclusion with the highest historical Sharpe only if it exceeds the
   standard benchmark; otherwise it keeps the standard trade.
4. Repeats the search sequentially across the remaining currencies to construct
   variants excluding as many as seven currencies.
5. Applies the selected subset only to the following month.

This portion is causal with respect to each next-month return, although it has
no separately frozen post-publication holdout. It is also computationally
dependent on the unavailable vendor quote history.

The fixed good and bad subsets are a different evidence class. They are chosen
after the dynamic exercise shows which currencies were repeatedly retained or
excluded, and they are then evaluated over the full December 1984 through June
2014 sample. Section 3.5 expressly identifies look-back bias and finite-sample
selection bias. The paper's own selection-bias simulation substantially weakens
the broad headline significance. TradeClaw therefore cannot present these fixed
subsets as preregistered, prospective, or untouched.

## Source and clone mismatch

The observed Papers With Backtest page exposes these implementation facts:

- dataset label: `Forex Daily Price`
- clone period: `1990-2026`
- `hasCode`: `true`, but the implementation is not publicly inspectable without
  subscription access
- displayed clone metrics and positions are dynamic upstream outputs, not a
  pinned independent replication artifact

The paper instead needs month-end one-month forward and spot bid/ask quotes,
including the DEM-to-EUR transition, from December 1984. Spot daily closes alone
cannot identify the ranking signal or the quote-side returns. A hidden clone
cannot resolve that mismatch, and its output was not used as performance
evidence or as a promotion score.

## Inputs and cost treatment

The primary paper identifies Barclays Bank data available through Datastream.
It does not supply exact vendor mnemonics, a raw export, checksums, retrieval
time, revision policy, calendar alignment, missing-quote handling, or a license
that allows TradeClaw to redistribute the inputs.

LSEG currently describes Datastream as a historical financial database accessed
through Workspace, a bulk data feed, or an API and asks prospective users to
request product details. This establishes an official acquisition path, not an
open immutable dataset. TradeClaw has no authorized account or frozen export in
scope for TC-265.

The paper's use of observed bid and ask quotes is stronger than applying an
arbitrary flat fee after midpoint returns. It still cannot be reproduced with
spot-only inputs: the exact spread is part of every historical forward and spot
observation. Substituting assumed spreads would alter both the return and the
cost result. The source also supplies no deterministic order ledger, market
impact model, counterparty limits, financing schedule, taxes, or current
tradeability assumptions for extending the result beyond its academic sample.

## Reproducibility blockers

- The exact Barclays Bank spot and one-month forward bid/ask bytes are not
  publicly supplied or present under an authorized TradeClaw license.
- Exact vendor identifiers, vintage, timestamp and calendar conventions,
  missing or stale quote handling, and the DEM/EUR splice are not frozen.
- The ranking signal and quote-side returns cannot be reconstructed from the
  discovery page's visible `Forex Daily Price` dataset.
- The clone code is not publicly inspectable, so its 1990-2026 output cannot be
  audited as an implementation of the paper.
- Spot momentum, public rate proxies, covered-interest-parity forwards,
  midpoint fills, and assumed spreads are materially different data and cost
  hypotheses.
- The dynamic selection exercise lacks an immutable public input package and a
  post-publication holdout frozen before the current audit.
- The fixed good and bad subsets use the dynamic exclusion history and the full
  research sample; the authors explicitly acknowledge look-back bias.
- The paper's observed bid/ask treatment does not provide a current executable
  friction schedule or deterministic trade ledger for a new implementation.

## Gate outcome

- Rule clarity: pass for the academic ranking, weighting, dynamic exclusion, and
  quote-side return equations.
- Data provenance and rights: fail for an exact public replay; the decisive
  vendor bytes are neither public nor present under an authorized repository
  license.
- Turnover: pass for initial frequency screening; the rule rebalances monthly.
- Cost evidence: pass for the paper's historical bid/ask convention; fail for a
  reproducible calculation because those quote sides are in the unavailable
  source data.
- Chronological falsification: hold for the causal 1994-2014 dynamic exercise;
  fail for the fixed headline subsets because they are ex-post, and no frozen
  post-publication data package exists.
- Bounded implementation: fail; any runnable public-data version requires
  material source, signal, fill, cost, and validation substitutions.
- Next action: archive this source-audited no-go. A later public-data carry study
  must begin as a new hypothesis with immutable inputs, exact synthetic-forward
  or rate construction if used, causal fills, complete costs, chronological
  folds, a post-publication holdout, and external falsification.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff, signal,
allocation, broadcast, broker/execution action, billing change, or trading
activation occurred.
