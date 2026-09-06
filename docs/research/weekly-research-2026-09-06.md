# Weekly Research — 2026-09-06

Mode: WEEKLY (propose only — no implementation). Read-only on product code.
Branch: `feat/premium-ui-overhaul` @ `39033f21`, upstream even (`0 / 0`). vs `origin/main` (`51f94081`, 2026-08-29): **81 behind / 68 ahead**. No merge/rebase in progress. Recovery stashes `stash@{0}` (tc254) and `stash@{1}` (tc253) preserved untouched. 89 worktrees registered.
Contract: `project-loops` weekly. Ground truth established via `continuous-improvement:reconcile` + `safety-guard` before any write.

**This run is a catch-up for the Friday 2026-09-04 weekly, which never fired.** `loops/state/tradeclaw.STATE.md` records no weekly run after `2026-08-28_0845`; `docs/research/` contains no `weekly-research-2026-09-04.md`. The gap is 9 days. See Escalations.

## Method

- Internal friction/drift (`/continuous-improvement`): every repo claim below was read from **`origin/main`** via `git show origin/main:<path>` / `git grep origin/main`, never from this 81-behind working tree. Where the working tree matters to a correction, it is read separately and labelled as such.
- Live production measurement: read-only `GET` on two public endpoints, fetched 2026-09-06 — `https://tradeclaw.win/api/calibration` and `https://tradeclaw.win/api/track-record/alpha`. No writes, no authenticated calls, no DB access.
- External, cited: the `deep-research` and `market-research` skills route through the firecrawl/exa MCP servers, which are not connected in this headless session. Substituted `WebSearch` + read-only `WebFetch` and say so rather than claim a capability that did not run. All external claims below carry a live URL.

Provenance labelling used throughout: **[PRODUCTION]** = measured from tradeclaw.win on 2026-09-06; **[LOCAL]** = repo artifact that self-labels as local/dev sample; **[CODE]** = source read from `origin/main`; **[DERIVED]** = arithmetic performed here on published inputs, with the inputs shown so it can be rechecked. No metric in this document is synthesized.

## Standing escalation (not a proposal)

This checkout is 81 commits behind `origin/main`, up from 77 on 2026-08-28. Four commits landed on `main` since the last weekly (`2e5fbd77` #221 evidence focus, `ca926f91` state, `9303899f` #223 Lighthouse, `51f94081` #224 state). **None of them touched any of the four proposals from 2026-08-28** — all four were re-verified as still open, and the verification produced one correction and two sharpenings. Any work from these proposals must branch from `origin/main`.

---

## Proposal 1 — The public reliability diagram is range-restricted at 70 by the writer, and the page does not say so

**Problem.** `/calibration` renders a five-band reliability chart. Three of the five bands can never populate, and two of those are empty by policy rather than by absence of data.

[PRODUCTION] `GET /api/calibration` (2026-09-06, `updatedAt` `2026-09-03T16:29:04.425Z`, `"isSimulated": false`, `"insufficientData": false`, `totalSignals` 5316):

| Band | n | wins | realized win rate | calibrationError |
|---|---|---|---|---|
| 50–59% | 0 | 0 | null | null |
| 60–69% | 0 | 0 | null | null |
| 70–79% | 3,195 | 1,211 | **37.902973%** | 0.365970 |
| 80–89% | 2,121 | 722 | **34.040547%** | 0.504595 |
| 90–99% | 0 | 0 | null | null |

Brier `0.40057200902935264`, ECE `0.42127915726109855`. 3,195 + 2,121 = 5,316, so every counted-resolved signal still sits in 70–89.

[CODE] The cause of the two empty low bands is a server-side publication floor, not a UI filter. `apps/web/lib/signal-thresholds.ts:1` sets `PUBLISHED_SIGNAL_MIN_CONFIDENCE = 70`, and the cron writer applies it *before recording*: `apps/web/app/api/cron/signals/route.ts:159` calls `getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE })` and `:161` re-filters `s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE`. The same floor gates `api/live-feed/route.ts:11,19`, `api/badge/badge-state.ts:53,60`, `api/signal-of-the-day/route.ts:48,73`, `api/signals/record/route.ts:17`, `api/v1/signals/route.ts:73,133`, and `api/v1/badge/[pair]/route.ts:15`. Sub-70 signals are scored by the engine and then never enter the ledger `/api/calibration` reads (`readHistoryAsync()` → `isCountedResolved`, `api/calibration/route.ts:45-51`).

[CODE] The chart declares the full range anyway: `BUCKETS` in `api/calibration/route.ts:28-34` hard-codes all five bands from 50% up, and `CalibrationClient.tsx` carries no text explaining why three are empty (grep for the threshold constant or a truncation note returns only Tailwind opacity values). A reader sees a five-band axis with two points on it and no statement that the low bands are structurally unreachable.

[DERIVED] Two checks on the numbers, so the finding does not rest on trust:
- ECE reproduces exactly from the two populated rows: (3195 × 0.365970 + 2121 × 0.504595) / 5316 = 2239.520 / 5316 = **0.4212791**, matching the reported `ece` to seven places. The figure is arithmetically consistent, not a rendering artifact.
- The inversion inside the observable range is statistically significant, which last week's weekly asserted but did not test. Two-proportion z-test on 1211/3195 vs 722/2121, pooled p = 1933/5316 = 0.3636193, SE = 0.0134733, **z = 2.867, two-sided p ≈ 0.0041**. The higher band really does win less.

[DERIVED] And the honest counter-reading, reported because the brand forbids cherry-picking: on the **414 signals resolved since 2026-08-28** the ordering flips. 70–79 gained 272 rows and 98 wins (36.03%); 80–89 gained 142 rows and 52 wins (36.62%). That difference is z = 0.12, p ≈ 0.91 — indistinguishable from noise, and it does not overturn the cumulative result, but it is the direction that would be omitted by a site that cherry-picks, so it is stated here.

**Proposed change (future PR, propose-only here).** Three separable pieces, smallest first. (1) Label the truncation on `/calibration` and in the API payload: state that only signals scoring ≥ 70 are ever recorded, so the 50–69 bands are empty by publication policy and not by absence of losing signals, and that 90–99 has never been emitted by the scorer. (2) Publish a shadow ledger for suppressed sub-70 signals — scored, outcome-tracked, never shown as tradeable — so the low bands become populatable and monotonicity becomes testable over the real range instead of over a 20-point slice. (3) Drop score-descending as the default screener sort (`ScreenerClient.tsx:418-419` defaults `sortKey: 'confidence'`, `sortDir: 'desc'`; `api/screener/route.ts:123` sorts `b.confidence - a.confidence`) until the score earns monotonicity. Do not silently re-weight the generator — that hides the finding instead of publishing it.

**Evidence.** [PRODUCTION] `/api/calibration` payload above. [CODE] `signal-thresholds.ts:1`; `api/cron/signals/route.ts:159,161`; `api/calibration/route.ts:28-34,45-51`; `ScreenerClient.tsx:418-419`; `api/screener/route.ts:123`. External: selection on a predictor truncates its observed range and attenuates the predictor–outcome relationship, and outcome data are missing for the rejected cases by construction — the standard range-restriction result ([range restriction and the Thorndike correction](https://www.cogn-iq.org/learn/theory/range-restriction/), [correcting predictive validity for indirect range restriction, PMC5725878](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5725878/)); ECE is the size of the gap between the reliability curve and the diagonal weighted by bin size, so an ECE computed over two bins is not the same statistic as one computed over five ([reliability diagram and ECE](https://metricgate.com/docs/reliability-diagram-calibration/), [calibration, confidence and ECE](https://mbrenndoerfer.com/writing/calibration-machine-learning-confidence-accuracy-ece)). Market: 2026 buyer guidance treats the full trade log as the credibility test — "if a provider won't show you their full trade log, the AI claim is marketing, not reality" — and warns that headline accuracy on a narrow, well-defined subset is only credible when the subset is declared ([best crypto signal services 2026](https://aotrading.io/blogs/best-crypto-signal-services-2026), [expected win rates 2026](https://targethit.ai/blog/crypto-trading-signal-win-rate)).

**Effort/impact.** Effort: low for (1) — copy plus one payload field; medium for (3) — a default change plus tests; medium-high for (2), which needs a writer path and storage for signals that are deliberately not shown. Impact: high. (1) alone converts a chart that quietly implies a five-band range into one that states its own limits, and it is the cheapest defensible fix on this list.

**Brand-alignment:** "Radical transparency (wins AND losses, no cherry-picking)" applies to the sample, not only to the rows inside it. A reliability chart that silently excludes every signal below 70 is publishing a filtered log while presenting it as the record.

**Grill verdict:** SURVIVED — the strongest objection is that suppressing sub-70 signals is correct product behaviour, so excluding them from calibration is consistent rather than deceptive. That is right about the suppression and wrong about the chart: the route deliberately renders 50–59 and 60–69 bands, which asserts that those bands are meaningful and merely unpopulated. The same file already carries a comment describing a prior bug where empty buckets fell back to `winRate = midpoint` and the chart read as "perfectly calibrated — fabricated by construction" (`api/calibration/route.ts:36-41`). That bug was fixed honestly. This is the same class of defect one layer up: not fabricated points, but an axis that promises a range the data can never cover.

## Proposal 2 — The D1 alpha gate has no terminal state, so a lane that never trades reads "collecting evidence" forever

**Problem.** The prospective ledger keeps reporting honestly, and what it now reports is worse than nine days ago.

[PRODUCTION] `GET /api/track-record/alpha`, 2026-09-06 against the 2026-08-28 reading recorded in last week's weekly:

| Field | 2026-08-28 | 2026-09-06 | Δ |
|---|---|---|---|
| calendarDays | 18 | 27 | +9 |
| consecutiveSnapshots | 19 | 28 | +9 |
| closedSleeveTradeCount | 0 | **0** | 0 |
| strategyNetReturn | +9.99% | **+8.732507%** | −1.26 pts |
| benchmarkNetReturn | +26.34% | +24.889428% | −1.45 pts |
| activeReturn | −16.35% | **−16.156921%** | +0.19 pts |
| strategyMaxDrawdown | 2.72% | **4.359046%** | +1.64 pts |
| benchmarkMaxDrawdown | 3.04% | 4.372139% | +1.33 pts |
| unresolvedCadenceGaps | 0 | 0 | 0 |

`verifiedRowCount` 28, `label` `"collecting evidence"`, `promotionStatus` `"not-promoted"`, `gateStatus` `"collecting-evidence"`, `observationMinimumMet` false, `performanceGateEvaluated` false, `latestBarDate` `2026-09-06`. The published `ruleSha256` `a9c222a33f3e1e0c70e8fb5f0bfa930dc6433297d9dcb27ef2b825f08da3b171` and `artifactSha256` `1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90` both match `D1_ALPHA_RULE_SHA256` and `D1_ALPHA_ARTIFACT_SHA256` in `apps/web/lib/d1-alpha-protocol.ts:6-9` — the frozen protocol is intact and the writer ran today.

[DERIVED] The one favourable number the lane had is gone. On 2026-08-28 the strategy's max drawdown beat the benchmark's by 32 basis points. Today it beats it by **1.3 basis points** (0.04359046 vs 0.04372139). The gate check is `drawdownNoWorse: metrics.strategyMaxDrawdown <= metrics.benchmarkMaxDrawdown` (`d1-alpha-protocol.ts:473`), so it still passes, by a margin thinner than a single day's move.

[DERIVED] Applying the published gate logic to the published numbers — arithmetic on public inputs, not a claim the API makes — the four performance checks (`:471-476`) would today evaluate: `positiveStrategyReturn` **true** (0.0873 > 0); `positiveActiveReturn` **false** (−0.1616); `drawdownNoWorse` **true** (by 1.3 bp); `calmarNoWorse` **false** — `calmar` is `annualizedReturn / maxDrawdown` over the same `calendarDays` for both legs (`:401-408`), so 0.0873/0.04359 ranks below 0.2489/0.04372 regardless of the annualisation factor. Two of four fail. The lane would be `failed-gate` if it were evaluated. It will not be evaluated.

[CODE] **The structural defect.** `evaluateD1AlphaGate` (`d1-alpha-protocol.ts:444-482`) builds `observationChecks` from calendar days ≥ 365, snapshots ≥ 365, closed trades ≥ 12, cadence, and integrity, then: `if (!observationMinimumMet || metrics === null) return { status: 'collecting-evidence', ... }`. There is no calendar-expiry branch and no terminal status for "the window ran out and a minimum was never met." `D1_ALPHA_MIN_CLOSED_TRADES = 12` (`:16`); `closedTrades` accumulates only on `EXIT_GATE` / `EXIT_STOP` (`:256`), summed across the BTC and ETH legs and capped at 2 per snapshot (`d1-alpha-ledger.ts:213-215`). If the sleeve closes fewer than 12 trades in 365 days, `observationMinimumMet` stays false and the lane returns `collecting-evidence` **past day 365, indefinitely** — never `failed-gate`, never `eligible-for-review`.

To be fair to the strategy: 0 closes at day 27 is **not** evidence of a broken lane. A D1 slow gate holding a position for 27 days is normal, and `D1_ALPHA_MAX_DIRECTION_CHANGES = 30` (`:19`) shows the protocol expects low turnover. The required average pace is 12 closes / 365 days = **one per 30.4 days**, so at day 27 with zero the lane is at the boundary, not behind it. The defect is that nothing measures this, nothing publishes it, and no rule fires if it does fall behind — a healthy slow strategy and a gate that can never resolve are currently indistinguishable from the outside.

**Proposed change (future PR).** Two pieces, and the first is cheap. (1) Add a terminal `insufficient-activity` status returned when `calendarDays >= D1_ALPHA_MIN_CALENDAR_DAYS` but `closedTrades < D1_ALPHA_MIN_CLOSED_TRADES`, so the window closing is an outcome rather than a silence, and surface the closure pace on `/track-record/alpha` as "0 of 12 closed trades, day 27 of 365; required pace 1 per 30.4 days" so a reader can see the lane tracking or not tracking against its own minimum. (2) Then the pre-registered futility boundary carried from 2026-08-28 P4: freeze and publish it under the same rule-hash discipline before it is ever evaluated, evaluate it at fixed interim fractions of the window, scope it to futility only — no early promotion path, no change to the frozen entry rule — and give it its own `failed-futility` status so the ledger records *why* a lane stopped. Piece (1) does not touch the frozen rule at all and is worth shipping alone.

**Evidence.** [PRODUCTION] the alpha payload above and last week's, both fetched read-only. [CODE] `d1-alpha-protocol.ts:6-9` (hashes matching production), `:16` (12-trade minimum), `:19` (30 direction changes), `:256` (closure increment), `:401-408` (calmar), `:444-482` (the gate with no terminal branch); `d1-alpha-ledger.ts:213-215` (0–2 increment bound). External: futility exists precisely to abandon early without the multiple-comparisons cost of ad-hoc peeking, and stopping reasons in practice include event rates too low to support a meaningful comparison, which is this case ([futility in clinical trials, JAMA guide](https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930), [systematic survey of trials stopped early for futility, BMC Med Res Methodol](https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1), [standardising interim-analysis terminology, arXiv 2410.01478](https://arxiv.org/pdf/2410.01478)).

**Effort/impact.** Effort: low for (1) — one status value, one comparison, one display string, no change to the frozen rule or to how snapshots are written; medium for (2). Impact: high. "Auto-demote strategies that lose edge" cannot apply to the flagship prospective lane while the lane has no state that means "this did not work out."

**Brand-alignment:** Disciplined risk management requires that a lane can end. A gate whose only reachable state after a failed minimum is "collecting evidence" converts an honest negative result into an indefinite pending one, which is how every cherry-picking track record on the market already works.

**Grill verdict:** SURVIVED — the serious objection is that this is hypothetical: the lane is at day 27, on pace, and the branch may simply never be reached. Two answers. The status branch is reachable by construction regardless of this lane's outcome, and it is 1.3 basis points of drawdown from being the difference between a published `failed-gate` and 338 more days of "collecting evidence." A second objection — that adding interim looks to a frozen protocol is peeking dressed as method — applies to piece (2) and is why it is scoped to a pre-registered, published-before-evaluated, futility-only boundary; it does not apply to piece (1), which adds no look at performance at all, only a check on whether the observation window can still complete.

## Proposal 3 — The decay trigger compares a scanner baseline against web win rates, and the artifact says so itself

**Problem.** Three defects in one mechanism, and the third is a correction to last week.

*Staleness.* [LOCAL] `apps/web/data/strategy-decay-metrics.json` was last written by commit `59ccb823` (2026-06-04, 94 days ago) and its `date_range` ends `2026-06-02` — **96 days** without a refresh as of today, up from the 86 reported on 2026-08-28. `git grep -l compute-strategy-decay origin/main` returns only consumers — the admin page, two sibling data files, `apps/web/lib/strategy-library.ts`, and two 2026-06-03 marketing docs. There is no workflow, no cron route, and no scheduled job that regenerates it, and the admin page renders it with no freshness stamp, so a June snapshot is indistinguishable from a current healthy reading.

*A threshold that cannot fire.* [LOCAL/CODE] The rule is `flag when rolling_90d_win_rate < 0.5 * historical_baseline`, baseline 50.8%, trigger 25.4% (`_meta.decay_rule`, `_meta.decay_threshold_pct`, mirrored at `strategy-library.ts:125-133`), with `min_sample_for_window` 20. `hmm-top3` sits at 33.7% rolling-90d on n=332 and is not flagged; it would have to shed a further 8.3 points.

*The comparison is cross-methodology — and the artifact admits it.* This is where last week's weekly overreached. Its P2 read the 33.7%-vs-50.8% gap as "a 17.1-point absolute drop, a 33.7% relative loss of edge." The artifact's own `_meta.cross_source_note` says that reading is not available: the 50.8% baseline is **scanner** methodology (`TP1_HIT|EXPIRED_PROFIT` from `signals.db`) while `hmm-top3`'s rate is **web** methodology (`isCountedResolved` + `hit === true` on `signal-history.json`), that "the stricter web win definition understates hmm-top3 against the looser scanner baseline," and that the comparison is "only INDICATIVE." So the trigger is worse than loose — it is a threshold derived from one measurement definition and applied to numbers produced by another, and the file documents this in the same object.

[PRODUCTION] The scale of the mismatch is now measurable rather than assumed. `/api/calibration` gives a production, web-methodology pooled win rate of 1,933 / 5,316 = **36.36%** on non-simulated data. The LOCAL baseline the decay rule is calibrated against is 50.8%. A 14.4-point definitional gap sits between the threshold and the numbers it judges, before any question of edge decay arises.

*And it gates nothing.* [CODE] `apps/web/app/lib/signal-generator.ts` still contains exactly two suppression gates — market hours (`:670`) and ADX (`:673`). No decay or demote hook exists in the delivery path; `decay_status` / `auto_demote` (`strategy-library.ts:40-41,59-60`) are consumed only by `apps/web/app/admin/strategy-library/page.tsx`.

**Proposed change (future PR).** Order matters and the cheap steps come first. (1) Stamp the artifact with `generated_at` and surface a "stale, last observed &lt;date&gt;" state anywhere decay is displayed, so a dead monitor reads as dead — the artifact's own `_meta.provenance` already says "LOCAL scanner/dev samples — NOT production Railway Postgres," and that label is currently invisible to the operator reading the page. (2) Compute a **web-methodology** baseline from the production ledger so the trigger and the measurement share a definition; until that exists no threshold on this artifact means anything, and the number to beat is a real one — 36.36% pooled, measured today. (3) Replace the `0.5 × baseline` floor with a one-sided binomial test of the rolling window against the frozen like-for-like baseline, keeping the `min_sample_for_window` 20 floor, so a statistically significant loss of edge flags rather than only a catastrophic one. (4) Only then wire the flag into the delivery path, and show a demoted strategy *as demoted with its decay evidence*, never silently withheld.

**Evidence.** [LOCAL] `strategy-decay-metrics.json` `_meta` (`historical_baseline_pct` 50.8, `decay_threshold_pct` 25.4, `min_sample_for_window` 20, `win_definition`, `cross_source_note`, `provenance`) and `strategies.hmm-top3` (`resolved_signals` 332, `wins` 112, `rolling_90d.win_rate` 33.7, `rolling_30d` 62/201 = 30.8, `realized_rr_mean_pct` −0.12, `date_range` ends 2026-06-02); last-touch commit `59ccb823` 2026-06-04. [PRODUCTION] pooled 1,933/5,316 = 36.36% from `/api/calibration`. [CODE] `strategy-library.ts:40-41,59-60,125-133`; `signal-generator.ts:670,673`; absence of `compute-strategy-decay` from `.github/workflows/`. External: alpha decay is continuous and is detected by rolling re-evaluation, which is the thing not running here ([signal decay patterns](https://microalphas.com/signal-decay-patterns/), [Foxholm on signal decay](https://foxholm.com/q/concepts/signal-decay/)).

**Effort/impact.** Effort: low for (1); medium for (2), which is a definitional alignment rather than new statistics; medium for (3) and (4). Impact: high. "Disciplined risk management (auto-demote strategies that lose edge)" is a headline brand claim currently backed by a 96-day-old LOCAL snapshot judged against a threshold that the artifact itself labels cross-method and indicative.

**Brand-alignment:** "Distinguish LOCAL scanner/dev samples from production verified record" is a verbatim project constraint, and this artifact is the clearest case of the two being mixed — a scanner baseline setting the trigger for web-methodology numbers, rendered to an operator with no staleness or provenance signal.

**Grill verdict:** SURVIVED — "this is just a stale dev artifact, not a product defect" fails because `strategy-library.ts` loads it into an operator-facing surface with no staleness signal, so it actively reassures. "Tightening the threshold will spam demotions" is answered by keeping the n ≥ 20 floor and requiring significance. The proposal is strictly narrower than last week's version, because last week's central number — a 17.1-point drop read as a real loss of edge — does not survive the artifact's own `cross_source_note` and is corrected below.

## Proposal 4 — Mount the already-shipped provenance badge on `/track-record` and `/calibration` (carried, re-verified, still unbuilt)

**Problem.** Unchanged since 2026-08-28 and re-verified against `origin/main` today: the brand constraint "distinguish LOCAL scanner/dev samples from production verified record" is enforced on one surface and absent from the two carrying the strongest numbers.

[CODE] `apps/web/components/data-provenance-badge.tsx` already exists and already models the distinction — `export type DataProvenance = 'live' | 'mixed' | 'simulated' | 'empty'`, localized, with a source tooltip. `git grep -l data-provenance-badge origin/main` returns four paths and only two are code: `apps/web/app/accuracy/AccuracyClient.tsx` and `apps/web/app/components/accuracy-stats-bar.tsx` (the others are `DAILY_INTEL_LOG.md` and `docs/reports/2026-05-29-uiux-flow-audit.md`). `/accuracy` is labelled. `/track-record` is not — `TrackRecordClient.tsx:12` imports only `isObservedOHLCVOutcomeSource`, which answers "was this row's outcome observed from a price feed," a per-row question rather than a dataset-origin one. `/calibration` is not labelled either, and the gap there is now demonstrably one field wide: the payload measured today already carries `"isSimulated": false` and `"insufficientData": false`, and neither reaches the page.

**Proposed change (future PR).** Thread the existing `DataProvenance` value into the `/track-record` and `/calibration` responses and render the existing badge. No new component, no new vocabulary, no new copy to keep in sync across locales.

**Evidence.** [CODE] `data-provenance-badge.tsx` (type + config); importer list from `git grep -l data-provenance-badge origin/main`; `TrackRecordClient.tsx:12`. [PRODUCTION] `isSimulated` / `insufficientData` present in the live `/api/calibration` payload above, unlabelled in the UI. Market: 2026 buyer guidance separates a published live track record from backtest or demo output as the credibility test, and ranks platforms with transparent, verifiable histories above those relying on advertised numbers ([AI trading signals platform comparison 2026](https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide), [best crypto signal services 2026](https://aotrading.io/blogs/best-crypto-signal-services-2026)).

**Effort/impact.** Effort: low — one field threaded per surface, component already shipped and localized. Impact: medium-high — closes a verbatim brand constraint on the two surfaces a skeptic checks first, at near-zero design cost. This is the cheapest item on the list and it has now been open for two consecutive weeklies.

**Brand-alignment:** The constraint is project policy word-for-word; the component that satisfies it exists and is simply not mounted where it matters most.

**Grill verdict:** SURVIVED — "the row-level observed/unverified label already covers it" is still false: observed-source is not dataset-origin, and a LOCAL sample row can be observed-OHLCV and read as verified. Carrying an unchanged proposal is itself a weak move, so the honest statement is that this survived because it was re-verified as unbuilt, not because it is new.

---

## Corrections to the 2026-08-28 weekly

1. **The screener does not default to a ≥ 70 filter. That claim was wrong.** Last week's P1 cited `ScreenerClient.tsx:406` for `minConfidence: 70`. On `origin/main` the default is `STARTER_FILTERS.minConfidence = 0` at `ScreenerClient.tsx:98`, and the 81-behind working tree has `0` at the same line — so this was a misreading, not a stale-tree artifact, and it was never true on either tree. What survives is narrower and, as it turns out, more interesting: the default *sort* is still descending on the rule score (`:418-419`, plus `api/screener/route.ts:123`), and the reason every resolved signal sits in 70–89 is the server-side publication floor in the cron writer, not a UI filter. Proposal 1 is rebuilt on the writer, which is where the truncation actually happens.
2. **The `hmm-top3` decay reading overstated the case.** Last week's P2 read 33.7% against a 50.8% baseline as "a 17.1-point absolute drop, a 33.7% relative loss of edge." The artifact's own `_meta.cross_source_note` states the two figures use different win definitions and that the comparison is "only INDICATIVE." Proposal 3 replaces the claim with the defect that does survive: the trigger is cross-methodology by construction.
3. **Line numbers moved.** The `api/screener/route.ts` sort is at `:123`, not `:121`, after `2e5fbd77` (#221). The sort itself is unchanged.

## Findings that died under verification this run (recorded, not proposed)

- **"Zero closed trades at day 27 means the D1 lane is broken or the closure counter is not wired."** False on both counts. `closedTrades` increments at `d1-alpha-protocol.ts:256` on `EXIT_GATE`/`EXIT_STOP` and is validated as a 0–2 integer per snapshot at `d1-alpha-ledger.ts:213-215`; a D1 slow gate holding for 27 days is expected behaviour given `D1_ALPHA_MAX_DIRECTION_CHANGES = 30` per year, and the required pace is one closure per 30.4 days, so the lane is at the boundary rather than behind it. Proposal 2 was rewritten around the gate's missing terminal state, which is a real defect independent of how this particular lane performs.
- **"The calibration chart's empty bands are a data-volume problem that will resolve as signals accumulate."** False. `totalSignals` rose 4,902 → 5,316 in nine days and all 414 new rows landed in 70–89, because the writer filters at 70 before recording (`api/cron/signals/route.ts:161`). The low bands cannot fill with more time; they are empty by policy.
- **"The four #221–#224 commits on `main` may have addressed last week's proposals."** False. Each of P1–P4 was re-verified at source against `origin/main` and all four remain open; #221 touched `ScreenerClient.tsx` without changing the default that mattered.

## Lessons and escalations

`loops/state/tradeclaw.STATE.md` has no `## Lessons` or `## Escalations` heading anywhere in its 362 lines — the file is machine run-records only, and the append is blocked at the harness sensitive-path layer (the loop's `loops/state/` directory is outside the granted write scope; `gateguard` clears it and the harness then denies it, the two-layer pattern recorded on 2026-09-03). Per the loop contract these are recorded in the committed artifact instead, unabridged.

**Lessons (durable)**

1. **A repo grep proves a line exists; it does not prove the line is the one that runs.** Last week's "the default screener filters to ≥ 70" was wrong, and the truth — a server-side publication floor applied in the cron writer before recording — was both more consequential and one grep away. Verify a claimed default by reading the initialiser, not by finding the constant.
2. **Read the artifact's own caveats before quoting its numbers.** `strategy-decay-metrics.json` documents in `_meta.cross_source_note` that its baseline and its per-strategy rates use different win definitions. Last week quoted them as like-for-like. The file said not to, in the same object.
3. **Compute the significance test before calling a gap a finding.** The 70–79 vs 80–89 inversion is real (z = 2.87, p ≈ 0.004) — and the same arithmetic showed the last nine days' 414 signals point the other way at p ≈ 0.91. Both belong in the document; a brand built on "no cherry-picking" cannot report only the one that supports the proposal.
4. **A read-only GET on a public production endpoint remains the cheapest way to turn a repo-shaped guess into a measured fact, and it stays inside the propose-only boundary.** Both headline datasets here came from two unauthenticated GETs.
5. **When a named research tool is unavailable, substitute and say so.** The `deep-research` and `market-research` skills depend on MCP servers not connected in this headless session; reporting them as "run" would have been the same class of error as publishing an unmeasured metric.

**Escalations (owner decision required)**

1. **The Friday 2026-09-04 weekly never ran, and it did not self-heal.** `loops/state/tradeclaw.STATE.md` records no weekly after `2026-08-28_0845`, and `docs/research/` holds no `weekly-research-2026-09-04.md`. The daily loop caught up on 2026-09-06 under the `_1634` stamp; the weekly did not, because `promptFile.weekly` is `null` in `loops/projects/tradeclaw.json:10`, so the weekly rides a separate scheduler entry that the wake-on-catch-up did not reach. This run is the manual catch-up. Owner call: is the weekly's scheduler entry still registered?
2. **The published reliability diagram is range-restricted at 70 and does not disclose it.** n = 5,316, non-simulated; 3 of 5 bands structurally unreachable; ECE 0.4213 computed over 2 bins; the inversion inside the observable range is significant at p ≈ 0.004. Owner call: label the truncation now (cheap), and separately, shadow-record sub-70 outcomes so the score can be falsified over its real range?
3. **The D1 alpha lane's only passing performance advantage is 1.3 basis points wide, and the gate cannot record a failure.** Strategy drawdown 4.359046% vs benchmark 4.372139%; active return −16.16% at day 27 of 365; two of four performance checks would fail today; `evaluateD1AlphaGate` has no terminal state for an unmet observation minimum, so a lane that never reaches 12 closed trades reads "collecting evidence" past day 365 forever. Owner call: add `insufficient-activity` as a terminal status independent of the futility question?
4. **The edge-decay monitor has not run in 96 days and its threshold is cross-methodology.** Last written 2026-06-04, `date_range` ends 2026-06-02, nothing regenerates it, and the 25.4% trigger derives from a 50.8% scanner baseline applied to web-methodology rates the artifact itself calls "only INDICATIVE." Production web-methodology pooled win rate measured today is 36.36%. Owner call: schedule regeneration and compute a like-for-like baseline?
5. **Branch divergence is widening.** `feat/premium-ui-overhaul` is 81 behind / 68 ahead of `origin/main`, up from 77/56 on 2026-08-28. No PR was opened for it this run: it carries 68 commits of unrelated UI overhaul work this loop does not own, so a PR would bundle them behind a research document.

## Sources

- Range restriction / selection effects: https://www.cogn-iq.org/learn/theory/range-restriction/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5725878/
- Calibration metrics and reliability diagrams: https://metricgate.com/docs/reliability-diagram-calibration/ , https://mbrenndoerfer.com/writing/calibration-machine-learning-confidence-accuracy-ece
- Futility / interim analysis / stopping: https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930 , https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1 , https://arxiv.org/pdf/2410.01478
- Alpha / signal decay: https://microalphas.com/signal-decay-patterns/ , https://foxholm.com/q/concepts/signal-decay/
- Market / competitive: https://aotrading.io/blogs/best-crypto-signal-services-2026 , https://targethit.ai/blog/crypto-trading-signal-win-rate , https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide

## Status

4 proposals — P1 calibration range restriction (new, replaces last week's P1 on a corrected mechanism), P2 D1 gate terminal state + 9-day degradation (sharpened, absorbs last week's P4), P3 decay monitor staleness + cross-methodology trigger (sharpened, corrects last week's P2), P4 provenance badge reuse (carried unchanged, re-verified unbuilt). 3 corrections to the 2026-08-28 weekly, 3 candidate findings killed under verification, 5 escalations, 1 standing escalation (branch 81 behind `origin/main`).

Previously killed seeds not re-proposed: the public calibration surface (shipped on `main` — `/calibration` page, client, API, tests, sitemap and footer links) and Pro conversion funnel hardening (`apps/web/app/pricing/page.tsx` is a `redirect('/track-record')`; migration `053_drop_monetization.sql` removed subscriptions and tiers — there is no funnel to harden, and proposing one would contradict the shipped OSS pivot).

Propose-only: no product code edited, no migration run, no domain, claim, or secret changed, no production PR opened, no write to Stripe or the signals table, no push to `main`. Two read-only public GETs and three web searches were the only network calls. Committed by explicit path to `feat/premium-ui-overhaul`.

**Grill verdict: SURVIVED**
