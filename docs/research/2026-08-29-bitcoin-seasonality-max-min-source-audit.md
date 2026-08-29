# Bitcoin Seasonality and MAX/MIN - Source and Cost Audit

Date: 2026-08-29

Task: TC-258

Candidate: `seasonality-trend-following-and-mean-reversion-in-bitcoin`

Stage: source-audited

Disposition: advance only the MAX10/MIN10 composite to a frozen independent
replication; do not preregister the daily two-hour lane

TradeClaw backtest run at audit close: no

## Decision

Advance the paper's lower-turnover daily composite that is exposed to Bitcoin
after the previous close is either its 10-day maximum or its 10-day minimum.
The rule is stated mathematically, the 10-day choice is explicit, the original
Gemini venue has a public hashable H1 archive, and a post-paper holdout plus an
ETH falsification market are available.

Do not spend a return-search cycle on the paper's separate `21:00-23:00 UTC`
seasonality lane. It enters and exits every calendar day. Its own reported 33%
annualized gross return implies a geometric break-even side cost of only
`0.039031%` across 365.25 round trips per year. That is below the frozen
`0.05%` fee alone and far below TradeClaw's spot headline of `0.10%` fee plus
`0.15%` slippage per side. Applying only the fee to the published gross
annualization yields approximately `-7.70%`; applying the full frozen spot
friction yields approximately `-78.63%`. These are algebraic cost screens of a
published gross figure, not a TradeClaw backtest.

This audit therefore avoids a known high-turnover dead end while preserving a
distinct, event-driven hypothesis with materially better cost headroom. No
local strategy return, trade, verdict, or marketing draft was calculated.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Candidate page:
  <https://paperswithbacktest.com/strategies/seasonality-trend-following-and-mean-reversion-in-bitcoin>
- Pinned catalog row: gross Sharpe `1.11`, t-statistic `4.5`, volatility
  `49.5%`, and `16` years tested
- Catalog treatment: gross discovery metadata only; the live vendor chart,
  current position, 2010-2026 window, and displayed returns are not TradeClaw
  evidence or rule authority
- Primary paper: Matúš Padyšák and Radovan Vojtko, "Seasonality,
  Trend-following, and Mean reversion in Bitcoin," April 11, 2022
- SSRN record: <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4081000>
- DOI: <https://doi.org/10.2139/ssrn.4081000>
- Author article:
  <https://quantpedia.com/trend-following-and-mean-reversion-in-bitcoin/>
- Audited 16-page PDF SHA-256:
  `a8e7f1e4bb134a2ff3dea458872583463de2b69e8b895202a7d5b57ca99596a1`

The paper was downloaded through SSRN solely for audit and visual inspection.
SSRN labels it all rights reserved, so the PDF is not vendored or redistributed.

## Published rules

### Two-hour seasonality lane

The paper uses Gemini hourly Bitcoin data and states the rule without an exit
ambiguity: buy Bitcoin at `21:00 UTC` and sell it at `23:00 UTC`, every day. It
reports 33% annualized return, 20.93% annualized volatility, and -22.45% maximum
drawdown over its 2015-2022 sample. The paper does not deduct a fee, spread,
slippage, or market impact.

### MAX/MIN daily lanes

For each day `t` and lookback `x` in `10, 20, 30, 40, 50`, the paper defines:

```text
MAX(x,t) = max(BTC(t), ..., BTC(t-x+1))
MIN(x,t) = min(BTC(t), ..., BTC(t-x+1))
```

The next daily Bitcoin return `r(t,BTC)` is earned by `at MAX` when the prior
close equals its inclusive rolling maximum, and by `at MIN` when the prior close
equals its inclusive rolling minimum. Companion `below MAX` and `over MIN`
lanes earn the return on all other days. The paper then combines `at MAX10` and
`at MIN10` with a logical OR and otherwise stays flat.

The source says the 10-day components are the best of the five tried lookbacks.
The frozen replication therefore treats `MAX10 OR MIN10` as the published
headline rather than searching the five choices again. All five source-defined
lookbacks and both components will remain visible as ungated controls.

## Primary-source result

Over Gemini Bitcoin data from November 26, 2015 through February 3, 2022, the
paper reports:

| Lane | Annualized return | Annualized volatility | Maximum drawdown | Return/volatility |
|---|---:|---:|---:|---:|
| At MAX10 | 60.47% | 35.44% | -26.54% | 1.71 |
| At MIN10 | 23.68% | 32.10% | -36.05% | 0.74 |
| MAX10 or MIN10 | 98.43% | 47.75% | -37.67% | 2.06 |

Those are gross audit targets, not gate inputs. The paper does not state a
transaction-cost model, exact daily session boundary, executable close fill,
missing-hour policy, or immutable source-file hash. It also selects the
10-day lookback after comparing five alternatives on the same sample.

A later author follow-up reports that the previously observed daily MIN/MAX
seasonality was not statistically significant out of sample, while the MAX
side retained some effectiveness. That warning is recorded but is not used to
change the frozen composite or its gates:
<https://quantpedia.com/revisiting-trend-following-and-mean-reversion-strategies-in-bitcoin/>.

## Published-performance cost screen

For the daily two-hour lane, let `A = 0.33`, `N = 365.25`, and `c` be the same
multiplicative cost on entry and exit. The break-even side cost is frozen as:

```text
c = 1 - (1 + A)^(-1 / (2N)) = 0.0003903125
```

That is `0.039031%` per side or about `0.078047%` round trip. The paper's gross
result therefore cannot clear even a `0.05%` fee per side before spread or
slippage. No local parameter or return series is needed to establish this
cost-feasibility no-go.

The MAX/MIN composite changes exposure only when the event state changes. The
paper does not report its episode count, so no turnover claim is inferred at
audit close. Its much larger published gross result and state-dependent
exposure provide enough headroom to justify measuring full costs once under a
preregistered protocol.

## Data and rights audit

The paper identifies Gemini but does not retain its exact extract. Current
Gemini market-data terms allow internal price analysis but prohibit ordinary
redistribution. TradeClaw will not commit raw Gemini data.

For this independent replication, the input preparer uses the free Gemini H1
archives published by CryptoDataDownload:
<https://www.cryptodatadownload.com/data/gemini/>. That provider labels the free
archive `CC BY-NC-SA 4.0`. The repository retains attribution and source hashes,
but keeps both downloaded and normalized market-data bytes under ignored
`data/`; the resulting artifact is derived modeled research, not a data feed.
Any later commercial redistribution or raw-data API would require a separate
rights review.

Schema-only preparation completed before any return calculation:

| Series | UTC days | Window | Incomplete observed days | Canonical input SHA-256 |
|---|---:|---|---:|---|
| Gemini BTCUSD | 3,901 | 2015-11-26 through 2026-07-31 | 3 | `ab1e468e9065a77ed744314116e6c3bb41cbd88f492cc60a6e6fc4fdc87e9c68` |
| Gemini ETHUSD | 3,735 | 2016-05-10 through 2026-07-31 | 3 | `6f5bc428c67da5534829f3b567d0c1e7b2e7b1294d6dde1fc56019deeccc20e4` |

The cropped observed-H1 subset hashes are
`e1a03d0a0ae1e2fe30c85b963086f6753790e1aa57699d30a839b40e4a283623`
for BTC and
`8bc32e4ef354ba2fd7c6644f1cb652082bfa42759b8f2ed96563459520a2f96d`
for ETH. Both series have one missing hour on each of `2019-11-13`,
`2019-11-20`, and `2019-12-17`; no candle is invented. Daily open and close are
the first and last observed H1 prices in that UTC day, and the gaps must remain
visible in QA.

## Reproducibility limits

- The source does not specify whether its daily bar closes at UTC or another
  session boundary. TradeClaw freezes UTC aggregation because the paper's
  hourly analysis is explicitly UTC.
- The formula applies the next daily return after a closing maximum/minimum but
  does not freeze an executable fill. TradeClaw will use the next UTC day's
  first observed open and the day's last observed close, with continuous
  holding across consecutive event days.
- The source data vintage is not retained, so a gross paper-window control can
  diagnose but cannot prove byte-identical reproduction.
- Three public H1 hours are absent per asset. They remain gaps; no forward fill,
  interpolation, or synthetic candle is permitted.
- The 10-day rule was selected after comparing five lookbacks on the paper
  sample. It is accepted only as a published fixed rule and must survive the
  untouched post-paper holdout.
- ETH is an external falsification market, not evidence that the Bitcoin paper
  studied a cross-asset rule.

## Gate outcome

- Rule clarity: pass for a bounded independent MAX10/MIN10 replication.
- Data provenance: pass for internal modeled research with exact source-subset
  and canonical input hashes; raw-data redistribution remains prohibited.
- Intraday cost headroom: fail; the two-hour lane is a documented no-go.
- Daily composite cost headroom: pass to testing; exact turnover and net edge
  remain unknown until after the protocol is frozen.
- Holdout: February 4, 2022 through July 31, 2026 is untouched.
- External falsification: Gemini ETHUSD under the identical rule and costs.
- Next action: freeze fills, costs, episode accounting, controls, folds,
  metrics, and decision gates before invoking the return assembly.

## Safety receipt

No push, merge, deployment, publication, social post, signal, allocation,
broadcast, broker/execution action, billing change, or trading activation
occurred.
