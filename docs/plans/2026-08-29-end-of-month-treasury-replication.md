# End-of-Month Treasury Replication Preregistration

Date frozen: 2026-08-29

Task: TC-257

Candidate: `predictable-end-of-month-treasury-returns`

Status: frozen before local return construction

## Research question

Does the paper's final-two-trading-day U.S. Treasury effect remain positive,
stable, distinct from same-duration calendar controls, and large enough to
survive explicit financing plus execution friction in the current Federal
Reserve curve vintage?

This is an independent modeled replication of a hypothetical off-the-run
zero-coupon security. It is not the commercial ETF backtest on the discovery
page, not an executable CUSIP backtest, not live performance, and not authority
to trade.

## Frozen sources

### Primary paper

- Jonathan Hartley and Krista Schwarz, "Predictable End-of-Month Treasury
  Returns," November 22, 2019
- Institutional PDF:
  <https://rodneywhitecenter.wharton.upenn.edu/wp-content/uploads/2019/12/17-19.Schwarz.pdf>
- PDF SHA-256:
  `56403762378f606f595dcce11afcf1f1eaccf8810237c58999f653a230a32809`
- Source audit:
  `docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md`

### Input snapshots

Hashes below are over canonical LF bytes. Parsers must reject any mismatch.

| Input | Repository path | SHA-256 |
|---|---|---|
| Nominal curve | `docs/research/data/end-of-month-treasury/fed-nominal-svensson-1989-12-01-2026-07-31.csv` | `4fab6cf297594f77f6e1ccfa4fbd099b4eb17dc407c9611a488039da33c2c41f` |
| Financing proxy | `docs/research/data/end-of-month-treasury/DFF-1989-12-01-2026-07-31.csv` | `ea8b35582a3f88cc0a0d42ae94addc3d85aaf008d4bb574246dd8a83780db600` |
| External control | `docs/research/data/end-of-month-treasury/DTWEXBGS-2006-01-02-2026-07-31.csv` | `a3ac96e8eb53625936eb7fd9d14e181c10308ca1831db6ee0b58b35fdfafdb47` |

The nominal snapshot retains `Date`, six Svensson parameters, and supplied
`SVENY01`, `SVENY05`, and `SVENY10` fields. The financing snapshot is FRED DFF.
The external control is FRED DTWEXBGS. All are sourced from the Board of
Governors of the Federal Reserve System and retain a December 1989 buffer where
needed for the January 1990 all-other-days benchmark.

The complete downloaded nominal source SHA-256 is
`877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7`.
The raw broad-dollar export SHA-256 is
`88db7d787e99129e671015fcc581f3507d0a2c527804c285ab555c2b83cd8054`;
211 blank observations are deterministically removed from the retained file.

## Frozen calendar and samples

- Dates are ISO calendar dates and are treated as UTC labels. No intraday time
  or timezone conversion is introduced.
- Group curve observations by calendar month.
- A valid month must contain at least three retained curve observations.
- `E_m` is the final retained curve observation in month `m`.
- Evaluation starts `1990-01` and ends `2026-07`, exactly 439 months.
- Paper window: `1990-01` through `2018-12`, exactly 348 months.
- Post-publication holdout: `2019-01` through `2026-07`, exactly 91 months.
- August 2026 and all later observations are excluded.
- Four folds are consecutive equal-count slices using boundaries
  `floor(k * n / 4)`. For the 439-month primary series their inclusive ends are
  `1999-01`, `2008-03`, `2017-05`, and `2026-07`.
- The broad-dollar matched control requires exact values on all four nominal
  schedule dates. Four months (`2007-01`, `2010-12`, `2014-03`, `2021-12`) are
  excluded by that rule, leaving exactly 243 observations, including 90 in the
  holdout. Its equal-count fold ends are `2011-02`, `2016-04`, `2021-05`, and
  `2026-07`.

No row is forward-filled and no holiday, curve, financing, or control value is
invented.

## Frozen curve math

For maturity `n` years and parameters `beta0..beta3`, `tau1`, and `tau2`, use
the Svensson continuously compounded zero-coupon yield in percentage points:

```text
A(x) = (1 - exp(-x)) / x
y(n) = beta0
     + beta1 * A(n / tau1)
     + beta2 * (A(n / tau1) - exp(-n / tau1))
     + beta3 * (A(n / tau2) - exp(-n / tau2))
```

The unit-payment discount price is:

```text
P(date, n) = exp(-(y(date, n) / 100) * n)
```

All maturities in this protocol remain inside the supported observed curve
range. Use `365` days per year for the declining security maturity, matching the
paper. Use ACT/360 for financing.

## Frozen strategy lanes

### Primary five-year month-end lane

For each evaluation month:

1. Set entry to the third-to-last curve date, `E_m - 2` in observed trading-day
   order.
2. Buy one modeled five-year zero-coupon security at that date's curve close.
3. Hold the same security through the final curve date `E_m`.
4. At exit, price the remaining maturity
   `5 - calendarDays(entry, exit) / 365` from the exit curve.
5. Record the close-to-close log price return.
6. Subtract financing for every calendar date from entry inclusive to exit
   exclusive.
7. Apply the frozen round-trip transaction cost once.

There is no signal, sizing, leverage, volatility target, reinvestment choice,
or parameter search. Every month has one equal-notional observation.

### Ten-year confirmation

Repeat the identical schedule and calculations with initial maturity 10 years.
This is a frozen confirmation, not an alternative selected after seeing the
five-year result.

### One-year duration-specificity control

Repeat the identical schedule with initial maturity one year. The source claims
the effect grows with duration. The paper-window pre-friction means must order
`10-year > 5-year > 1-year`; the one-year lane is not eligible for promotion.

### Same-duration first-window placebo

For each month, buy the five-year zero on the first retained curve date and sell
the same security on the third retained curve date. This spans the same two
observed trading-day intervals as the primary lane. Apply identical financing
and transaction costs. The paired monthly difference is primary five-year net
log return minus placebo net log return.

### Paper all-other-days benchmark

For each month, buy a five-year zero at the previous month's final curve close
and sell the same security on the current month's primary entry close. Decline
its maturity by exact calendar days, finance every intervening calendar day,
and apply the same round-trip cost. The December 1989 buffer makes January 1990
available. This benchmark is reported separately because its holding horizon is
longer than the primary lane.

### Flat benchmark

Zero excess return, zero exposure, and zero transaction cost.

## Financing and costs

### Headline

- Financing proxy: each calendar day's DFF observation in percentage points.
- Financing log drag: `sum((DFF / 100) / 360)` over `[entry, exit)`.
- Bid-ask cost: 3 basis points for the full round trip.
- Slippage: 1 basis point per side.
- Total round-trip friction: 5 basis points, applied once as
  `log(1 - 0.0005)`.
- No commission, borrowing, management fee, leverage, or tax is modeled.

DFF is an unsecured overnight-rate proxy, not the paper's unavailable exact GC
repo series. That limitation must remain beside every result.

### Stress

- Total round-trip friction: 10 basis points, applied as `log(1 - 0.0010)`.
- Financing rate: DFF plus 100 basis points annualized on every calendar day.

### Return fields

For each observation retain:

```text
priceLogReturn
headlineFinancingLog
stressFinancingLog
preFrictionExcessLog = priceLogReturn - headlineFinancingLog
headlineNetLog = preFrictionExcessLog + log(1 - 0.0005)
stressNetLog = priceLogReturn - stressFinancingLog + log(1 - 0.0010)
```

The break-even round-trip cost is the exact constant cost that sets the mean
net log return to zero:

```text
breakEvenCostBps = (1 - exp(-mean(preFrictionExcessLog))) * 10,000
```

## External falsification market

Use the Federal Reserve nominal broad U.S. dollar index as a non-tradable
calendar control. On the exact nominal-curve dates, calculate:

- log index return from the first to the third retained curve date;
- log index return from the third-to-last to the last retained curve date;
- paired active return = month-end return minus first-window return.

No financing or transaction cost is attached because the index is diagnostic,
not an executable asset. It falsifies Treasury-specific calendar evidence only
when all three conditions hold over its full 243-month sample:

1. mean paired active return is positive;
2. its one-sided mean t-statistic is at least `1.645`;
3. at least three of four chronological folds have positive mean paired active
   return.

If the Treasury performance gates pass but this external condition is met, the
overall verdict is `INCONCLUSIVE`, not `PASS`.

## Frozen metrics

For every strategy/control lane and requested window report:

- observation count and date range;
- mean price, financing, pre-friction excess, headline net, and stress net log
  returns;
- compounded return as `exp(sum(logReturns)) - 1`;
- sample standard deviation;
- mean t-statistic using sample standard error;
- annualized Sharpe as `sqrt(12) * mean / sampleStandardDeviation`;
- positive-month fraction;
- maximum drawdown from the sequential monthly net wealth path;
- mean calendar holding days;
- break-even round-trip cost in basis points;
- four chronological fold receipts.

Paired differences use the same definitions on their per-month difference
series. Null or non-finite metrics fail closed.

## QA gates

Any QA failure or count mismatch makes the result `INCONCLUSIVE` before
performance gates are considered:

1. all three canonical input hashes match exactly;
2. headers are exact, dates are strictly increasing, and retained values are
   finite;
3. nominal input has exactly 9,151 rows from `1989-12-01` through `2026-07-31`;
4. evaluation contains exactly 439 months and 17-23 curve days per month;
5. DFF has exactly 13,392 consecutive calendar dates with no gap;
6. reconstructed 1-, 5-, and 10-year yields differ from supplied values by no
   more than `0.0001` percentage point on every retained curve row;
7. every price is positive and every exit maturity is positive;
8. every financing calendar day is present exactly once;
9. paper, holdout, fold, benchmark, placebo, and external-control counts match
   this document;
10. a separate replay produces byte-identical canonical JSON.

## Performance decision

After QA passes, `PASS` requires every condition below:

1. Five-year paper-window headline net mean is positive and its t-statistic is
   at least `1.645`.
2. Five-year full-sample and holdout headline net means are both positive.
3. At least three of four full-sample five-year folds have positive headline
   net means.
4. Five-year full-sample stress net mean is positive.
5. Five-year break-even round-trip cost is greater than 5 bp in both the paper
   window and holdout.
6. Five-year paper-window headline net annualized Sharpe exceeds the
   all-other-days benchmark's headline net annualized Sharpe.
7. The five-year paired month-end-minus-first-window headline net mean is
   positive with t-statistic at least `1.645` in the paper window and remains
   positive in the holdout.
8. Ten-year headline net mean is positive with t-statistic at least `1.645` in
   the paper window and is positive in the holdout.
9. Paper-window pre-friction means satisfy
   `10-year > 5-year > 1-year`.
10. The broad-dollar external falsification condition is not met.

If QA passes and any condition 1-9 fails, verdict is `FAIL`. If conditions 1-9
pass but condition 10 fails, verdict is `INCONCLUSIVE`. There is no parameter
retuning, alternate cost model, maturity substitution, date shift, exclusion,
or gate change after results. Any later correction must be labeled ungated and
cannot replace the frozen verdict.

A historical `PASS` sets only `eligibleForProspectiveReview: true`. It does not
create a live strategy. `activationApproved`, `publicationApproved`,
`allocationApproved`, and `executionApproved` remain `false` for every verdict.

## Required outputs

- Pure deterministic assembly:
  `scripts/research/end-of-month-treasury-assembly.ts`
- Thin file-reading/writing runner:
  `scripts/research/end-of-month-treasury-replication.ts`
- Focused tests:
  `scripts/research/__tests__/end-of-month-treasury-assembly.test.ts`
- Canonical artifact under `docs/research/experiments/`
- Human-readable result under `docs/research/`
- Exact artifact and preregistration hashes in the intake overlay and
  `STATE.yaml`
- A factual human-review marketing draft only after the result receipt exists;
  never an outbound publication action

## Safety boundary

The implementation may read only the three frozen repository inputs and write
only the research artifact/result/state overlay. It must not alter public or
admin UI, authentication, PostgreSQL, Docker, dependencies, signals, presets,
allocation, broadcast, broker/execution behavior, billing, sponsored access,
or scheduling. It must not push, merge, deploy, publish, auto-post, or activate
trading.
