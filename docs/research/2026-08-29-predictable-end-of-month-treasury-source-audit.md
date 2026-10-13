# Predictable End-of-Month Treasury Returns - Source Audit

Date: 2026-08-29

Task: TC-257

Candidate: `predictable-end-of-month-treasury-returns`

Stage: source-audited

Disposition: advance to a frozen independent replication

TradeClaw backtest run at audit close: no

## Decision

Advance this candidate because its public rule is reconstructible without the
catalog vendor's hidden code, its expected turnover is only 12 round trips per
year, and the required current-vintage curve and control series can be pinned
from public-domain Federal Reserve data. The primary paper reports enough gross
headroom at five and ten years to justify testing a complete cost model.

This decision does not adopt the live Papers With Backtest ETF reconstruction.
Its changing chart, 2002-2026 sample, ETF mapping, and displayed return metrics
remain upstream commercial metadata. TradeClaw instead uses the paper's
zero-coupon construction and keeps every local result labeled modeled research.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned catalog row: gross Sharpe `0.43`, t-statistic `2.6`, volatility
  `3.8%`, and `37` years tested
- Catalog treatment: gross discovery metadata only; none of those values is a
  TradeClaw result, ranking input, or promotion claim
- Candidate page:
  <https://paperswithbacktest.com/strategies/predictable-end-of-month-treasury-returns>
- Primary paper: Jonathan Hartley and Krista Schwarz, "Predictable
  End-of-Month Treasury Returns," November 22, 2019
- Institutional PDF:
  <https://rodneywhitecenter.wharton.upenn.edu/wp-content/uploads/2019/12/17-19.Schwarz.pdf>
- SSRN record: <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3440417>
- Audited PDF SHA-256:
  `56403762378f606f595dcce11afcf1f1eaccf8810237c58999f653a230a32809`

The paper was read from its institutional host but is not vendored. No license
to redistribute the paper itself was established.

## Published rule

For each month `m`, let `E_m` be its final trading day. The paper buys an
`N`-year zero-coupon Treasury security at the close `t` trading days before
`E_m`, then sells it at close of business on `E_m`. Its primary excess log
return is:

1. the log price change from the entry `N`-year zero to the same security with
   `N - calendarDays / 365` years remaining at exit;
2. minus overnight general-collateral repo financing, accrued on ACT/360 and
   scaled across weekends and holidays.

The security prices come from the Gürkaynak-Sack-Wright smoothed off-the-run
nominal Treasury curve. The paper compares the final `t`-day return with the
return earned over all other days of the month. Its stated sample is January
1990 through the end of 2018.

The paper examines `t = 1..10` and maturities of 2, 5, and 10 years. It says the
best risk/reward is at two and five years and that the strategy is optimally
implemented over the final two to three trading days. The independent primary
lane therefore fixes `t = 2` and `N = 5` before local returns are constructed.
Ten years is a confirmation maturity; one year is a duration-specificity
control rather than a searched alternative.

Expected turnover is exactly one entry and one exit in every completed month:
12 round trips per year.

## Primary-source result

For `t = 2` over 1990-2018, the paper reports:

| Maturity | Mean monthly excess return | Annualized Sharpe | Positive months |
|---|---:|---:|---:|
| 2-year | 0.05% | 1.11 | 67% |
| 5-year | 0.13% | 1.07 | 63% |
| 10-year | 0.20% | 0.87 | 61% |

It reports the five-year all-other-days excess return as `0.09%` per month and
an annualized Sharpe of `0.24`. It also reports positive estimates in each
subperiod and finds related effects in on-the-run securities, Treasury futures,
and interest-rate swaps. These published values are audit targets, not inputs
to the TradeClaw decision function.

The paper cites a typical full off-the-run bid-ask spread of 2-3 basis points.
TradeClaw will freeze the adverse end of that range plus explicit slippage
before results.

## Reproducibility limits

- The exact GC-repo source and immutable export used by the paper are not
  identified. TradeClaw can therefore run an independent financing-proxy
  replication, not an exact reproduction.
- `Close of business` is not mapped to an executable venue timestamp. The
  public daily curve supplies end-of-day observations, so fills remain modeled
  curve closes.
- The paper mentions transaction costs and a typical spread but does not freeze
  commissions, slippage, or a complete per-trade implementation.
- The current Federal Reserve curve vintage is not identical to the historical
  vintage used by the authors and can be revised or methodologically changed.
- The curve represents smoothed hypothetical off-the-run zero-coupon
  securities, not executable CUSIP quotes. It excludes on-the-run and
  first-off-the-run notes.
- The futures section does not retain an exact source file, contract roll,
  delivery-basket choice, or settlement construction, so it is not used as a
  TradeClaw confirmation lane.
- Table 4 labels its final subperiod `2015-2019`, while the surrounding text and
  table note state that the sample ends in 2018. This apparent label error does
  not change the frozen 1990-2018 paper window.

## Data and rights audit

The Federal Reserve Board says its nominal page supplies daily curve parameters
and smoothed hypothetical yields. It also warns that this staff research
product is revisable and not an official statistical release. The Board's
website disclaimer places Board information in the public domain unless marked
otherwise and requests source attribution.

Three compact source inputs are retained under
`docs/research/data/end-of-month-treasury/`:

| Purpose | Retained file | Canonical SHA-256 |
|---|---|---|
| Nominal Svensson parameters, supplied 1/5/10-year yields, and one-month buffer | `fed-nominal-svensson-1989-12-01-2026-07-31.csv` | `4fab6cf297594f77f6e1ccfa4fbd099b4eb17dc407c9611a488039da33c2c41f` |
| Effective federal funds financing proxy | `DFF-1989-12-01-2026-07-31.csv` | `ea8b35582a3f88cc0a0d42ae94addc3d85aaf008d4bb574246dd8a83780db600` |
| Broad U.S. dollar external calendar control | `DTWEXBGS-2006-01-02-2026-07-31.csv` | `a3ac96e8eb53625936eb7fd9d14e181c10308ca1831db6ee0b58b35fdfafdb47` |

The nominal compact snapshot was derived from the complete Federal Reserve CSV
whose downloaded SHA-256 was
`877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7`.
The broad-dollar raw FRED export had SHA-256
`88db7d787e99129e671015fcc581f3507d0a2c527804c285ab555c2b83cd8054`;
its compact snapshot omits 211 explicitly blank observations. The preparation
step is fail-closed and reproducible through
`scripts/research/prepare-end-of-month-treasury-inputs.mjs`.

Schema-only inspection found 9,151 retained nominal market days from December
1989 through July 2026, 439 complete evaluation months from January 1990, full
daily financing coverage, and 243 months with all four exact broad-dollar dates
needed for a matched beginning-versus-end-of-month control. No price-return or
verdict series was constructed during this audit.

## Cost and falsification feasibility

- Headline round trip: 3 bp full bid-ask spread plus 1 bp slippage on each side,
  or 5 bp total.
- Headline financing: daily effective federal funds as a disclosed proxy,
  accrued ACT/360.
- Stress: 10 bp round trip and a 100 bp annual financing surcharge.
- Same-market controls: identical five-year exposure over the first two trading
  intervals, all-other-days exposure, one-year duration specificity, and a
  ten-year confirmation maturity.
- External falsification market: the Federal Reserve's nominal broad U.S.
  dollar index over matched first-two-versus-last-two-trading-day windows. It is
  a non-tradable diagnostic, not a portfolio benchmark.
- Untouched post-publication holdout: January 2019 through July 2026.
- August 2026 is excluded because its final trading day had not occurred at
  freeze time.

## Gate outcome

- Rule clarity: pass for an independent zero-coupon replication.
- Data provenance and rights: pass with exact public-domain snapshots and
  hashes; current-vintage/revision risk remains labeled.
- Cost headroom: pass to testing; the paper's reported 13 bp five-year mean is
  above the frozen 5 bp headline round trip and 10 bp stress round trip.
- Turnover: pass; 12 monthly round trips per year.
- Holdout and folds: feasible.
- External falsification: feasible with an official daily index and matched
  windows.
- Next action: freeze the complete protocol and its input hashes before any
  return is calculated.

## Safety receipt

No push, merge, deployment, publication, social post, signal, allocation,
broadcast, broker/execution action, billing change, or trading activation
occurred.
