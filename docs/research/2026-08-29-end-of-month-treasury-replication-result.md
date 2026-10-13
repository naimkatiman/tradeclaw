# End-of-Month Treasury Replication Result

Date: 2026-08-29

Task: TC-257

Candidate: `predictable-end-of-month-treasury-returns`

Verdict: **INCONCLUSIVE**

Eligible for prospective review: no

Performance gates evaluated: no

## Outcome

The replication stopped at the frozen source-consistency gate. No five-year,
ten-year, one-year, placebo, all-other-days, holdout, fold, cost-adjusted, or
external-control performance result is published from this protocol.

The official curve snapshot passed its exact hash, schema, date, count, monthly
cadence, and financing-coverage checks. It failed one of 27,453
parameter-to-supplied-yield comparisons:

| Check | Frozen limit | Observed |
|---|---:|---:|
| Maximum absolute yield reconstruction error | 0.0001 percentage point (0.01 bp) | 0.000300749306 percentage point (0.0300749306 bp) |
| Comparisons over the limit | 0 | 1 of 27,453 |
| Date | - | 2013-10-16 |
| Maturity | - | 5 years |
| Reconstructed yield | - | 1.433300717834% |
| Supplied `SVENY05` | - | 1.432999968529% |

The discrepancy is economically tiny and may be a rounding or source-table
inconsistency, but the tolerance was deliberately frozen before the historical
calculation. Relaxing it, deleting the row, substituting the supplied integer
yield, or publishing the already-gated performance series after observing the
failure would violate the preregistration. The retained artifact therefore has
`results: null`, `observations: null`, and
`performanceGatesEvaluated: false`.

INCONCLUSIVE is not FAIL: this run does not establish that the month-end idea
loses after costs. It also is not PASS: there is no TradeClaw return, Sharpe,
holdout, fold, or cost-headroom result to promote.

## Frozen evidence

- Preregistration:
  `docs/plans/2026-08-29-end-of-month-treasury-replication.md`
- Preregistration canonical SHA-256:
  `4e3d9ed5392aa9cbe8eed9865483f583a31336c6cc770e9773230f4fe829b3de`
- Source audit:
  `docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md`
- Source-audit canonical SHA-256:
  `3df7f04b4ef3d94a1fe245bf61262f7cfe41dc2582bdb748162ee1dbb086c127`
- Canonical artifact:
  `docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json`
- Artifact SHA-256:
  `f8707913da4714c967d58f0fd2630c5f2316d6c5ede53507340ad54f35af36cf`

## QA receipt

| Gate | Receipt |
|---|---|
| Nominal source hash | PASS |
| DFF source hash | PASS |
| Broad-dollar source hash | PASS |
| Strict headers, finite values, increasing dates | PASS |
| Nominal curve rows | PASS: 9,151 |
| Evaluation months | PASS: 439 |
| Paper window | PASS: 348 months, 1990-01 through 2018-12 |
| Holdout | PASS: 91 months, 2019-01 through 2026-07 |
| Curve days per month | PASS: 17-23 |
| Consecutive financing days | PASS: 13,392 |
| External matched months | PASS: 243 total / 90 holdout |
| Supplied-yield reconstruction | **FAIL: one comparison above frozen tolerance** |
| Standing QA | **FAIL** |

The runner writes the QA-only artifact because INCONCLUSIVE is an evidence
outcome worth retaining. It does not reinterpret a data-integrity failure as a
strategy result.

## Cost contract retained but not evaluated

The unopened performance protocol remains exactly as frozen:

- five-year primary position over the final two trading intervals;
- DFF ACT/360 financing proxy;
- 5 bp headline round trip;
- 10 bp plus 100 bp annual financing-spread stress;
- ten-year confirmation and one-year duration control;
- identically costed first-window placebo and all-other-days benchmark;
- four chronological folds and 2019-2026 holdout;
- matched broad-dollar external falsification market.

None of these gates received a PASS or FAIL value from this run.

## Marketing handoff

Human-review draft only:

> We tried to independently reproduce a low-turnover month-end Treasury study,
> but the run stopped before performance evaluation. One of 27,453 official
> curve consistency checks missed our preregistered 0.01 bp tolerance, at 0.0301
> bp. We kept the outcome INCONCLUSIVE rather than loosening the rule after
> seeing the data. No return, holdout, or tradability claim was produced.

`publishApproved` remains false. No queue write or outbound post occurred.

## Next research action

Do not modify or rerun this frozen protocol as if it had passed QA. A later
cycle may create a separately hashed preregistration that either obtains the
authors' original curve vintage or explicitly defines a source-consistency
policy around supplied yields and rounded Svensson parameters. That new work
must retain this INCONCLUSIVE receipt and may not overwrite it.

## Safety receipt

No public/admin UI, authentication, database, Docker, dependency, signal,
preset, allocation, broadcast, broker/execution, billing, or sponsored-access
behavior changed. Nothing was pushed, merged, deployed, published, auto-posted,
or activated.
