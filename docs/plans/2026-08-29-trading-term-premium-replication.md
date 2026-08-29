# Trading the Term Premium Replication Preregistration

Frozen at: 2026-08-29T12:00:00.000Z

Cycle: `2026-08-29T12:00:00.000Z/PT3H`

Task: TC-259

Candidate: `trading-the-term-premium`

Status: frozen before local return construction

## Research question

Does the paper's simple U.S. 40-month moving-average term-spread allocation
remain positive, stable, and better than identically costed one-month and
ten-year modeled zero-coupon benchmarks after explicit monthly-roll friction,
including in a post-publication holdout?

This is a current-vintage independent modeled replication. It is not the
Papers With Backtest implementation, an ACM or hidden-Markov replication, an
executable-CUSIP backtest, live performance, financial advice, or authority to
trade.

## Frozen sources

### Primary paper

- Luke van Schaik, Emlyn Flint, and Florence Chikurunhe, "Trading the Term
  Premium," November 2022
- SSRN: <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4324696>
- DOI: <https://doi.org/10.2139/ssrn.4324696>
- Audited PDF SHA-256:
  `867fe06c98fb89d8d7139ec778eaf0367adfad45a86edde4a95d85e1f0deabc0`
- PDF redistribution rights established: no; the document is not committed
- Source audit:
  `docs/research/2026-08-29-trading-term-premium-source-audit.md`

### Curve source

- Board nominal curve page:
  <https://www.federalreserve.gov/data/nominal-yield-curve.htm>
- Complete downloaded CSV SHA-256:
  `877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7`
- Frozen repository snapshot:
  `docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv`
- Frozen snapshot SHA-256:
  `29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041`
- Frozen snapshot bytes/rows: `311,362` / `782`
- Preparation:
  `scripts/research/prepare-trading-term-premium-input.mjs`

Hashes are over canonical LF bytes. The runner must reject any mismatch.

### Cost source

- Federal Reserve Bank of New York Staff Report 1170, November 2025:
  <https://www.newyorkfed.org/research/staff_reports/sr1170.html>
- Audited PDF SHA-256:
  `4f1de719e9890abd9f0c67442bbce80107c98a28cdcf88e4b2f98c0a76d93113`
- PDF redistribution rights established: no; the document is not committed

The cost source is a modern benchmark for the modeling surcharge, not a
historical fill series.

## Frozen input schema and selection

The CSV header is exactly:

```text
Date,BETA0,BETA1,BETA2,BETA3,TAU1,TAU2,SVENY01,...,SVENY30
```

- Retain the last row with six valid curve parameters in each calendar month.
- Exclude August 2026 because the month was incomplete at freeze time.
- Do not choose a later all-`NA` row over an earlier valid row in a month.
- Dates are ISO calendar labels. No intraday timestamp or timezone conversion
  is introduced.
- Rows must be consecutive by calendar month from `1961-06` through `2026-07`.
- Nelson-Siegel rows require exactly `BETA3 = 0` and `TAU2 = -999.99`; the
  second curvature term is omitted.
- Svensson rows require positive `TAU2` and include the second curvature term.
- `TAU1` must always be positive.
- `SVENY01..SVENY30` may be `NA`; parameters may not.
- Preserve source decimal strings and supplied-yield `NA` values exactly.
- No interpolation, row deletion, curve adjustment, parameter rounding, or
  post-result source reconciliation is allowed.

Expected inventory is `223` Nelson-Siegel and `559` Svensson rows. There are
`18,334` available supplied-yield checks, `122` missing supplied ten-year
fields, and the first supplied ten-year field occurs on `1971-08-31`.

## Frozen curve math

For maturity `m` years:

```text
A(x) = (1 - exp(-x)) / x

NS yield(m) = beta0
            + beta1 * A(m / tau1)
            + beta2 * (A(m / tau1) - exp(-m / tau1))

NSS yield(m) = NS yield(m)
             + beta3 * (A(m / tau2) - exp(-m / tau2))

P(date, m) = exp(-(yieldPct(date, m) / 100) * m)
```

Yields are continuously compounded percentage points. Every price must be
finite and strictly positive.

## Frozen calendar and windows

- A decision at month end `t` determines the sleeve for outcome month `t+1`.
- Full independent outcomes: `1968-01` through `2026-07`, exactly `703`.
- Paper comparison: `1968-01` through `2021-01`, exactly `637`.
- Bridge, reported but ungated: `2021-02` through `2023-01`, exactly `24`.
- Post-publication holdout: `2023-02` through `2026-07`, exactly `42`;
  decisions are `2023-01` through `2026-06`.
- Four paper-window folds use floor boundaries and are exactly:
  - `1968-01..1981-03`, `159` outcomes;
  - `1981-04..1994-06`, `159` outcomes;
  - `1994-07..2007-09`, `159` outcomes;
  - `2007-10..2021-01`, `160` outcomes.
- No equity or state carries across a reported window or fold; each metric is
  recomputed from the same already-causal monthly observation sequence.
- The natural 40-month-warmup history before 1968 may be reported only as an
  ungated diagnostic. It cannot alter the paper window or verdict.

## Frozen signal

For every retained month end `t`:

```text
spread[t] = yield(t, 10 years) - yield(t, 0.25 years)
canonicalAverage[t] = mean(spread[t-39..t])
canonicalHigh[t] = spread[t] > canonicalAverage[t]
```

An exact equality is low duration. The comparison is made only from data
available at decision `t`; future rows cannot alter a prior decision.

The canonical full-outcome inventory must be `341` high, `362` low, and `50`
regime transitions. Paper-window fold high/low inventories must be `84/75`,
`99/60`, `52/107`, and `67/93`. Bridge must be `18/6` with one transition.
Holdout must be `21/21` with one transition.

### Ungated ambiguity sensitivity

Also calculate, without decision authority:

```text
priorOnlyAverage[t] = mean(spread[t-40..t-1])
priorOnlyHigh[t] = spread[t] > priorOnlyAverage[t]
```

Its full inventory must be `335` high, `368` low, and `48` transitions. The two
conventions may disagree only for outcomes `1980-10`, `1990-09`, `2015-01`,
`2015-08`, `2024-11`, and `2024-12`. This lane is never eligible to replace the
canonical gate inputs.

## Frozen return construction

Every month is a separate equal-notional maturity reset. There is no leverage,
volatility targeting, financing overlay, short position, parameter search, or
result-dependent sizing.

### Ten-year sleeve

At decision `t`, buy a modeled 120-month zero-coupon bond and value the same
position one month later as a 119-month zero:

```text
grossLog10y = ln(P[t+1, 119/12 years]) - ln(P[t, 10 years])
```

### One-month sleeve

At decision `t`, buy a modeled one-month zero and redeem it at par:

```text
grossLog1m = -ln(P[t, 1/12 year])
```

The canonical strategy selects `grossLog10y` when `canonicalHigh[t]` is true
and `grossLog1m` otherwise. Always-ten-year and always-one-month benchmarks use
the corresponding return every month. The prior-only sensitivity selects the
same sleeves from its separate frozen signal.

Every 120-month, 119-month, one-month, ten-year, and three-month quantity is
calculated from curve parameters. The first `44` paper-window outcomes are
outside the source's supplied ten-year comparison horizon and must remain
labeled fitted/extrapolated modeled curve observations.

## Frozen costs

For adverse per-side proportional surcharge `c`:

```text
entryPenalty(c) = ln(1 + c)
exitPenalty(c) = -ln(1 - c)
roundTripPenalty(c) = entryPenalty(c) + exitPenalty(c)
```

- Gross control: `c = 0`, reported and ungated.
- Headline: `c = 0.0005` (`5` bp per side).
- Stress: `c = 0.00125` (`12.5` bp per side).
- Ten-year monthly roll pays entry plus exit every month.
- One-month sleeve pays entry every month and no synthetic exit because it
  redeems at par.
- The identical penalty schedule applies to the canonical strategy,
  prior-only sensitivity, always-ten-year benchmark, and always-one-month
  benchmark.
- Costs are charged every month even when the signal regime is unchanged.
- No commission, tax, custody, financing, market impact, or management fee is
  modeled. These omissions must remain beside every result.

## Frozen metrics

For each lane/window report:

- observation count and inclusive month range;
- high/low counts and regime transitions where applicable;
- mean gross, headline-net, and stress-net log return;
- compounded return as `exp(sum(logReturns)) - 1`;
- sample standard deviation;
- annualized Sharpe as `sqrt(12) * mean / sampleStandardDeviation`;
- positive-month fraction;
- maximum drawdown from the sequential monthly log-return wealth path;
- four paper-window fold receipts;
- paired headline-net compounded and mean-log differences between the
  canonical strategy and each benchmark.

Empty, null, or non-finite metrics fail closed.

## Standing QA gates

Any standing failure makes `results: null`, leaves performance gates
unevaluated, and returns verdict `INCONCLUSIVE`:

1. the canonical input, source-audit, and preregistration hashes match;
2. the header, field count, trailing LF, dates, and month continuity are exact;
3. row, date, NS/NSS, supplied-yield, missing-ten-year, and first-ten-year
   inventories match this document;
4. every parameter and calculated price is finite, active taus are positive,
   and NS sentinels are exact;
5. every available supplied annual yield reconstructs within `0.0005`
   percentage point (`0.05` basis point); missing supplied fields remain `NA`;
6. full/paper/bridge/holdout and fold counts match exactly;
7. canonical and prior-only regime inventories and their six disagreement
   outcomes match exactly;
8. an exact equality is classified low and future input cannot change a prior
   signal (prefix invariance);
9. all cost penalties are applied by sleeve every month as frozen;
10. a separate canonical rerun produces byte-identical trailing-LF JSON.

The tolerance was selected from full-source reconstruction QA before returns.
It cannot be relaxed, tightened, or bypassed after seeing performance.

## Performance decision

After QA passes, `PASS` requires every gate below. Otherwise verdict is `FAIL`.

### Full-window gates

1. Canonical headline-net compounded return is greater than zero.
2. Canonical headline-net compounded return is greater than the identically
   costed always-one-month benchmark.
3. Canonical headline-net annualized Sharpe is greater than the identically
   costed always-ten-year benchmark.
4. Canonical headline-net maximum drawdown is strictly lower than the
   identically costed always-ten-year benchmark.

### Paper-fold stability gate

At least three of four paper-window folds must satisfy both:

1. canonical headline-net compounded return is greater than the identically
   costed always-one-month benchmark; and
2. canonical headline-net annualized Sharpe is greater than the identically
   costed always-ten-year benchmark.

### Holdout gates

All four must pass over `2023-02..2026-07`:

1. canonical headline-net compounded return is greater than zero;
2. canonical headline-net compounded return is greater than the identically
   costed always-one-month benchmark;
3. canonical headline-net annualized Sharpe is greater than the identically
   costed always-ten-year benchmark; and
4. canonical headline-net maximum drawdown is strictly lower than the
   identically costed always-ten-year benchmark.

The gross source comparison, stress result, bridge, natural warmup, prior-only
sensitivity, paper table values, and upstream catalog values are reported but
cannot rescue, replace, or tune the canonical verdict.

A historical `PASS` sets only `eligibleForProspectiveReview: true`. Every
verdict fixes `activationApproved`, `publicationApproved`,
`allocationApproved`, `broadcastApproved`, and `executionApproved` to `false`.

## Required outputs

- Pure assembly: `scripts/research/trading-term-premium-assembly.ts`
- Thin runner: `scripts/research/trading-term-premium-replication.ts`
- Focused tests:
  `scripts/research/__tests__/trading-term-premium-assembly.test.ts`
- Canonical artifact:
  `docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json`
- Human-readable result:
  `docs/research/2026-08-29-trading-term-premium-replication-result.md`
- Typed intake/source-audit overlay, protected admin projection, server-owned
  human-review draft, complete experiment shelf, append-only registry, and
  `STATE.yaml` receipt after the result exists

## Safety boundary

The implementation may read only the frozen repository snapshot and frozen
documents and write only the research artifact/result and their local intake
metadata. It must not alter public/admin UI, authentication, PostgreSQL, Docker,
dependencies, signals, presets, allocation, broadcast, broker/execution
behavior, billing, sponsored access, or scheduling. It must not push, merge,
deploy, publish, auto-post, or activate trading.
