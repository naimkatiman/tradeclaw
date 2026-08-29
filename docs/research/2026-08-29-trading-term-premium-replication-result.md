# Trading the Term Premium Replication - Result

Date: 2026-08-29

Task: TC-259

Candidate: `trading-the-term-premium`

Verdict: **FAIL**

Prospective-review eligibility: **no**

Activation, publication, allocation, broadcast, and execution approval: **no**

## Bottom line

The frozen U.S. term-spread timing rule produced a positive cost-adjusted curve
over the full 1968-2026 sample, but it did not meet the preregistered durability
standard.

Under the headline monthly-roll surcharge, the canonical strategy compounded
`+3,917.50%` over the full 703 months, versus `+2,545.94%` for always-ten-year
and `+996.53%` for always-one-month. Those cumulative full-history values pass
all four full-window gates. They do not rescue the result: only `1/4`
paper-window folds beat both frozen benchmarks, and the untouched 42-month
post-publication holdout returned `+10.35%` versus `+15.62%` for the identically
costed one-month sleeve.

The causal prior-only ambiguity control did not change the conclusion. It
returned `+13.70%` in the holdout, still below the same `+15.62%` one-month
benchmark, and was never allowed to replace the canonical gate inputs.

## Evidence receipt

- Source audit:
  `docs/research/2026-08-29-trading-term-premium-source-audit.md`
- Source-audit canonical SHA-256:
  `cef21d66d07f29fb32af67f542a482491c4ffd0e00b656ea79bdb9600e0f8965`
- Preregistration:
  `docs/plans/2026-08-29-trading-term-premium-replication.md`
- Preregistration canonical SHA-256:
  `74b138499e36ea55f03490069a3c3f3823e458997c4cb00daf82903bd3f6387b`
- Preregistration-only commit:
  `5dd2457215314edb12e7a0089818bc368b3dd69a`
- Frozen normalized input SHA-256:
  `29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041`
- Canonical artifact:
  `docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json`
- Artifact SHA-256:
  `e30db6b2cbd9f7e9865c0c6c65699c6f2dd2a772f43e449ff63e9120ee6fb18e`
- Artifact size: `966,688` bytes with exactly one trailing LF
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`

The canonical rerun was byte-identical at the same size and SHA-256. Its
ignored replay file was removed after comparison; the canonical artifact is
retained.

All returns below are deterministic modeled research from fitted
current-vintage yield curves. They are not observed security fills, broker
returns, a signal feed, or a profitability claim.

## Standing QA

All frozen standing gates passed before performance gates were evaluated.

| Gate | Receipt |
|---|---|
| Input, source-audit, and preregistration hashes | PASS: all exact |
| Strict schema, dates, and calendar-month continuity | PASS: 782 rows, 1961-06-30 through 2026-07-31 |
| Curve modes | PASS: 223 Nelson-Siegel / 559 Svensson |
| Supplied-yield reconstruction | PASS: 18,334 checks, zero above 0.05 bp limit |
| Maximum supplied-yield error | PASS: 0.005003928 bp at 2016-08-31 / 18 years |
| Supplied ten-year inventory | PASS: 122 missing, first present 1971-08-31 |
| Modeled prices | PASS: 3,910 finite positive checks |
| Outcome windows | PASS: 703 full / 637 paper / 24 bridge / 42 holdout |
| Paper folds | PASS: 159 / 159 / 159 / 160 months |
| Canonical regimes | PASS: 341 high / 362 low / 50 transitions |
| Prior-only regimes | PASS: 335 high / 368 low / 48 transitions |
| Frozen disagreement months | PASS: exactly six |
| Equality-low and prefix invariance | PASS |
| Monthly sleeve cost ledger | PASS |
| Early fitted/extrapolated ten-year outcomes | PASS: 44 paper-window months |
| Byte-identical trailing-LF replay | PASS |

## Frozen return and cost model

At each month end, the canonical signal compares the modeled continuously
compounded ten-year-minus-three-month spread with its causal include-current
40-month average. High months hold a modeled 120-month zero for one month and
value it at 119 months; low months buy a modeled one-month zero and redeem at
par.

Headline friction is `5` bp per adverse side: the ten-year sleeve pays entry
and exit every month, while the one-month sleeve pays entry only. Stress is
`12.5` bp per adverse side. Costs apply on every maturity reset even when the
regime does not change.

The primary paper calls its study proof-of-concept, uses modeled curves, and
omits costs. TradeClaw's surcharge is a disclosed modern liquidity benchmark,
not a historical fill series. Commissions, taxes, custody, financing, market
impact, and management fees remain omitted.

## Full and holdout results

| Window / lane | Gross return | Headline return | Stress return | Headline Sharpe | Headline max drawdown |
|---|---:|---:|---:|---:|---:|
| Full canonical, 1968-01..2026-07 | +6,670.76% | +3,917.50% | +1,736.56% | 0.779 | 19.75% |
| Full prior-only control | +6,870.67% | +4,048.55% | +1,805.03% | 0.791 | 19.75% |
| Full always-ten-year | +5,244.29% | +2,545.94% | +821.76% | 0.506 | 33.58% |
| Full always-one-month | +1,458.25% | +996.53% | +547.50% | 4.105 | 2.43% |
| Holdout canonical, 2023-02..2026-07 | +13.88% | +10.35% | +5.26% | 0.598 | 6.00% |
| Holdout prior-only control | +17.22% | +13.70% | +8.62% | 0.882 | 6.00% |
| Holdout always-ten-year | +3.42% | -0.84% | -6.89% | -0.026 | 12.39% |
| Holdout always-one-month | +18.07% | +15.62% | +12.04% | 19.419 | 0.00% |

The full-window canonical headline path has `+51.84%` compounded paired excess
over always-ten-year and `+266.38%` over always-one-month. In the holdout it has
`+11.28%` paired excess over always-ten-year but `-4.56%` paired excess versus
always-one-month. The latter is the failed holdout benchmark gate.

The ungated bridge from `2021-02` through `2023-01` was also adverse:
canonical headline return was `-11.30%`, versus `+1.25%` for always-one-month.

## Paper-window fold stability

A fold passes only when canonical headline compounded return beats
always-one-month and canonical headline Sharpe beats always-ten-year.

| Fold | Window | Canonical headline return | One-month headline return | Canonical Sharpe | Ten-year Sharpe | Gate |
|---:|---|---:|---:|---:|---:|---|
| 1 | 1968-01..1981-03 | +126.54% | +136.86% | 0.898 | 0.096 | FAIL: return |
| 2 | 1981-04..1994-06 | +547.65% | +140.83% | 1.212 | 0.889 | PASS |
| 3 | 1994-07..2007-09 | +82.70% | +58.84% | 0.752 | 0.824 | FAIL: Sharpe |
| 4 | 2007-10..2021-01 | +53.13% | +3.38% | 0.457 | 0.588 | FAIL: Sharpe |

Only `1/4` folds passes, below the frozen `3/4` requirement. This is a temporal
stability failure, even though every canonical fold has a positive standalone
headline return.

## Predeclared gates

| Gate | Result |
|---|---|
| Standing QA | PASS |
| Full canonical headline return positive | PASS |
| Full canonical return above always-one-month | PASS |
| Full canonical Sharpe above always-ten-year | PASS |
| Full canonical drawdown below always-ten-year | PASS |
| At least 3/4 paper folds beat both benchmarks | **FAIL: 1/4** |
| Holdout canonical headline return positive | PASS |
| Holdout canonical return above always-one-month | **FAIL: +10.35% vs +15.62%** |
| Holdout canonical Sharpe above always-ten-year | PASS |
| Holdout canonical drawdown below always-ten-year | PASS |

Because every gate was mandatory, the verdict is `FAIL` and prospective-review
eligibility is false. The gross result, stress result, bridge, natural warmup,
and prior-only ambiguity control cannot rescue or replace the frozen decision.

## Limitations

- This is an independent current-vintage replication, not the authors' source
  vintage or code.
- Smoothed curve points and zero-coupon prices are modeled, not executable
  CUSIPs or broker-confirmed fills.
- The first 44 paper-window outcomes use fitted/extrapolated ten-year values
  outside the supplied ten-year comparison field.
- The source does not specify whether the decision month belongs in MA40. The
  prior-only interpretation is shown only as a frozen ungated sensitivity.
- The full sample spans more than 58 years, so large compounded percentages
  should not be read as short-horizon performance.
- Fixed modeled friction can differ from realized trading costs, especially in
  stressed markets.
- Positive historical returns do not establish present tradability or future
  returns.

## Human-review marketing handoff

Draft only; publish approval is false:

> We tested a monthly U.S. term-spread timing rule under explicit roll costs.
> It finished positive over the full historical sample, but only one of four
> paper-era folds beat both frozen benchmarks. In the untouched
> post-publication holdout it returned +10.35% after modeled costs versus
> +15.62% for the identically costed one-month sleeve. TradeClaw verdict: FAIL.
> These are fitted curve results, not security fills, and grant no trading
> authority.

No draft was queued or published.

## Next research action

Retain this FAIL without changing the MA timing, cost model, folds, controls, or
holdout. Do not promote the slightly stronger prior-only control after seeing
the result. In the next new UTC-aligned three-hour window, screen another
catalog candidate on exact-rule reconstructibility, data rights, cost headroom,
and a falsifiable untouched holdout before opening returns.

## Safety receipt

No public/admin UI, authentication, database, Docker, dependency, signal,
preset, allocation, broadcast, broker/execution, billing, or sponsored-access
behavior changed. Nothing was pushed, merged, deployed, published, auto-posted,
or activated.
