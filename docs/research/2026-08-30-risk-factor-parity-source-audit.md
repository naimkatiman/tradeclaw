# Risk Parity Portfolios with Risk Factors - Source Audit

Date: 2026-08-30

Task: TC-266

Candidate: `risk-parity-portfolios-with-risk-factors`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of the paper or
the Papers With Backtest clone

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. Thierry Roncalli
and Guillaume Weisang's paper is a methodology paper illustrated by three
different empirical applications. It does not define one executable strategy
that produces the discovery page's current 27-stock portfolio.

The three applications require different proprietary inputs: six MSCI USA
style indexes, the Dow Jones Credit Suisse hedge-fund index family and
historical constituent exposures, and Datastream economic and asset-class
series. The paper does not provide immutable raw inputs, an executable
replication package, stable vendor identifiers, or a redistribution grant. It
also explains that factor-risk-parity optimization may admit more than one
solution and that a matching long-only asset portfolio need not exist.

The paper contains no deterministic transaction-cost model, causal fill rule,
turnover-linked ledger, chronological folds, or untouched holdout. The short
hedge-fund simulation is explicitly treated cautiously because the PCA factors
are unstable; the strategic-allocation results are described as preliminary.
These are decisive pre-return blockers even though the applications rebalance
monthly or quarterly.

The Papers With Backtest page is not a substitute specification. Its visible
clone spans 1990-2026, names `ETFs Daily Price` plus `All Monthly
Coreeconomicdata`, and currently displays 27 long US stocks. Its pseudocode is
subscription-only. Those facts do not identify which of the paper's three
applications was implemented or supply the proprietary paper inputs,
estimator, constraints, and cost ledger.

This is a source-audit no-go, not a TradeClaw backtest FAIL. No preregistration,
return series, result artifact, marketing draft, or prospective claim was
created. A public-data risk-factor-parity implementation would be a materially
new hypothesis and must receive a separately hashed protocol before returns.

## Selection and receipt gate

TC-266 was selected by receipt-neutral feasibility triage inside the
`2026-08-30T09:00:00.000Z/PT3H` window. The screen preferred a monthly,
low-transition concept with a public primary working paper and a long
post-publication horizon. It did not rank candidates by the catalog's upstream
Sharpe ratio or by the live clone's displayed performance.

At `2026-08-30T09:05:26.917Z`, the ledger held ten receipts and none in the
current window. TC-266 is the one allowed receipt for that window. Returns
remained closed throughout the source audit.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- Zero-based catalog position: `59`; one-based row: `60`
- Pinned catalog metadata: gross Sharpe `1.08`, t-statistic `6.3`, volatility
  `17.3%`, and `34` years tested; these figures were not used to select or judge
  TC-266
- Discovery page:
  <https://paperswithbacktest.com/strategies/risk-parity-portfolios-with-risk-factors>
- Primary working paper: Thierry Roncalli and Guillaume Weisang, "Risk Parity
  Portfolios with Risk Factors," September 2012
- MPRA record: <https://mpra.ub.uni-muenchen.de/44017/>
- MPRA item: `44017`
- MPRA primary PDF:
  <https://mpra.ub.uni-muenchen.de/44017/1/risk-factor-parity.pdf>
- Primary PDF inspected through the web renderer: `33` pages
- Local primary-PDF SHA-256: not recorded. Direct local byte acquisition failed
  before a valid PDF could be obtained, so no checksum is invented and no
  invalid download is retained.
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2155159>
- SSRN DOI: <https://doi.org/10.2139/ssrn.2155159>
- Final journal DOI: <https://doi.org/10.1080/14697688.2015.1046907>

The MPRA PDF was sufficient to audit the source's scope, inputs, estimator
qualifications, application windows, and limitations. The inability to pin the
local PDF bytes prevents claiming a byte-identical source archive, but it does
not weaken the no-go: the paper itself identifies inputs and ambiguities that
are unavailable in this repository. No primary paper, discovery HTML, rendered
page, or vendor data is redistributed here.

## What the paper actually specifies

The paper develops factor-based risk budgeting and then presents three
separate applications:

1. decompose six US equity style indexes into Fama-French-Carhart factors and
   compare asset-risk and factor-risk budgets at two study dates;
2. construct hedge-fund allocations using statistical factors extracted by
   principal component analysis; and
3. illustrate strategic asset allocation using macroeconomic factors and
   thirteen asset classes.

These applications do not share one universe, data cadence, estimator, sample,
or portfolio output. The source is therefore a methodology with examples, not
a single 27-stock trading rule.

The mathematical mapping is also not uniquely executable from the paper's
high-level goal. For a target factor-risk budget, the optimization may have
multiple solutions. Constraints and the asset-to-factor loading matrix can
make an exact long-only matching portfolio unavailable. An implementation must
freeze the objective, parametrization, bounds, solver, tolerance, tie handling,
initial conditions, and policy for infeasible or non-unique solutions before
returns. The source and clone do not jointly supply those choices.

## Equity factor-risk-budgeting application

The equity example uses these six MSCI USA style indexes:

- MSCI USA Large Growth;
- MSCI USA Large Value;
- MSCI USA Mid Growth;
- MSCI USA Mid Value;
- MSCI USA Small Growth; and
- MSCI USA Small Value.

The factor model uses the market factor, SMB, HML, and momentum from the
Fama-French-Carhart family. The paper estimates the factor structure by maximum
likelihood using a rolling year of observations. It shows point-in-time results
for June 2011 and June 2012 and notes that the solution is sensitive to the
study date.

This is not a frozen return experiment. The paper does not supply the exact
MSCI index files, licensing rights, vendor identifiers, daily/monthly boundary
conventions, missing-data policy, cash treatment, optimization code, or a
chronological evaluation ledger. Replacing the MSCI indexes with public ETFs
would change the histories, expenses, inception dates, factor loadings, and
tradable fills and would create a new hypothesis.

## Hedge-fund PCA application

The hedge-fund example uses the Dow Jones Credit Suisse AllHedge index and ten
strategy subindexes with monthly net-asset-value histories. The paper points to
`hedgeindex.com`; the detailed underlying holdings are no longer publicly
available, so the exposure reconstruction assumes constant or average
holdings.

The application estimates a covariance matrix over a rolling two-year window,
extracts PCA factors, assigns an equal 25% risk budget to each of the first four
factors, and rebalances monthly. Its reported simulation covers September 2009
through August 2012. The source notes that equal-risk-contribution and
factor-risk-parity constructions induce more turnover than some alternatives.

The paper cautions against treating the displayed performance as proof of
superiority because the PCA factors are unstable. It does not supply frozen
index bytes, the vanished holdings history, an exact covariance and
standardization implementation, eigenvector sign/order handling, solver
settings, a transaction ledger, or complete costs. A three-year retrospective
illustration with rolling two-year estimation is not an untouched holdout.

## Strategic asset-allocation application

The strategic example uses quarterly Datastream observations from 1999 Q1
through 2012 Q2. It groups seven economic series into four broad factor groups:
activity, inflation, interest rates, and currency. Those factors are related to
thirteen proprietary asset-class series to illustrate static allocations.

The paper calls this portion preliminary. It does not supply the Datastream
export, exact vendor identifiers and vintages, revision policy for economic
series, release lags, point-in-time availability, asset-class return
construction, optimization code, or a tradable order schedule. Replacing the
series with present-day public macro data and ETFs would introduce look-ahead,
proxy, inception, and execution choices and would be a new study.

## Source and clone mismatch

The observed Papers With Backtest page exposes these implementation facts:

- cadence: monthly;
- markets: equities, bonds, commodities, and derivatives;
- visible datasets: `ETFs Daily Price` and `All Monthly Coreeconomicdata`;
- clone period: `1990-2026`;
- live displayed output: 27 long US stocks; and
- pseudocode: unavailable without subscription access.

The primary paper instead has three separate empirical setups, uses proprietary
MSCI, hedge-fund-index, holdings, and Datastream inputs, and does not specify a
current 27-stock portfolio. The clone's displayed period also predates several
of its current holdings and the obvious ETF implementation set. Without public
code, pinned data, and a manifest mapping every clone choice back to one paper
application, its dynamic metrics and positions are upstream discovery output,
not independent TradeClaw evidence.

## Cost and execution audit

The primary paper discusses risk allocation and turnover but does not provide a
complete transaction-cost experiment. It supplies no observed bid/ask series,
commission schedule, spread/slippage assumptions, market-impact function,
financing or borrow model, fund expenses, taxes, corporate-action rules, or
turnover-linked order ledger.

It also does not freeze a causal fill convention. Monthly or quarterly weights
cannot become returns without specifying signal timestamps, data publication
lags, order timing, close/open/VWAP assumptions, holidays, delayed markets,
cash, partial fills, rebalance thresholds, and rounding. The paper's statement
that some constructions have higher turnover makes omission of a cost ledger
material rather than cosmetic.

The live clone's headline metrics are not accepted as cost evidence. Its code
and realized trade ledger are unavailable, and the page does not establish
that the visible performance includes every relevant friction for the displayed
portfolio.

## Validation audit

None of the applications supplies the TradeClaw falsification structure needed
for a return claim:

- no preregistration hashed before returns;
- no fixed chronological folds with minimum pass criteria;
- no untouched post-publication holdout;
- no external falsification market or universe;
- no deterministic replay artifact binding inputs, estimator, fills, costs, and
  outputs; and
- no public replication package from which those items can be reconstructed.

The equity example compares two study dates, the hedge-fund simulation is a
short retrospective illustration, and the strategic-allocation section is
preliminary. None can be relabeled as a causal holdout after inspection.

## Reproducibility blockers

- The paper is a methodology with three distinct applications, not one
  executable strategy matching the discovery clone.
- Exact MSCI USA style-index bytes, identifiers, vintages, and redistribution
  rights are not supplied.
- Exact Dow Jones Credit Suisse hedge-fund index bytes and the historical
  holdings/exposures needed by the source are not publicly supplied.
- Exact Datastream economic and asset-class series, vendor identifiers,
  vintages, and revision histories are not supplied.
- The repository has no authorized copy of any decisive proprietary input.
- The optimizer can be non-unique, and a matching long-only solution is not
  guaranteed; solver and infeasibility policies are not frozen.
- The equity example is date-sensitive and supplies point estimates rather than
  a deterministic chronological portfolio ledger.
- PCA standardization, component ordering/sign conventions, covariance details,
  and solver tolerances are not executable end to end.
- The strategic application lacks point-in-time macro release and revision
  rules.
- No causal signal-to-fill rule or tradable instrument mapping is supplied.
- No complete transaction-cost model or turnover-linked ledger is supplied.
- No chronological folds, untouched holdout, or external falsification gate is
  supplied.
- The clone code is hidden and its 1990-2026, 27-stock implementation is
  materially different from the paper's three applications.
- A valid local primary-PDF byte stream could not be acquired and hashed during
  this audit, so an exact source-byte claim is unavailable.

## Gate outcome

- Primary-source access: pass for semantic audit through the public 33-page
  MPRA document; fail for a locally pinned byte-identical source archive.
- Single-rule clarity: fail; the paper contains three different applications.
- Input provenance and rights: fail; decisive proprietary histories and
  exposures are unavailable and no authorized dataset is present.
- Turnover screen: pass only as a low-frequency triage signal; monthly and
  quarterly cadence does not establish cost viability.
- Estimator determinism: fail; exact solver, constraints, non-unique solution,
  PCA, and infeasibility policies are not frozen.
- Cost evidence: fail; no complete friction model or realized order ledger is
  supplied.
- Chronological falsification: fail; no frozen folds, holdout, or external
  market exists.
- Bounded exact implementation: fail; a runnable public version requires
  material universe, input, estimator, execution, cost, and validation choices.
- Next action: archive this source-audited no-go. Any public
  risk-factor-parity implementation must begin as a separately hashed
  hypothesis with a frozen universe, immutable data, deterministic estimator,
  causal fills, complete costs, chronological folds, and untouched holdout
  before returns.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff,
signal, allocation, broadcast, broker/execution action, billing change, or
trading activation occurred.
