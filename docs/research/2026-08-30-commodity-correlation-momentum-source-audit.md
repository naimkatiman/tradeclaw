# Commodity Correlation Momentum - Source Audit

Date: 2026-08-30

Task: TC-268

Candidate: `how-to-improve-commodity-momentum-using-intra-market-correlation`

Stage: source-audited

Disposition: verified no-go; do not preregister or calculate returns for an
exact replay from the currently available source and data

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The public author
methodology describes an understandable four-ETF monthly momentum/reversal
switch, but it does not supply a reproducible, authorized input package or a
complete causal and cost specification.

The study says it used Yahoo Finance adjusted closes. The current author page
also says that Yahoo Finance discontinued free end-of-day downloads. Yahoo's
current Terms of Service prohibit automated collection without express prior
permission. TradeClaw has no such permission and no immutable authorized copy
of the four histories. Replacing Yahoo with the page's current sponsored
EODHD suggestion, Stooq, or another present-day vendor would change the data
provider, adjustment process, and vintage. That would be a new hypothesis, not
an exact replay.

The exact eight-page paper could not be acquired: both browser extraction and
direct local retrieval of SSRN's delivery endpoint returned HTTP 403. No PDF
bytes exist locally, so no PDF hash, page render, or full-document verification
is claimed. The SSRN abstract and the authors' public Quantpedia methodology
remain useful source evidence, but they do not resolve the missing execution,
cost, and input rules.

This is a source-audit no-go, not a TradeClaw performance FAIL. No price series
or returns were downloaded or inspected. No preregistration, result artifact,
marketing draft, prospective claim, or activation state was created.

## Selection and receipt gate

TC-268 was selected manually by receipt-neutral feasibility triage inside the
`2026-08-30T15:00:00.000Z/PT3H` window. At
`2026-08-30T15:00:18.430Z`, the window was awaiting a receipt, TC-267 was the
latest prior receipt, and the ledger contained twelve receipts across eleven
windows. The only duplicate was the explicitly expected historical
`2026-08-29T06:00:00.000Z/PT3H` window. Four marketing handoffs existed, none
belonged to the current window, and none was approved.

The screen preferred a small liquid universe, monthly cadence, an observable
regime variable, direct turnover and short-cost questions, and a possible
post-publication period. It did not rank candidates by catalog Sharpe,
t-statistic, volatility, years tested, or a live clone result. TC-268 is the
one allowed receipt for the 15:00Z window. Returns remained closed throughout
the audit.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Zero-based catalog position: `24`; one-based row: `25`
- Pinned catalog metadata: gross Sharpe `0.65`, t-statistic `2.8`, volatility
  `8.7%`, and `19` years tested
- Catalog treatment: gross-of-trading-costs discovery metadata only; none of
  those figures is TradeClaw performance evidence
- Discovery page:
  <https://paperswithbacktest.com/strategies/how-to-improve-commodity-momentum-using-intra-market-correlation>
- Primary paper: Radovan Vojtko and Margaréta Pauchlyová, "How to Improve
  Commodity Momentum Using Intra-Market Correlation," September 16, 2024
- SSRN abstract: <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4964417>
- DOI: <https://doi.org/10.2139/ssrn.4964417>
- Author methodology:
  <https://quantpedia.com/how-to-improve-commodity-momentum-using-intra-market-correlation/>
- Author presentation transcript:
  <https://www.linkedin.com/posts/quantpedia_quantpedia-explains-trading-strategies-activity-7243866882598965248-Ucre>
- Yahoo Terms of Service:
  <https://legal.yahoo.com/xw/en/yahoo/terms/otos/index.html>
- Paper record: eight pages, posted to SSRN on October 29, 2024
- Exact PDF acquisition: blocked by HTTP 403; zero bytes retained
- Exact document SHA-256: unavailable and not claimed
- Public author replication package found: no
- Historical market-data redistribution rights established: no

SSRN's abstract page labels the paper all-rights-reserved and disallows reuse
without permission. No paper, discovery HTML, author article, vendor data, or
market observations are redistributed in this repository.

## Publicly described strategy

The author methodology describes this outline:

- universe: four US-listed commodity-sector ETFs, `DBA` agriculture, `DBB`
  base metals, `DBE` energy, and `DBP` precious metals;
- input: Yahoo Finance daily adjusted closes beginning in 2007, from which
  daily and monthly returns were calculated;
- cadence: monthly, equally weighted, with positions held for one month;
- ranking study: one- through twelve-month momentum variants;
- final ranking: trailing twelve-month performance;
- momentum sleeve: long the two top-ranked ETFs and short the two bottom-ranked
  ETFs;
- reversal sleeve: long the two bottom-ranked ETFs and short the two top-ranked
  ETFs;
- regime signal: calculate all six pairwise daily-return correlations, average
  them over a short 20-trading-day window and separately over a long
  250-trading-day window;
- when the short average exceeds the long average, use momentum; and
- when the short average is lower than the long average, use reversal.

This outline is enough to identify the economic idea. It is not enough to bind
the exact historical order and return ledger.

The public presentation attributes roughly `14%` annual return, `16%`
volatility, `-27%` maximum drawdown, Sharpe near `0.8`, and Calmar near `0.5`
to the combined study. Those are upstream gross discovery claims. They were
not recalculated, cost-adjusted, or treated as a TradeClaw result.

## Rule ambiguities

The public sources do not freeze:

- the exact last date and complete observation manifest of the paper sample;
- whether twelve-month momentum skips the most recent month;
- the exact month-end signal timestamp and exchange calendar;
- whether adjusted close is observed at the same close used for a fill;
- a next-session open, close, volume-weighted, or other executable fill;
- the treatment when the short and long average correlations are equal;
- correlation handling for zero variance, missing observations, or unequal
  calendars;
- price-return versus total-return construction beyond the vendor's mutable
  adjusted-close field;
- ranking ties and numerical precision;
- listing, suspension, stale-price, delisting, and corporate-action policies;
- whether the first eligible portfolio requires exactly 250 daily observations
  plus twelve complete calendar months;
- gross-exposure normalization, cash collateral, fractional shares, and
  rebalancing tolerance; or
- whether a monthly position is maintained unchanged between rebalances.

Choosing any of those rules after opening returns would create researcher
degrees of freedom. Choosing them before returns could define an independent
causal hypothesis, but could not make it the exact cited study.

## Input provenance audit

The intended input source is named, but decisive bytes are not supplied:

- no data files or immutable row manifest accompany the paper;
- no provider query, retrieval timestamp, timezone, or response hash is frozen;
- no corporate-action or adjusted-close vintage is frozen;
- no public author code or deterministic signal/order ledger is supplied;
- the author page now says Yahoo free end-of-day downloads were discontinued;
- Yahoo's current Terms prohibit automated collection without express prior
  permission, and no permission for this TradeClaw job is present;
- no authorized Yahoo, EODHD, Stooq, exchange, or other four-ETF dataset is
  present in the repository; and
- redistribution rights for any decisive market input have not been
  established.

The fact that another vendor may sell or display similar prices does not prove
byte equivalence. Adjustments for fund distributions, splits, corrections,
missing sessions, and vendor history repairs can change both twelve-month
ranks and correlation regimes. A current-vintage substitute would need its own
provider rights, exact hashes, frozen transforms, and evidence-basis label.

## Cost and execution audit

The described portfolio is market neutral in count but requires two long and
two short ETF positions. The source supplies no complete implementation model
for:

- commissions and regulatory fees;
- bid/ask spread and slippage;
- short borrow availability, recalls, and borrow rates;
- short-sale constraints and uptick handling;
- cash collateral yield and debit financing;
- fund expense ratios and distribution treatment;
- market impact or capacity;
- turnover generated by rank and regime changes; or
- a trade ledger to which any cost can be charged.

The repository's existing shared friction schedules cover cryptocurrencies,
FX, and metals, not a US-listed long/short ETF portfolio. Inventing an ETF
schedule after looking at performance is disallowed. Without a causal order
ledger and frozen full friction model, neither net return nor break-even cost
can be calculated.

The author presentation's approximately `14%` return is therefore not cost
headroom. It cannot support a pass, recommendation, marketing claim, or
prospective-review eligibility decision.

## Validation audit

Neither the paper record nor the public methodology supplies the TradeClaw
falsification structure required for a historical performance claim:

- no protocol hash frozen before returns;
- no fixed chronological folds or minimum positive-fold rule;
- no untouched post-publication holdout;
- no external falsification universe;
- no benchmark gate against plain momentum, plain reversal, equal-weight
  commodities, and cash;
- no cost-stress or borrow-stress gates;
- no minimum regime and trade counts; and
- no deterministic replay artifact binding inputs, signals, fills, costs, and
  outputs.

September 2024 through July 2026 would provide only about 22 complete monthly
observations. It could be reserved in a new study, but it is not a sufficiently
specified holdout in the source and was not opened here.

## Reproducibility blockers

- Exact eight-page primary-paper bytes could not be acquired or hashed.
- No public author replication package, code, dataset manifest, or order
  ledger was found.
- The cited Yahoo adjusted-close histories are not supplied as immutable
  inputs.
- Yahoo free end-of-day download is now discontinued according to the author
  page.
- Yahoo automated collection requires express prior permission under its
  current Terms, and no permission is present for this job.
- No authorized equivalent four-ETF dataset is present in the repository.
- Substituting a current vendor would change source, adjustment process, and
  vintage.
- The causal month-end signal-to-fill convention is not supplied.
- Equality, tie, warm-up, missing-data, stale-price, and corporate-action rules
  are not supplied.
- The gross and net exposure, cash collateral, and rebalance tolerance are not
  fully supplied.
- No commission, spread, slippage, short-borrow, financing, expense, or impact
  model is supplied.
- No turnover-linked trade ledger or break-even cost is supplied.
- No preregistered chronological folds, post-publication holdout, external
  falsification market, or deterministic pass gate is supplied.
- Only about 22 complete post-paper months would be available through July
  2026 for a newly frozen monthly holdout.

## Gate outcome

- Primary abstract access: pass; the SSRN record and DOI identify the paper.
- Exact primary-document access: fail; SSRN delivery returned HTTP 403 and no
  PDF bytes were obtained.
- Author methodology access: pass; the authors' public article and presentation
  expose the economic outline.
- Exact rule clarity: fail; causal timing and deterministic edge-case rules are
  incomplete.
- Input provenance: fail; no immutable authorized four-ETF input package is
  supplied or present.
- Provider automation permission: fail for this job; no express Yahoo
  permission is present.
- Data substitution equivalence: fail; EODHD, Stooq, or another vendor would
  create a new input vintage and hypothesis.
- Complete cost evidence: fail; short borrow, financing, spread, slippage, and
  turnover-linked costs are absent.
- Causal execution: fail; signal availability and fill timing are unspecified.
- Chronological falsification: fail; folds, gates, holdout, and external
  falsification are not frozen.
- TradeClaw return inspection: none.
- Performance verdict: none; stage is `source-audited`, verdict is
  `not-tested`.
- Next action: archive this exact-source no-go. Any independent commodity ETF
  correlation-switch study must begin in a later receipt window with an
  authorized immutable dataset and a separately hashed protocol freezing
  transforms, fills, full costs including borrow and financing, controls,
  folds, and holdout before returns are opened.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff,
signal, allocation, broadcast, broker/execution action, billing change, or
trading activation occurred.
