# TradeClaw loss-claim and WEEX outreach verification

Date: 2026-07-15
Last source recheck: 2026-07-16
Reviewer: TradeClaw PM agent
Purpose: decide what the production evidence supports for a public LinkedIn post and verify the factual claims in the WEEX outreach.

This is an engineering and evidence review, not legal advice.

## Decision

The production evidence supports this narrow conclusion:

> In the 15 July 2026 TradeClaw snapshot, counted position-sized signals had negative average expectancy after TradeClaw's published fee-and-slippage model. This version of the engine did not demonstrate a net edge under those assumptions.

Do not publish any of these broader statements as facts:

- "TradeClaw users lost money."
- "The TradeClaw portfolio lost overall."
- "Every TradeClaw trade was unprofitable."
- "These are actual broker execution results."
- "Real execution costs were measured."

There is no observed user portfolio or complete broker-fill ledger behind the public result. It is an OHLCV-resolved signal study plus modeled transaction costs and a hypothetical sizing rule.

## Frozen production snapshot

Capture time: 2026-07-15 01:26:40 UTC (09:26:40 MYT)

Sources:

- `https://tradeclaw.win/api/research/cost-field?scope=pro`
- `https://tradeclaw.win/api/signals/equity?scope=pro&summaryOnly=1`
- `https://tradeclaw.win/api/signals/history?scope=pro&period=all&limit=1`

Snapshot fingerprints:

| Response | Bytes | SHA-256 |
|---|---:|---|
| Cost field | 112,174 | `eda810983bb7f1219640109dd1ead21e006a562b0091a315b0a83f5d94d10465` |
| Equity summary | 576 | `cb720e07568181e7f5b435fb9223d6b522a8737fc9a27050aac5a61a43550f0b` |

The cost-field response contained 3,967 equal-length, finite, chronological rows from 2026-04-12 22:30 UTC through 2026-07-14 22:00 UTC. Independent arithmetic over the public arrays produced:

| Measure | Independently recomputed value |
|---|---:|
| Counted, position-sized signals | 3,967 |
| Mean gross result | +0.014961 R/signal |
| Mean modeled cost | 0.433393 R/signal |
| Mean result after modeled cost | -0.418432 R/signal |
| Sequentially compounded result, 1% risk/signal | -99.999996% |
| Maximum modeled drawdown | 99.999997% |

The production summary rounds the same finding to gross `+0.02R`, average cost `0.433R`, net `-0.41R`, and total return `-100%`. The small difference between raw net `-0.418R` and summary net `-0.41R` comes from API rounding before the summary subtraction.

The latest 10,000 public history rows were composed as follows:

| Bucket | Rows |
|---|---:|
| Counted resolved | 3,967 |
| Gate-blocked | 4,396 |
| Expired at 24 hours | 1,626 |
| Pending | 11 |
| Simulated flag | 0 |

The counted population had 1,441 positive outcomes and 2,526 negative outcomes, a 36.3% win rate. Its raw price-return sum was +94.42%, which is a different unit from the fixed-risk, cost-adjusted equity simulation. Public copy must name the metric so these figures are not presented as contradictory portfolio returns.

## Robustness checks

The negative modeled expectancy was not limited to one headline slice:

| Slice | N | Net R/signal | Modeled total return |
|---|---:|---:|---:|
| Full counted set | 3,967 | -0.41 | -100% |
| Broadcast-approved set | 120 | -0.72 | -58.45% |
| Premium confidence band | 284 | -0.57 | -81.04% |
| Standard confidence band | 3,683 | -0.41 | -100% |
| Last 7 days | 79 | -0.47 | -31.60% |
| Last 30 days | 941 | -0.51 | -99.32% |
| Last 90 days | 3,640 | -0.45 | -100% |

Independent class-level calculations from the cost-field arrays were also negative after modeled cost:

| Asset class | N | Gross R | Modeled cost R | Net R |
|---|---:|---:|---:|---:|
| Crypto | 1,826 | +0.1159 | 0.5836 | -0.4677 |
| FX/fallback, including equities and other symbols | 1,864 | -0.0769 | 0.3150 | -0.3920 |
| Metals | 277 | -0.0320 | 0.2399 | -0.2719 |

The all-signal mean becomes negative once 3.45% of the published average cost is charged. At 5% of the published cost assumptions, mean net expectancy is already `-0.0067R`. A simple trade-level 95% interval was `[-0.463, -0.374]R`; an equal-day cluster check was `[-0.606, -0.368]R`. These intervals are diagnostic only because the signals are correlated and were not sampled as independent random trials.

Conclusion: the sign of the result is strong inside the published model. It does not establish realized customer losses.

## Reliability limits that must be disclosed

1. **Rolling cap, not literal all-history data.** `readHistoryAsync()` reads only the latest 10,000 rows. The result currently covers roughly 12 April through 14 July 2026, not the repository's entire lifetime. As new rows enter, older rows leave and the counted sample can shrink.

2. **Selected denominator at capture time.** The production predicate used for this fingerprinted snapshot excluded simulated rows, gate-blocked rows, and every row marked as a 24-hour expiry, including nonzero horizon closes. In this snapshot, 6,033 of the latest 10,000 rows were gate-blocked, expired, or pending.

3. **Modeled costs, not fills.** `cost_estimate_pct` stores static per-asset fee and slippage assumptions. It is not a measured broker fill. Funding is excluded. Actual fees, spread, market impact, rebates, latency, and venue basis can differ.

4. **Signal outcomes, not executions.** Outcomes are reconstructed from OHLCV bars. When TP and SL both touch in one bar, the resolver gives SL priority. Gap losses are capped at -1.5R. There is no tick-level path or broker confirmation. The resolver has a synthetic-candle last resort, and the counted-outcome predicate does not reject an outcome solely because its source is synthetic; the public cost arrays do not expose enough provenance to measure that across the complete snapshot.

5. **Hypothetical portfolio path.** The equity route sequentially compounds every eligible signal at 1% current-equity risk. The snapshot averaged about 45 counted signals per active day, reached 225 in one day, and had up to 17 signals at the same timestamp. The model has no account-level leverage, margin, concurrency, exposure, or correlated-position constraint.

6. **Delivery scope differs.** The default `scope=pro` population is the full eligible firehose, not only signals actually approved for subscriber broadcast. The narrower broadcast-approved result is also negative, but only has 120 observations.

7. **Public reproducibility was incomplete at capture time.** The captured cost-field arrays omitted IDs and outcome provenance, while the CSV omitted cost, target, source, and broadcast-decision fields. Duplicate timestamps prevented an exact public join. The route also labeled every non-crypto/non-metal cost model as `fx`, so that bucket could include equities and other symbols. The arithmetic is reproducible; the captured response does not provide complete row lineage.

8. **The ledger was mutable through a read at capture time.** The deployed public history GET handler called `resolveRealOutcomes()` before returning and could update unresolved rows. The repaired worktree removes that mutation. A dated snapshot and hash remain necessary for any durable public claim.

Relevant implementation:

- `apps/web/lib/signal-history.ts`: counted-outcome predicate, OHLCV resolver, and 10,000-row cap
- `apps/web/lib/signal-slice.ts`: public scope and period selection
- `apps/web/app/api/signals/equity/route.ts`: fixed-risk compounding and cost deduction
- `apps/web/app/api/research/cost-field/route.ts`: public per-signal R and modeled-cost arrays
- `packages/strategies/src/backtest-options.ts`: asset-class cost assumptions
- `apps/web/migrations/051_calibration_features.sql`: definition of `cost_estimate_pct`

## Deployed post-repair production snapshot

- Capture window: 2026-07-15 08:40:18.862 UTC through 08:40:19.930 UTC
- Runtime source: `b070197b38b7b42560ba5d317149fb92d75dd06c` (PRs #168 and #169)
- Railway deployment: `d2648ea6-beff-434c-8bf8-8c79c74709bf` (`SUCCESS`, image `sha256:d59af31a421908e8ac9f8e6787a1f70a82dbd4111aec520ac01152c6a9c197ab`)

All responses were captured with the exact-release cache buster `release=b070197b`, `Accept-Encoding: identity`, and a no-cache request. The release query identifies the deployed code path but does not freeze the continuously changing production dataset. These hashes are timestamp-specific capture fingerprints. The committed raw bodies, rather than a later response from the same URL, are the immutable evidence for the arithmetic below.

| Response | Exact URL | Archived body | Bytes | SHA-256 |
|---|---|---|---:|---|
| Cost field | `https://tradeclaw.win/api/research/cost-field?scope=pro&release=b070197b` | [cost-field.json](evidence/2026-07-15-b070197b/cost-field.json) | 72,658 | `7d568ee659892327d6b490efcfd3c0822c68cd5beaad62f5e369466547c29aa7` |
| Equity summary | `https://tradeclaw.win/api/signals/equity?scope=pro&summaryOnly=1&release=b070197b` | [equity-summary.json](evidence/2026-07-15-b070197b/equity-summary.json) | 587 | `a44d95afb0748b7fec6da4af1f781707b6ffbd50dcf26019fed27e2800a2266a` |
| Signal history | `https://tradeclaw.win/api/signals/history?scope=pro&period=all&limit=1&release=b070197b` | [signal-history.json](evidence/2026-07-15-b070197b/signal-history.json) | 1,011 | `2edfd1ddb818869d93633062c174482c17f5b8cf8003d517bc29d67012a5af1a` |
| Proof | `https://tradeclaw.win/api/proof?release=b070197b` | [proof.json](evidence/2026-07-15-b070197b/proof.json) | 69,359 | `16223e9613bb170d0ba0a5dcdcde32d93c0a04ecf78982e9524c99ddc396877d` |
| Win rates | `https://tradeclaw.win/api/v1/win-rates?release=b070197b` | [win-rates.json](evidence/2026-07-15-b070197b/win-rates.json) | 3,571 | `9fb4c30cc6f422fe078bcb46ae68182b10ef6705dd9b47da7e596f3fb7c6bdc3` |

The source read loaded 10,000 records, its configured 10,000-row maximum, and reported `potentiallyTruncatedBeforeStart: true`. Eligible outcomes covered 2026-06-10 13:30 UTC through 2026-07-15 07:00 UTC.

| Measure | Independently recomputed value |
|---|---:|
| Eligible observed-OHLCV outcomes | 1,220 |
| Wins / losses | 448 / 772 |
| Win rate | 36.7213% (36.7% displayed) |
| Mean gross result | -0.0224795082 R/signal |
| Mean modeled cost | 0.4028188525 R/signal |
| Mean result after modeled cost | -0.4252983607 R/signal |
| Sequential hypothetical 1% simulation | -99.51% |

The five public surfaces agree on the eligible population. The result remains an OHLCV-derived, risk-normalized signal study with modeled fees and slippage. It is not broker-fill evidence, customer-account performance, or portfolio P&L. The separate unsized directional metric is positive (+0.04% mean and +45.39% summed), which is another reason an unqualified "overall loss" statement would be materially ambiguous.

Live release checks also confirmed that the leaderboard's top and worst performers each have resolved evidence, all three OG endpoints return valid 1200x630 PNGs, and the EarningsEdge pricing page has no horizontal overflow at 390px or 320px. These checks address the three defects found during the first post-repair production sweep.

CI follow-up on 16 July found that the required Strategy Backtests job had reported a false success by restoring a cached log containing 9 failed suites. A `tee` pipeline masked Jest's exit code, and the clean runner had not built `@tradeclaw/signals`. PR #171 removes result caching, builds signals before every strategy run, and enables strict pipe failure propagation. A fresh detached checkout reproduced the failure before the signals build and passed 13 suites, 94 tests, and one snapshot after the corrected setup. GitHub run `29509855334`, job `87660533917`, then executed that corrected sequence on head `d3b1a33a` and passed all 13 suites, 94 tests, and one snapshot. This CI defect did not change the archived production responses or arithmetic, but the earlier cached Strategy Backtests check must not be cited as validation.

The repaired runtime counts nonzero 24-hour OHLCV closes only when their resolver source is an approved observed provider (`market-data-hub`, `binance`, `stooq`, `kraken`, or `cryptocompare`). Legacy rows without source, synthetic or unknown sources, and missing or zero force-expiry placeholders remain stored but do not count. Public history GET is read-only, row IDs plus cost and outcome provenance are available through `?include=provenance`, and a fail-closed cost-adjusted evidence gate sits before entry-like execution and hosted alert fan-out.

These changes do not retroactively alter the frozen 3,967-row response above. That historical result remains valid only for its dated, pre-repair production denominator. The 1,220-row result in this section is the frozen, deployed post-repair snapshot captured on 15 July; the rolling live population changes as records enter and leave the 10,000-row source window.

## LinkedIn-safe copy

> We reran TradeClaw after deploying the evidence-provenance repair. In a production snapshot captured on 15 July 2026, the available 10,000-row source window contained 1,220 outcomes with approved observed-OHLCV provenance, covering 10 June through 15 July UTC.
>
> Average gross result was -0.0225R per signal. After our published fee-and-slippage model, average net result was -0.4253R per signal. This engine version did not demonstrate a net edge under those assumptions.
>
> These are OHLCV-derived signal outcomes with modeled costs, not broker fills, customer losses, or portfolio returns. The source window is capped and may omit earlier rows.
>
> Archived data: https://github.com/naimkatiman/tradeclaw/tree/main/docs/audits/evidence/2026-07-15-b070197b
> Method: https://tradeclaw.win/methodology

Do not replace the last paragraph with "not financial advice" and remove the methodological limitations. A generic disclaimer does not repair an overbroad performance claim.

If the compounded number is mentioned, use this wording:

> A separate sequential simulation risking 1% of current equity per eligible signal returned -99.51%. Because it does not model concurrent exposure or account margin, I do not describe it as an actual portfolio result.

## WEEX outreach verification

The TradeClaw-specific observation is substantially accurate: the repository emits crypto, FX, metals, and equity signals; the Binance USDT-perpetual execution path exists and defaults to testnet/disabled operation; the RoboForex R StocksTrader file is explicitly interface-only and throws `not implemented yet`.

The commercial claims require qualification:

| Outreach claim | Verification |
|---|---|
| Up to 70% rebate | WEEX publicly advertises 50%-70% trading-fee sharing. This is a share of fees actually paid, not 70% of volume. TradeClaw's actual tier is unconfirmed. |
| Broker-ID attribution | Documented for approved brokers through a unique broker ID and client-order-ID convention. Live eligibility and settlement still need sandbox verification. |
| Deep perpetual liquidity | WEEX markets narrow spreads and large volume, but this does not prove realized fill quality, uptime, or slippage. Treat as unverified until measured. |
| Better terms than Binance | Not established. The claim needs a written tier schedule and a like-for-like comparison of fees, thresholds, fills, counterparty risk, and jurisdiction access. |
| TradFi execution | WEEX offers USDT-margined perpetual exposure to forex, commodities, stocks, and indices. These are synthetic derivatives, not the underlying shares, gold, or spot FX. Public docs do not establish that every TradFi contract is available through the broker API. |
| Natural symbol fit | Not yet. Examples include EUR/USDT rather than EUR/USD, and synthetic/tokenized proxies may have different basis, funding, hours, and corporate-action behavior. |
| Active TradFi campaigns now | Supported only in the general sense on 16 July: WEEX's public TradFi page advertises a trading challenge from 9-23 July 2026 (UTC+8). A separate selected-region zero-fee offer ended on 8 July. The public page does not establish TradeClaw-user eligibility, broker attribution, or commission treatment; obtain the campaign ID, full terms, eligible regions, and written broker confirmation. |
| Rebate on TradFi volume | Not publicly guaranteed. Obtain written confirmation that each TradFi product is commission-eligible. |
| `@Weex_Illiaa` identity | Unverified. Confirm the contact through `bd@weex.com` or WEEX's published business channel before sharing credentials or announcing a partnership. |

Primary sources:

- WEEX broker API: https://www.weex.com/api-doc/broker/intro
- WEEX broker program: https://www.weex.com/news/detail/weex-api-broker-program-turn-your-trading-platform-into-a-revenue-engine-s25tw96lzabkau5am0yfy9zj
- WEEX current TradFi page: https://www.weex.com/events/tradfi
- WEEX TradFi assets: https://www.weex.com/help/articles/help_article_79108
- WEEX TradFi overview: https://www.weex.com/help/articles/help_article_84489
- WEEX promotion end notice: https://www.weex.com/help/articles/djgzm3mmmp14bnzyoj5p1e72

These official pages were last rechecked on 16 July 2026. The broker documentation still requires application and approval before a unique broker ID and initial commission rate are issued. The 50%-70% number remains WEEX marketing for trading-fee sharing and is expressly subject to partner verification and changing program terms; it is not a confirmed TradeClaw rate or a percentage of user volume. The current challenge supports only the narrow statement that a TradFi campaign is advertised; it does not validate the outreach's promised bonuses, availability, API execution coverage, or rebate economics for TradeClaw users.

## Malaysia publication risk

As of the Securities Commission Malaysia list updated 26 June 2026, WEEX is not a registered Malaysian digital-asset exchange. The SC's advertising FAQ, effective for advertisements issued from 1 November 2025, expressly covers voluntary social-media advertisers. Its Example 9 says promoting a platform licensed only abroad but not authorized by the SC breaches the advertising guidelines and may also create abetting exposure. The FAQ also says reposts can be advertisements and a non-Malaysian disclaimer alone is insufficient.

Sources:

- SC registered DAX list: https://www.sc.com.my/regulation/guidelines/recognizedmarkets/list-of-registered-digital-asset-exchanges
- SC advertising FAQ: https://www.sc.com.my/api/documentms/download.ashx?id=3f059e87-cd3b-4f10-96a3-b8de739cbef3

Therefore:

- Publishing the narrow TradeClaw research result is materially safer than publishing a WEEX endorsement.
- Do not post a WEEX referral link, revenue promise, active-promotion claim, or call to Malaysian users based on this outreach.
- Do not announce an integration before identity, API coverage, terms, jurisdiction eligibility, and a sandbox execution test are complete.
- Obtain Malaysian securities counsel or written SC clarification before any WEEX promotional campaign accessible to Malaysian users.
