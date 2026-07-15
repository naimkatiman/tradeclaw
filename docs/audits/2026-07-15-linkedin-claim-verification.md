# TradeClaw loss-claim and WEEX outreach verification

Date: 2026-07-15
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

## Post-audit repair status

The repaired worktree now counts nonzero 24-hour OHLCV closes only when their resolver source is an approved observed provider (`market-data-hub`, `binance`, `stooq`, `kraken`, or `cryptocompare`). Legacy rows without source, synthetic/unknown sources, and missing/zero force-expiry placeholders remain stored but do not count. Public history GET is read-only, row IDs plus cost/outcome provenance are available through `?include=provenance`, and a fail-closed cost-adjusted evidence gate sits before entry-like execution and hosted alert fan-out.

Production OHLCV retrieval now returns an explicit unavailable result when observed providers fail; the synthetic-candle production fallback has been removed. Resolution writers refuse unobserved sources and stamp the provider plus resolution time on accepted outcomes. These changes prevent the pre-repair snapshot from automatically qualifying as post-repair evidence because its legacy rows do not prove source provenance.

Those changes do not retroactively alter the fingerprinted 3,967-row response above. The exact numbers remain valid only for that dated, pre-repair production snapshot and its then-current denominator. Deploy the repaired version and rerun the public snapshot before calling any result "current" or comparing it directly with post-repair figures.

## LinkedIn-safe copy

> We re-ran TradeClaw's public cost-adjusted test instead of cherry-picking a win.
>
> In a 15 July 2026 snapshot covering 3,967 counted, position-sized signals from 12 April to 14 July, average gross expectancy was +0.015R per signal. After our published fee-and-slippage model, it was -0.418R per counted signal.
>
> The conclusion is narrow but important: this version of the engine did not demonstrate a net edge under the stated assumptions.
>
> These figures describe the fingerprinted 15 July snapshot and the production denominator then in use. They are OHLCV-resolved signal outcomes plus a hypothetical cost/sizing model, not broker fills or customer portfolio returns. The repaired method counts nonzero 24-hour closes, so I will publish a new current figure after that version is deployed and rerun.
>
> Data: https://tradeclaw.win/api/research/cost-field
> Method: https://tradeclaw.win/methodology

Do not replace the last paragraph with "not financial advice" and remove the methodological limitations. A generic disclaimer does not repair an overbroad performance claim.

If the compounded number is mentioned, use this wording:

> A separate sequential simulation risking 1% of current equity per eligible signal rounded to -100%. Because it does not model concurrent exposure or account margin, I do not describe it as an actual portfolio result.

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
| Active TradFi campaigns now | Not supported on 15 July. WEEX says its selected-region zero-fee TradFi campaign ended on 8 July 2026. The outreach may have been timely if sent before then. Ask for a current campaign ID, terms, eligible regions, and end date. |
| Rebate on TradFi volume | Not publicly guaranteed. Obtain written confirmation that each TradFi product is commission-eligible. |
| `@Weex_Illiaa` identity | Unverified. Confirm the contact through `bd@weex.com` or WEEX's published business channel before sharing credentials or announcing a partnership. |

Primary sources:

- WEEX broker API: https://www.weex.com/api-doc/broker/intro
- WEEX broker program: https://www.weex.com/news/detail/weex-api-broker-program-turn-your-trading-platform-into-a-revenue-engine-s25tw96lzabkau5am0yfy9zj
- WEEX TradFi assets: https://www.weex.com/help/articles/help_article_79108
- WEEX TradFi overview: https://www.weex.com/help/articles/help_article_84489
- WEEX promotion end notice: https://www.weex.com/help/articles/djgzm3mmmp14bnzyoj5p1e72

These official pages were rechecked on 15 July 2026. The broker documentation still requires application and approval before a unique broker ID and initial commission rate are issued. The 50%-70% number remains WEEX marketing for trading-fee sharing and is expressly subject to partner verification and changing program terms; it is not a confirmed TradeClaw rate or a percentage of user volume.

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
