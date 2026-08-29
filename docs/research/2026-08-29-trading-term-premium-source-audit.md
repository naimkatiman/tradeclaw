# Trading the Term Premium - Source Audit

Date: 2026-08-29

Task: TC-259

Candidate: `trading-the-term-premium`

Stage: source-audited

Disposition: advance to a frozen independent modeled replication

TradeClaw return calculated at audit close: no

## Decision

Advance only the paper's simple U.S. moving-average term-spread lane. It has a
monthly decision, a source-defined rule, a public hashable curve source, and an
identically constructible one-month and ten-year benchmark. It is materially
simpler to audit than the paper's ACM and hidden-Markov variants.

This is not an adoption of the Papers With Backtest implementation or its live
chart. The catalog's Sharpe ratio, t-statistic, volatility, and sample length
remain gross discovery metadata. TradeClaw will independently reconstruct the
rule from a frozen current-vintage Federal Reserve curve, apply a complete
monthly-roll friction model, and preserve an untouched post-publication
holdout.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog row: gross Sharpe `0.45`, t-statistic `2.8`, volatility `5%`,
  and `37` years tested
- Catalog treatment: discovery-only; those values are not TradeClaw evidence,
  a ranking score, or a promotion claim
- Candidate page:
  <https://paperswithbacktest.com/strategies/trading-the-term-premium>
- Primary paper: Luke van Schaik, Emlyn Flint, and Florence Chikurunhe,
  "Trading the Term Premium," November 2022
- SSRN record: <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4324696>
- DOI: <https://doi.org/10.2139/ssrn.4324696>
- Audited official SSRN delivery SHA-256:
  `867fe06c98fb89d8d7139ec778eaf0367adfad45a86edde4a95d85e1f0deabc0`
- Audited document size: `4,301,129` bytes and `36` pages

The SSRN record is all-rights-reserved. TradeClaw retains only bibliographic
facts, narrow summaries, links, and the document hash; the PDF is not vendored
or redistributed.

## Published rule

The paper studies U.S. monthly fixed-income allocation using estimated
zero-coupon yield curves. Its simple proxy is the continuously compounded
ten-year yield minus the three-month yield. At month-end `t`, compare that proxy
with a trailing 40-month moving average:

1. when the proxy is above its moving average, hold a modeled ten-year
   zero-coupon bond for the next month;
2. otherwise, hold a modeled one-month zero-coupon bond to redemption;
3. repeat the choice and reset maturity every month.

Equation (1) expresses a fixed-month-grid excess log return as
`ln(P[t+1,n-1]) - ln(P[t,n]) - ln(P[t,1])`. The allocation backtest itself is
an outright choice between the ten-year total return
`ln(P[t+1,119m]) - ln(P[t,120m])` and the one-month redemption return
`-ln(P[t,1m])`.

The paper says the signal uses a 40-month moving average but does not state
whether month `t` is inside that average. TradeClaw freezes the causal
include-current interpretation, `mean(spread[t-39..t])`, because it directly
matches "term premium less its moving average" at the decision date. The
equally causal prior-only interpretation, `mean(spread[t-40..t-1])`, is frozen
as an ungated source-ambiguity sensitivity. It cannot replace or rescue the
canonical verdict after results.

The paper's U.S. out-of-sample comparison is labeled 1968-2021. TradeClaw fixes
outcomes `1968-01` through `2021-01` as the paper-comparison window, reports
`2021-02` through `2023-01` as a bridge, and reserves `2023-02` onward as the
post-publication holdout. Published table values are audit context only and are
not decision inputs.

## Published limitations

The authors explicitly call the work proof-of-concept. The backtests use
modeled yield curves rather than strictly tradeable securities and omit
trading costs. No author-linked public implementation or complete executable
cost specification was found. The paper also says a ten-year ACM estimate
needs at least 120 months of history while labeling an out-of-sample start in
1968 from a curve source beginning in June 1961. The simple term-spread lane
does not estimate ACM, but the timing inconsistency remains disclosed.

## Federal Reserve input and rights

The official Board page is:
<https://www.federalreserve.gov/data/nominal-yield-curve.htm>. Its complete CSV
is <https://www.federalreserve.gov/data/yield-curve-tables/feds200628.csv>.

The Board describes these as continuously compounded, smoothed hypothetical
zero-coupon yields and estimated curve parameters. Nelson-Siegel is used before
1980 and Nelson-Siegel-Svensson thereafter. The fit excludes Treasury bills,
on-the-run issues, and first-off-the-run notes and bonds. The current vintage
can differ from historical vintages and the staff product can be delayed,
revised, or methodologically changed. It is not an official statistical
release.

The Board's website disclaimer places Board information in the public domain
unless otherwise indicated and requests attribution. The compact input is
therefore committed with source attribution; the two copyrighted research
PDFs are not.

The complete downloaded CSV is `16,631,671` bytes with SHA-256
`877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7`.
Before any strategy return was calculated, the deterministic preparer verified:

- `17,008` dated rows, `16,262` valid parameter rows, and `746` all-missing
  parameter rows;
- `4,620` Nelson-Siegel and `11,642` Svensson valid rows;
- `381,362` available annual-yield reconstruction comparisons;
- `42` comparisons above `0.01` basis point and zero above the frozen `0.05`
  basis-point tolerance;
- maximum error `0.0379649873` basis point on `2013-10-16` at six years.

The committed snapshot selects the last row with valid parameters in each
calendar month through July 2026. It never selects an all-`NA` calendar tail.

| Retained input | Canonical SHA-256 | Bytes | Rows |
|---|---|---:|---:|
| `docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv` | `29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041` | 311,362 | 782 |

The snapshot contains `223` Nelson-Siegel and `559` Svensson month ends. Its
`18,334` available supplied-yield checks have zero errors above `0.01` basis
point; the maximum is `0.0050039280` basis point on `2016-08-31` at 18 years.
Preparation is reproducible with
`scripts/research/prepare-trading-term-premium-input.mjs`.

Supplied annual yields exist for one through seven years at every retained
month end. Supplied eight-, nine-, and ten-year fields are `NA` for the first
`122` month ends and begin on `1971-08-31`. The first `44` paper-comparison
outcomes therefore depend on fitted curve parameters beyond the supplied
ten-year comparison horizon. These are modeled extrapolated curve points, not
observed or executable ten-year prices. Missing supplied comparison fields are
expected `NA`; missing or invalid parameters are a standing failure.

## Cost evidence

The primary paper omits costs. TradeClaw therefore uses a separate official
market-liquidity benchmark: Federal Reserve Bank of New York Staff Report 1170,
"Liquidity and Trading Dynamics in the Off-the-Run U.S. Treasury Market,"
November 2025, <https://www.newyorkfed.org/research/staff_reports/sr1170.html>.
The audited PDF is `869,212` bytes with SHA-256
`4f1de719e9890abd9f0c67442bbce80107c98a28cdcf88e4b2f98c0a76d93113`
and is not vendored.

Its Table 3 reports ten-year effective full bid-ask spreads for July 2017
through June 2024 of `2.07` bp on-the-run; `3.73` bp first off-the-run;
`5.36`, `6.05`, `6.68`, and `6.95` bp second through fifth off-the-run; and
`64.77` bp for further-off-the-run securities. March 2020 values were `5.13`,
`16.86`, `23.67`, `26.33`, `27.99`, `31.49`, and `53.38` bp respectively.

These modern observations do not reconstruct historical 1961-2026 fills. They
support a transparent modeling surcharge:

- headline: `5` bp per adverse side, about `10` bp for the monthly ten-year
  entry/exit roll and `5` bp for one-month entry followed by redemption;
- stress: `12.5` bp per adverse side, about `25` bp and `12.5` bp respectively;
- gross: zero-cost source comparison, reported but ungated.

The surcharge is paid every month because maturity resets monthly, even when
the signal regime does not change. It is not charged only on regime switches.

## Feasibility and gate outcome

- Rule clarity: pass for the frozen include-current independent reading, with
  the prior-only ambiguity preserved visibly and ungated.
- Data provenance and rights: pass for the exact public-domain Board snapshot;
  revision-vintage and modeled-price limitations remain explicit.
- Source reconstruction: pass to testing under the pre-return `0.05` bp limit.
- Turnover: pass to testing at one maturity reset per month; cost is material
  and fully modeled.
- Controls: feasible with identically costed always-ten-year and
  always-one-month sleeves.
- Stability: feasible across four consecutive paper-window folds of
  `159/159/159/160` months.
- Holdout: feasible with `42` untouched post-publication outcomes.
- Next action: freeze the complete protocol and exact hashes in a clean commit
  before any return series or verdict is opened.

## Safety receipt

No return, artifact, verdict, marketing draft, UI, signal, allocation,
broadcast, broker/execution action, billing change, push, merge, deployment,
publication, or social post occurred during this audit.
