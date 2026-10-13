# When Factor Timing Makes Sense - Source Audit

Date: 2026-08-30

Task: TC-267

Candidate: `when-factor-timing-makes-sense`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact historical replay of
the paper or the Papers With Backtest clone

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. Farzin Barekat's
paper develops theoretical factor-timing bounds and illustrates them with
synthetic Monte Carlo experiments. It is not a historical ETF backtest and it
does not define the nine-ETF strategy displayed by Papers With Backtest.

The paper's favorable multi-factor experiment grants a clairvoyant investor
perfect knowledge of the current period's synthetic correlation matrix. It
draws a new matrix independently each period, assumes identical unit-Sharpe
synthetic factors with zero long-run pairwise correlation, and then solves a
nonnegative maximum-ex-ante-Sharpe allocation. The paper supplies no actual
factor universe, historical factor returns, causal estimator for the current
correlation matrix, tradable instrument map, or public replication package.

The clone adds material choices that cannot be recovered from the paper. Its
page labels a weekly `1990-2026` ETF study, declares nine long positions, names
`ETFs Daily Price`, and hides the pseudocode. The paper never names those ETFs,
an estimation window, a portfolio initialization rule, a signal timestamp, or
a fill convention. Even the clone dataset's visible SPY example begins on
`1993-01-29`, so the page does not explain how the labeled period before that
date is represented.

This is a source-audit no-go, not a TradeClaw performance FAIL. No
preregistration, historical return series, result artifact, marketing draft,
or prospective claim was created. A causal ETF correlation-timing experiment
would be a materially new hypothesis and must receive a separately hashed
protocol before any returns are opened.

## Selection and receipt gate

TC-267 was selected by receipt-neutral feasibility triage inside the
`2026-08-30T12:00:00.000Z/PT3H` window. At
`2026-08-30T12:00:37.571Z`, the new window was awaiting a receipt, TC-266 was
still latest, and the ledger contained eleven receipts across ten windows. The
only duplicate was the explicitly expected historical
`2026-08-29T06:00:00.000Z/PT3H` window. Four marketing handoffs existed, none
belonged to the current window, and none was approved.

The screen preferred a public primary PDF and an auditable paper/clone
specification mismatch. It did not rank candidates by catalog Sharpe,
t-statistic, volatility, years, or the clone's live displayed outcome. TC-267
is the one allowed receipt for the 12:00Z window. Returns remained closed
throughout the audit.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Zero-based catalog position: `41`; one-based row: `42`
- Pinned catalog metadata: gross Sharpe `0.74`, t-statistic `4.5`, volatility
  `10.4%`, and `37` years tested
- Catalog treatment: gross-of-trading-costs discovery metadata only; none of
  those figures is TradeClaw performance evidence
- Discovery page:
  <https://paperswithbacktest.com/strategies/when-factor-timing-makes-sense>
- Primary paper: Farzin Barekat, "When Factor Timing Makes Sense," April 17,
  2019
- UCLA CAM report PDF:
  <https://ww3.math.ucla.edu/camreport/cam19-25.pdf>
- UCLA CAM report index:
  <https://ww3.math.ucla.edu/cam-reports-2001-2020/>
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3359438>
- DOI: <https://doi.org/10.2139/ssrn.3359438>
- Retrieved document: valid `%PDF-1.5`, `17` pages, `329,703` bytes
- Retrieved document SHA-256:
  `ec0fa6b72f6567a70c38d01b95933eaa5b5dbb3a8e61668ad7f756698e87d93b`
- Public author replication package found: no
- Redistribution rights established: no

The primary PDF was acquired and hashed in memory for the audit. It was not
committed because redistribution rights were not established. No primary PDF,
discovery HTML, clone output, or market dataset is redistributed here.

## What the paper actually studies

The paper asks when changing a factor allocation in response to time-varying
conditions can materially improve Sharpe ratio. It first studies one strategy
whose conditional Sharpe ratio can occupy different states. It then studies a
portfolio of synthetic strategies whose instantaneous correlations vary while
their long-run correlations are zero.

The central comparison is between a passive investor and a clairvoyant
investor. The clairvoyant investor observes the relevant current state or
correlation matrix before allocating. This is useful for a theoretical upper
bound, but it is not a causal signal available to a historical implementation.
The source does not estimate those states from lagged public observations or
test whether such an estimator forecasts investable returns.

The figures use a weekly illustration with `delta t = 1/52`. Weekly frequency
is a simulation setting, not an executable ETF schedule. The paper provides no
market calendar, timestamp convention, stale-price policy, or order timing.

## Single-strategy result

For one strategy, the paper assumes the Sharpe ratio in each state is known to
the clairvoyant investor. The passive investor keeps constant exposure; the
clairvoyant investor changes exposure with the state.

The theoretical comparison says modest variation in a positive conditional
Sharpe ratio creates only modest timing value. Large improvement requires very
different state Sharpe ratios or the ability to identify negative expected
returns and short. The paper does not provide a real-time state variable,
estimation window, decision threshold, tradable asset, borrow rule, or causal
forecast test. The result is therefore a bound under assumed information, not
a backtest recipe.

## Multi-factor Monte Carlo result

The multi-factor section introduces `N` synthetic strategies. Each has an
assumed Sharpe ratio of `1`, and their long-run pairwise correlations are
assumed to be zero. For each period, the simulation independently samples a
valid `N x N` correlation matrix from a bounded family whose off-diagonal
entries lie between `-rho` and `rho`.

At the start of the period, the clairvoyant investor is assumed to know that
period's entire correlation matrix. It then maximizes ex-ante Sharpe subject to
nonnegative allocations. The paper generates admissible matrices through a
Monte Carlo acceptance-rejection method and compares the resulting theoretical
Sharpe improvement with passive allocation.

The simulated figures suggest that timing becomes more interesting with a
large number of factors, roughly more than ten in the illustrated settings.
For typical illustrated correlation bounds and fewer than eight factors, the
reported improvement remains below about 30%. These are outcomes of a
synthetic perfect-foresight experiment. They do not establish that a
nine-instrument ETF portfolio has the same factor count, distribution,
information, or achievable improvement.

The paper does not supply:

- historical factor or ETF return observations;
- an investable definition of the synthetic factors;
- a causal estimator for the current period's correlation matrix;
- an estimation lookback, shrinkage rule, or positive-definite repair policy;
- an initialization and missing-history policy;
- deterministic optimization code, tolerances, or tie handling; or
- a public simulation seed and replication package.

## Source and clone mismatch

The observed Papers With Backtest page exposes these clone facts:

- cadence: weekly;
- markets: derivatives;
- dataset: `ETFs Daily Price`;
- labeled period: `1990-2026`;
- declared portfolio: nine long ETF positions;
- eight tickers visible before `Show all 9`: `DBC`, `EEM`, `GLD`, `IWM`, `LQD`,
  `QQQ`, `SPY`, and `TLT`; and
- pseudocode: not publicly inspectable.

At audit time the live page displayed `$100,000` growing to `$1,375,637`, a
`7.23%` annual return, Sharpe `0.73`, volatility `10.24%`, and maximum drawdown
`38.77%`. These changing page values are recorded only to identify the clone.
They are upstream discovery output, are not reproduced by TradeClaw, and are
not used in the no-go decision.

The associated dataset page describes daily OHLCV data. Its visible SPY
example starts on `1993-01-29`, after the clone's labeled `1990` start. The
public page does not disclose whether the earlier interval uses cash, a proxy,
backfilled history, a changing universe, or another rule. Nor does it disclose
the ninth position in the initially rendered table, complete historical
membership, adjusted-price construction, expense treatment, delisting policy,
or point-in-time availability.

The primary paper specifies none of these ETFs. It studies synthetic factors
and perfect current-period correlation knowledge, not a historical nine-ETF
portfolio. A clone implementation must therefore invent, at minimum, the
universe, factor mapping, lookback, correlation estimator, rebalance rule,
optimizer settings, missing-history behavior, cash policy, and fills. Hidden
code and dynamic page metrics cannot establish which choices were made.

## Input provenance audit

The source document itself is accessible and its exact retrieved bytes were
hashed. The decisive historical implementation inputs are not supplied:

- no actual factor return matrix is part of the paper;
- no immutable nine-ETF input manifest accompanies the clone;
- no point-in-time universe or listing-history policy is visible;
- no adjusted-price or distribution convention is frozen;
- no estimator input window or matrix-repair rule is specified;
- no clone code or deterministic output ledger is public; and
- no authorized historical dataset is present in this repository for TC-267.

Downloading present-day ETF histories would not make an exact replay. It would
open a new causal hypothesis whose data vintage, eligible universe, history
requirements, and survival treatment must be frozen before inspecting returns.

## Cost and execution audit

The paper recognizes that changing exposures can create turnover and
transaction-cost implementation challenges, but it does not model those costs.
It supplies no commission schedule, bid/ask observations, spread or slippage
assumptions, market impact, fund expenses, financing, borrow, taxes, or
turnover-linked order ledger.

The source also supplies no causal signal-to-fill convention. A weekly ETF
implementation would have to specify when correlation inputs become available,
whether the signal uses closes, whether orders fill at the same or next bar,
holiday and delayed-market handling, rebalancing thresholds, cash, fractional
shares, and stale or missing prices. Those choices affect both return and
turnover and cannot be inferred from a theoretical perfect-foresight model.

Without the clone's weights and trade ledger, no break-even cost can be
calculated. The clone's displayed Sharpe and return are not cost evidence and
must not be used as a feasibility pass.

## Validation audit

Neither the paper nor the public clone supplies the TradeClaw falsification
structure needed for a historical performance claim:

- no preregistration hashed before returns;
- no fixed chronological folds or minimum pass criteria;
- no untouched post-publication holdout;
- no external falsification universe;
- no deterministic replay artifact binding inputs, estimator, optimizer,
  fills, costs, and outputs; and
- no public implementation package from which those items can be recovered.

The Monte Carlo repetition is not chronological validation. It evaluates a
synthetic distribution under assumed perfect information rather than a causal
forecast on market data. The live `1990-2026` clone interval cannot be treated
as a holdout because its rules, inputs, and evaluation history are not frozen
for independent inspection.

## Reproducibility blockers

- The primary source is a theoretical and synthetic Monte Carlo study, not a
  historical ETF backtest.
- The favorable multi-factor investor has perfect knowledge of the current
  synthetic correlation matrix before allocating.
- No actual factor universe or investable instrument mapping is supplied.
- No historical factor or ETF return matrix is supplied by the paper.
- No causal point-in-time correlation estimator or lookback is specified.
- No initialization, missing-history, matrix-repair, shrinkage, or stale-data
  policy is specified.
- No deterministic optimizer settings, tolerances, tie handling, or fallback
  policy is supplied.
- The paper's synthetic `N`-factor experiment does not specify the clone's nine
  ETFs or establish that nine ETFs are nine independent unit-Sharpe factors.
- The clone hides its pseudocode and complete historical position ledger.
- The clone labels a `1990` start while its visible SPY dataset example begins
  on `1993-01-29`, with no public pre-history or cash policy.
- No causal signal timestamp or fill convention is supplied.
- No complete transaction-cost model or turnover-linked ledger is supplied.
- No immutable nine-ETF dataset manifest or authorized TC-267 dataset is
  present in the repository.
- No chronological folds, untouched holdout, or external falsification gate is
  supplied.
- No deterministic historical replay artifact or public replication package is
  supplied.

## Gate outcome

- Primary-source access: pass; a valid 17-page UCLA PDF was acquired and
  SHA-256 hashed in memory.
- Source redistribution: fail; rights were not established, so the PDF was not
  committed.
- Historical-strategy clarity: fail; the paper provides theoretical bounds and
  synthetic perfect-foresight simulations, not a causal ETF rule.
- Clone equivalence: fail; the clone adds an undisclosed nine-ETF historical
  implementation absent from the paper.
- Input provenance: fail; no factor-return matrix, immutable ETF manifest,
  estimator inputs, or public clone code is supplied.
- Cost evidence: fail; costs are acknowledged but no complete friction model or
  turnover ledger exists.
- Causal execution: fail; timestamps, fills, calendar policy, and missing-data
  behavior are unspecified.
- Chronological falsification: fail; no frozen folds, holdout, or external
  universe exists.
- Bounded exact implementation: fail; a runnable ETF version requires material
  new choices before any returns can be observed.
- Next action: archive this exact-source no-go. Any causal ETF
  correlation-timing study must begin as a separately hashed hypothesis with a
  frozen universe, estimator, lookback, fills, complete costs, chronological
  folds, and untouched holdout before returns.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff,
signal, allocation, broadcast, broker/execution action, billing change, or
trading activation occurred.
