# TradeClaw weekly research — 2026-10-23

Mode: weekly (propose only). Branch: `feat/premium-ui-overhaul` @ `6e4a766e`, even with its upstream, 82 behind / 131 ahead of `origin/main`. `origin/main` has not moved since the last weekly: still `9ecee0a0` (PR #232, 2026-10-14). No PR opened or merged since. Seven open PRs, all last updated on or before 2026-08-29.

Label convention, unchanged from the corpus: `[PRODUCTION]` = read from a live public GET today. `[SOURCE]` = read from a git ref, file and line cited. `[DERIVED]` = arithmetic shown. `[INFERRED]` = reconstructed, not read.

---

## The organizing fact of this week

**The repo already ran the weak-pair experiment the seed list keeps asking for, and the out-of-sample answer is null.** On 2026-05-02 a 30-day backtest picked six (pair, direction) "winning cells" at 52.9–67.9% win rate. The module was deleted on 2026-07-15 with no verdict recorded anywhere on `main`. Today's production window starts 2026-07-06, after the selection date, so it is out-of-sample by construction. Pooled across today's window, the six cells win **36.06%** (419 / 1,162). Every other cell wins **36.00%** (2,384 / 6,623).

The same pattern sits under all three proposals below. A ranking or a label gets built from one sample, then outlives it without being re-measured.

---

## Method

Ground truth first (`continuous-improvement:reconcile` + `safety-guard`): branch and HEAD snapshotted, `git update-index --refresh` before reading drift, `git diff --stat` empty (clean tree), no in-progress merge/rebase, two August stashes on unrelated branches, `origin` fetched, upstream even (`git ls-remote` = HEAD). Write scope held to this file and the loop state file.

Internal friction via `/continuous-improvement` discipline and read-only `git show origin/main:<path>` / `git grep` / `git log -S`. External evidence via `WebSearch` / `WebFetch`. **Declared substitution, sixth consecutive run:** `/deep-research` and `/market-research` depend on firecrawl/exa MCP servers; `ToolSearch` for "firecrawl exa" returned neither. No product file was edited.

Scope check: `origin/main` is byte-identical to the ref the 10-16 weekly measured, so every `[SOURCE]` line carried from it is unchanged.

The 10-22 daily FAILed(2). Log line 2 says "You've hit your weekly limit". All 8 loop logs stamped 2026-10-22_2348 on this machine match it, so this was account quota, not a project failure. No backfill was attempted.

---

## Proposal 1 — Publish the verdict on the deleted "winning cells" hypothesis, and make it the persistence rule for any weak-pair suppression

**What the hypothesis was.** [SOURCE] `git show 40dd669c^:apps/web/lib/winning-cells.ts:1-43`: "The 30-day backtest on 2026-05-02 across signal_history showed that the full-fire engine produced a 36.1% win rate at +0.05% expectancy ... six (pair, direction) cells that delivered 53–68% win rates with strongly positive per-trade expectancy." The file's own words: "**The set is a hypothesis, not a permanent config.** Re-run the segment-slice SQL after each shadow window and prune / add cells." It gated fan-out only. "Every signal still lands in `signal_history`", so all six cells kept being scored whether or not the gate was ever active.

**What happened to it.** [SOURCE] Deleted in `40dd669c` (2026-07-15, "fix(integrity): require reproducible trading evidence", 599 files, +16,691/−21,740), along with its 110-line test. `git grep -i "winning.cells"` over `origin/main` `docs/`, `apps/web/data`, `apps/web/app` returns **zero hits**. No REGISTRY entry, no plan update, no verdict.

**The out-of-sample result.** [PRODUCTION] `/api/v1/win-rates`, `generated_at` 2026-10-23T00:51:49.513Z. Window from the fresh `/api/calibration` body (same reader): `windowStart` 1783346400000 = **2026-07-06T14:00Z**, `windowEnd` 1792705500000 = **2026-10-22T21:45Z**. [DERIVED: 1783346400000 / 86,400,000 = 20,640.5833 days since epoch = 2026-01-01 + 186 d + 14 h.] The window starts 65 days after the selection date and does not overlap the 30-day selection period.

| Cell | In-sample win rate (05-02) | Out-of-sample n | wins | win rate | rank of 52 |
|---|---|---|---|---|---|
| XAUUSD BUY | 67.9% | 107 | 38 | 35.5% | 25 |
| XAGUSD BUY | 61.7% | 105 | 27 | **25.7%** | **50** |
| USDJPY SELL | 57.4% | 206 | 83 | 40.3% | 13 |
| AUDUSD BUY | 56.1% | 182 | 62 | 34.1% | 28 |
| BTCUSD BUY | 53.8% | 286 | 121 | 42.3% | 9 |
| DOGEUSD BUY | 52.9% | 276 | 88 | 31.9% | 37 |
| **Pooled six** | 52.9–67.9% | **1,162** | **419** | **36.06%** | — |
| All other 46 cells | — | 6,623 | 2,384 | **36.00%** | — |

[DERIVED] Pooled: 107+105+206+182+286+276 = 1,162; 38+27+83+62+121+88 = 419; 419/1,162 = 0.36059. Rest: 7,785 − 1,162 = 6,623; 2,803 − 419 = 2,384; 2,384/6,623 = 0.35996. Gap **+0.06 pt**. Approximate 95% interval on the pooled rate: ±1.96 × √(0.3606 × 0.6394 / 1,162) = ±2.76 pt, i.e. **[33.3%, 38.8%]**. The lowest in-sample rate (52.9%) is 14 points above its top. XAGUSD BUY alone, Wilson 95%: **[18.3%, 34.8%]**, against 61.7% in-sample.

All six are shown, including the two that still sit above baseline (BTCUSD BUY rank 9, USDJPY SELL rank 13). Showing only XAGUSD would be its own cherry-pick.

**What this does and does not say.**
- It says: under the current engine and counting rules, the six cells selected on 2026-05-02 perform like everything else.
- It does not say the May backtest misreported May. The engine was remade in June, and `40dd669c` changed which outcomes count. The test is "did the selection carry forward", and it did not.
- Expectancy out-of-sample is **pending real data**. The hypothesis was also selected on avg P&L, and `/api/v1/win-rates` publishes no R or P&L. The owner can compute it from `signal_history`; this run cannot.
- Assumption recorded here because the assumption tool was not permitted in this headless run: the comparison uses the 24h TP-before-SL win definition the endpoint uses, which may differ from the May backtest's definition.

**Ask (two parts, each shippable alone):**
1. **Record the verdict.** Add an entry to `docs/research/experiments/REGISTRY.md` in the format it already uses for external papers: hypothesis (six cells, 2026-05-02, in-sample 52.9–67.9%), out-of-sample window 2026-07-06 → 2026-10-22, win rate 36.06% vs 36.00% rest on n = 1,162, **verdict FAIL on win rate**, expectancy pending the owner's query.
2. **Adopt it as the pre-registered rule for weak-pair suppression.** That seed has been proposed in some form on 07-17, 07-31, 08-21 and 10-09. This is the first measured input to its design. Any cell-level suppress or promote decision must hold in two disjoint cohorts before it acts. Suppressed cells stay scored in public (the 05-02 module already did this correctly). The unit is symbol×direction, per Proposal 2.

Effort: part 1 small (one REGISTRY entry plus one owner SQL query for expectancy); part 2 small (a paragraph in whichever spec ships suppression). Impact: high. This is the only out-of-sample test of cell selection the repo contains, and it is negative.

Evidence: `40dd669c^:apps/web/lib/winning-cells.ts:1-43`; `git show 40dd669c --stat`; `git grep` zero hits on `origin/main`; `/api/v1/win-rates` and `/api/calibration` today. External: selecting the best performers from many backtested configurations inflates in-sample performance, and standard hold-out checks are "unreliable and inaccurate" in investment backtests ([Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance, 2015](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting); [SSRN 2326253](https://papers.ssrn.com/abstract=2326253)). Picking 6 of 52 cells on 30 days of data is that selection problem on a small scale.

**Brand-alignment:** "Wins AND losses, no cherry-picking" applies to TradeClaw's own hypotheses as much as to its trades. A selection rule that was built, deleted and never scored is an unpublished loss. REGISTRY already publishes FAIL verdicts for outside papers, and this one is internal.

**Grill verdict:** SURVIVED. Objection one: "different engine, different counting rule, not a fair replication." Accepted, and the claim is narrowed to match: the selection did not carry forward. That is the only question a suppression or promotion rule needs answered. Objection two: "signals cluster in time, so n = 1,162 overstates precision." True. Clustering widens the interval, but the point estimate sits 0.06 pt from baseline, and a wider interval cannot turn that into a difference. Objection three: "the window was chosen to make it fail." It was not chosen. It is the only window the public endpoint serves, and it happens to start after the selection date.

---

## Proposal 2 — `/api/v1/win-rates` ranks 52 cells by raw win rate with no sample floor, interval or baseline, and its extremes are equity direction splits

**What is published.** [SOURCE] `origin/main:apps/web/app/api/v1/win-rates/route.ts:37-56` groups counted rows by `${pair}_${direction}`, computes `win_rate = wins/total`, and sorts by `b.win_rate - a.win_rate`. No minimum n, no interval, no baseline column, no clustering note. [PRODUCTION] Today it serves 52 cells (26 symbols × 2 directions). [DERIVED] By hand, the 52 totals sum to **7,785** and the wins to **2,803**, exactly the `overall` row, so the table partitions the record with nothing excluded.

**Integrity cross-check.** [PRODUCTION] Fresh `/api/calibration` (`updatedAt` 2026-10-23T01:01:15.311Z): band 70–79 n = 4,786, `winRate` 0.3675302966987046 × 4,786 = **1,759.000**; band 80–89 n = 2,999 × 0.34811603867955987 = **1,044.000**. 4,786 + 2,999 = 7,785 ✓, 1,759 + 1,044 = 2,803 ✓, both equal to `/api/v1/win-rates` `overall`.

**What the ranking shows.** The top three rows and the bottom two are equities, split by direction:

| Row | Cell | n | wins | win rate | Wilson 95% [DERIVED] |
|---|---|---|---|---|---|
| 1 | METAUSD SELL | 46 | 31 | 67.4% | [53.0%, 79.1%] |
| 2 | AMZNUSD SELL | 51 | 34 | 66.7% | — |
| 3 | MSFTUSD SELL | 64 | 41 | 64.1% | [51.8%, 74.7%] |
| 51 | AMZNUSD BUY | 86 | 19 | 22.1% | [14.6%, 31.9%] |
| 52 | AAPLUSD SELL | 58 | 10 | 17.2% | [9.6%, 28.9%] |

[DERIVED] Equity cells (10 symbols): BUY **206 / 605 = 34.05%**, SELL **237 / 515 = 46.02%**, a 12.0 pt gap; naive two-proportion z ≈ 4.1. Non-equity cells (16 symbols): BUY **1,183 / 3,312 = 35.72%**, SELL **1,177 / 3,353 = 35.10%**, a 0.6 pt gap. Median per-symbol |BUY − SELL| gap: **19.0 pt** for equities, **2.55 pt** for everything else. Equities overall win **443 / 1,120 = 39.55%**, above the 36.0% baseline. A pair-level monitor would therefore rate METAUSD a strong pair, while the record says METAUSD BUY wins 28.1% (n = 64) and METAUSD SELL wins 67.4% (n = 46).

The split does not run one way. AAPLUSD and TSLAUSD run the other direction (BUY wins), and JPMUSD and BACUSD show almost no gap (0.7 and 2.2 pt). All ten are in the table above or derivable from the endpoint; none is omitted.

**[INFERRED] a mechanism worth testing, not a finding.** Equities are the instrument class where the EMA200 trend components abstain. [SOURCE] `signal-generator.ts:427,442` gate both on `!isNaN(ema200)`, and per the 09-18/10-09 weeklies, market-hours symbols lack 200 bars. [PRODUCTION] Today, 5 of 5 equity signals on `/api/signals` publish `ema200` equal to `entry` (METAUSD 648.90997, AMZNUSD 250.49001, GOOGLUSD 324.20999, AMDUSD 507.76001, NVDAUSD 212.284), and 2 of 2 FX signals do not (USDCAD 1.40031 vs 1.40354, GBPUSD 1.34029 vs 1.33853). An engine with no trend term on equities would be expected to lose more in whichever direction fights the drift, which is the shape above. This is not shown. The test is whether the asymmetry holds in both halves of the window, which needs the weekly cohorts from 10-16 P1 part 3.

**Observation only, not evidence.** All 7 signals on `/api/signals` today fall in cells ranked 29–51, below the 36.0% baseline (METAUSD BUY 28.1%, AMZNUSD BUY 22.1%, NVDAUSD BUY 27.9%, AMDUSD BUY 32.1%, GOOGLUSD BUY 33.8%, USDCAD BUY 32.1%, GBPUSD SELL 33.1%). Five of them share one timestamp (2026-10-22T19:45Z), so they amount to one market event, not seven draws. The opposite-direction cells for those five equities rank 1, 2, 4, 6 and 10.

**Ask:**
1. Add `n`, Wilson 95% `ci_low`/`ci_high`, and the window `baseline` to every row. Add `distinct_days`, the count of distinct UTC dates per cell, as the clustering-honest denominator. State in `methodology` that intervals assume independence and are therefore too narrow.
2. Stop sorting by raw win rate. Sort alphabetically, or by `ci_low` (the Evan Miller rule). Link Proposal 1's verdict as the reason: the 05-02 top cells regressed to baseline.
3. Add a direction-asymmetry diagnostic per symbol (|BUY − SELL| with its interval). Any suppression design must key on symbol×direction.

Effort: small (one route, four fields, one sort key). Impact: medium-high. This table is the most "pick the best pair" shaped surface the product serves, and Proposal 1 shows that picking from it does not work.

Evidence: `win-rates/route.ts:37-56`; live payloads above. External: the Wilson interval is the recommended interval for a binomial proportion at small n ([Brown, Cai, DasGupta, "Interval Estimation for a Binomial Proportion", Statistical Science 16(2), 2001](https://projecteuclid.org/euclid.ss/1009213286)). Sorting by the lower bound of the Wilson interval is the standard fix for ranking items with unequal sample sizes ([Evan Miller, "How Not To Sort By Average Rating", 2009](https://evanmiller.org/how-not-to-sort-by-average-rating.html)). Market: a 2026 signal-provider review warns that "a high win rate is meaningless without a good risk-to-reward ratio", and it lists provider accuracy claims of "87% and 96%" with no sample size, period or interval ([volity.io, Best Forex Signal Providers 2026](https://volity.io/forex/forex-signal-providers/)). Intervals plus a 36% baseline would set TradeClaw apart from that category, not make it look worse.

**Brand-alignment:** "Measurable proof over marketing spin" means a 67.4% on 46 signals gets published with the interval that says how little it proves. "Distinguish LOCAL from production" has a sibling here: distinguish a measured rate from a ranked claim.

**Grill verdict:** SURVIVED. Objection one: "it's an API, and sort order is a convenience." The first row of a sorted performance table reads as a claim that it is the best, and Proposal 1 measured what that claim was worth last time. Objection two: "Wilson intervals are wrong under clustering." Yes, which is why the ask adds `distinct_days` and says so in `methodology`. An honest narrow interval with a caveat still beats a bare point estimate. Objection three: "the equity asymmetry might be real and tradable." Possibly. Then it will survive the two-cohort rule in Proposal 1, and until then it must not be ranked as an edge.

---

## Proposal 3 — The "indicator agreement, not probability" rule is enforced on 9 on-site views; 10 outbound files still say "NN% confidence"

**The policy exists.** [SOURCE] The product states that the score "measures indicator agreement, not success probability" on `/accuracy` (`AccuracyClient.tsx:549`), `/calibration` (`CalibrationClient.tsx:268,434`), `/docs` (`DocsClient.tsx:47`), `/live` (`LiveClient.tsx:289`), `/consensus` share text (`ConsensusClient.tsx:132`) and `feed.xml` (`route.ts:26,38,85`, which titles items "NN% indicator agreement"; `git log -S` dates that wording to `40dd669c`, 2026-07-15; the other surfaces were not dated). `apps/web/lib/__tests__/rule-score-copy.test.ts` enforces it: "presents the raw score without a probability percent sign on core research views".

**The enforcement is an allowlist.** [SOURCE] That test reads exactly nine files (dashboard, screener, accuracy, leaderboard, signal detail, embed card, outcome card, landing live-demo, demo). Every outbound channel, where the number leaves the site without the `/calibration` disclaimer next to it, is outside the list. `git grep` on `origin/main` finds the literal "confidence" next to a percent in:

| File:line | Copy |
|---|---|
| `app/api/cron/telegram/route.ts:118` | `Confidence: ${sig.confidence}%` |
| `app/api/telegram/route.ts:29` | `Confidence: ${signal.confidence}%` |
| `lib/email-sender.ts:49` | `Confidence: ${signal.confidence}%` |
| `lib/expo-push-sender.ts:46` | `… — ${signal.confidence}% confidence` |
| `lib/webhooks.ts:331` | `… — ${signal.confidence}% confidence` |
| `lib/tracked-signals.ts:189` | `\| ${sig.confidence}% confidence` |
| `app/api/widget/profile/route.ts:104` | `<title>… ${confidence}% confidence</title>` |
| `app/copilot/CopilotClient.tsx:107` | `with ${top.confidence}% confidence` |
| `app/paper-trading/page.tsx:944` | `{sig.confidence}% confidence` |
| `app/tradingview-export/TradingViewExportClient.tsx:23` | `Avg Confidence: ${stats.avgConfidence}%` |

A bare `NN%` with no qualifier is also printed in `cron/sms-alerts/route.ts:99`, `badge/[pair]/json/route.ts:29`, `v1/badge/[pair]/route.ts:35`, `og/signal/[id]/route.tsx:189`, and `lib/badge.ts:39`. CSS `width: ${confidence}%` hits are excluded as layout, not copy.

**What "84% confidence" measures.** [PRODUCTION] Today `/api/signals` publishes USDCAD BUY at confidence **84**. The 80–89 band realized **34.81%** (1,044 / 2,999) in the current window. Live ECE is **0.4235** and Brier **0.4001**. The product's own time-ordered holdout shows raw ECE **0.4263** against isotonic ECE **0.0245** (`calibration.holdout`), so the calibrator in `lib/confidence-calibration.ts` (shipped 2026-06-12, `22e190d0`) can map the score to a probability. The runbook (`docs/operators/strategy-dispatch.md`) keeps published confidence unchanged until a cost-adjusted expectancy gate passes. That gate is currently failing.

**Scope, stated narrowly.** This run did not verify that any of these channels fires in production today. The cron dispatchers were parked (#154/#155, memory). `/api/v1/badge/METAUSD` and `/BTCUSD` returned `"no signal"`, and `/api/badge/{METAUSD,USDCAD}/json` returned `"unavailable"` with "no placeholder direction or confidence was substituted", which is the correct fail-closed behaviour. The defect is in the **shipped copy**, and that copy is what every self-hoster of the MIT-licensed repo runs.

**Ask:**
1. **Invert the test.** Replace the 9-file allowlist with a repo-wide scan of `apps/web/{app,lib,components}`. Fail on `/\d*\}?%\s*confidence/i` and `/confidence:?\s*\$\{[^}]*\}%/i` in non-test source, with an explicit exemption list for CSS widths.
2. **Fix the 10 lines** to the wording the product already uses: "rule score 84/100" or "84% indicator agreement" (the `feed.xml` form).
3. **Optional, point-of-use:** append the band's measured hit rate from the same reader, e.g. "rule score 84/100 · band 80–89 hit 34.8% of 2,999 recent". This adds a measured fact and leaves published confidence unchanged, so it stays inside the 08-21 P3 boundary and the runbook's activation gate.

Effort: small (one test rewrite, ten one-line copy edits). Impact: medium. Every push, email, webhook and embed is a place where the claim travels without its correction.

Evidence: files and lines above (`origin/main`); `rule-score-copy.test.ts` (file list in its third `it` block); `/api/signals` and `/api/calibration` today. External, as principle and not as a jurisdictional claim (TradeClaw is not a FINRA member): FINRA Rule 2210(d)(1)(F) says communications "may not predict or project performance, imply that past performance will recur or make any exaggerated or unwarranted claim, opinion or forecast". (d)(1)(A) says they must not "omit material facts" where the omission would make them misleading ([FINRA Rule 2210](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210)). "84% confidence" next to a 34.8% measured hit rate fails both on its face.

**Brand-alignment:** "Measurable proof over marketing spin" is already TradeClaw's written rule for this exact number. This proposal applies it to the surfaces that leave the site, where the spin happens.

**Grill verdict:** SURVIVED. Objection one: "copy is cosmetic." The project already decided this wording, wrote a test for it, and stopped at nine files. Finishing a shipped policy is not cosmetic. Objection two: "none of these fire in production." Not verified either way, and conceded in scope. The repo is the product for self-hosters, who run whichever channels they configure. [SOURCE] `expo-push-sender.ts` is called only from `app/api/cron/push-signals/route.ts`, so it is cron-scheduled. `webhooks.ts` is dispatched from request routes (`api/webhooks/dispatch`, `api/webhooks/deliver`, `api/webhooks/[id]/test`), and what calls those in production was not traced. Objection three: "the 34.8% is itself the capped 10,000-row window." True (10-16 P1). The optional part 3 must carry the same window disclosure. Parts 1 and 2 need no number at all.

---

## Carried but deliberately not re-proposed (measured updates only)

- **10,000-row sliding window** (10-16 P1). [PRODUCTION] The window is now 2026-07-06T14:00Z → 2026-10-22T21:45Z = **108.32 days**, down from 113.13 on 10-16. It shrank 4.81 days in a week, as last week predicted it would when volume rises. A new measured fact: the stale calibration body (`updatedAt` 2026-10-22T17:43:24.528Z, window 07-05T23:45Z → 10-22T16:00Z) reports `totalSignals` **7,797**, and the fresh body 7h18m later reports **7,785**. The record's published size went **down by 12**. A cumulative record cannot shrink. Code unchanged; owner call stands.
- **Decay monitor** (10-16 P2). [SOURCE] `apps/web/data/strategy-decay-metrics.json` was last changed in `59ccb823` (2026-06-03), newest row 2026-06-02. [DERIVED] 28 + 31 + 31 + 30 + 23 = **143 days** stale. Narrowed ask (`generated_at` + `data_age_days`) unchanged.
- **D1 alpha verdict preview** (10-16 P3). [PRODUCTION] `/track-record/alpha`: latest bar 2026-10-22, committed 2026-10-23T00:01:49.433Z, 75 snapshots, integrity pass, cadence gaps 0/0, calendar days 74/365, closed trades **0/12**, positions LONG/LONG, NOT-PROMOTED. Identity 75 = 74 + 1 ✓ (fifth confirmation). Calmar re-derived: 1.0629^(365/74) − 1 = 0.3511, / 0.1088 = **3.23** ✓; benchmark 1.22^(365/74) − 1 = 1.6667, / 0.1098 = **15.18** vs published 15.19 ✓. The benchmark drawdown is now read directly from the page (**10.98%**), so last week's inferred check is replaced by a measured one:

  | Check | 10-16 (day 67) | 10-23 (day 74) | Result |
  |---|---|---|---|
  | Calmar ≥ hold | 5.42 vs 22.60 | **3.23 vs 15.19** | FAIL |
  | Active return ≥ 0 | −16.02 pt | **−15.71 pt** (6.29 − 22.00) | FAIL |
  | Drawdown no worse than hold | 9.93% vs ≈10.01% [INFERRED] | **10.88% vs 10.98%** [PRODUCTION] | PASS by 0.10 pt |

  Strategy NAV fell from 1.082 to 1.063, and its drawdown worsened by 0.95 pt. Still zero exits in 74 days. The ask is unchanged.
- **EMA200 = entry** (09-18 P1, 10-09 P3). [PRODUCTION] Fourth sampling day, 5 of 5 equities affected and 0 of 2 FX. The instrument-class correlation holds across all samples. It is now an input to Proposal 2's inferred mechanism. Owner call unchanged.
- **Signal published at confidence 50.** NVDAUSD BUY at 50 sits in the 50–59 band, which has **0** recorded resolved signals (09-11 P1 class). Not re-measured further.
- **Pro conversion funnel seed.** Still not proposed. `/pricing` redirects to `/track-record`, and migration `053_drop_monetization.sql` removed tiers. There is no funnel to harden.

---

## Findings that died under verification this run (recorded, not proposed)

1. **"The calibrated-confidence shadow log lives in container `/tmp`, so the runbook's ≥4-week activation evidence can never accrue."** Dead. [SOURCE] `router-decisions-log.ts:31` does default to `/tmp/tradeclaw-router-decisions.log`, and no migration stores the calibrated value. But `048_broadcast_scope.sql` persists `regime` per row, the router choice is a deterministic function of regime (`selectStrategyForRegime`), and raw confidence is stored. So the evidence can be rebuilt from Postgres. Losing the log costs convenience, not evidence.
2. **"Live public badges print 'NN% confidence' today."** Not claimed. Four badge probes returned `no signal` / `unavailable`, with an explicit no-placeholder note. Proposal 3 is scoped to shipped copy.
3. **"Today's 7 live signals prove the engine picks losing cells."** Not claimed as evidence. Five share one timestamp. Kept as a labelled observation in Proposal 2.
4. **"`/api/calibration` regressed" (first probe 7h17m stale).** Dead. The second probe was fresh (`updatedAt` 2026-10-23T01:01:15.311Z). Fourth confirmation of the ISR behaviour in memory `calibration-endpoint-is-isr`.
5. **"Competitors publish 79–87% per-asset-class win rates" (search-result snippet attributing figures to a named provider).** Not cited. The page fetched for verification contained no per-asset-class figures. Only the sentences quoted in Proposal 2 were confirmed on the page.

---

## Lessons and escalations

**State-file write re-tested this run, not inherited.** `gateguard-clear.mjs` returned `Cleared 2: ... weekly-research-2026-10-23.md, ... tradeclaw.STATE.md`. The append that followed was refused with "Claude requested permissions to edit ... which is a sensitive file." This is the same two-layer block as 10-09 and 10-16. Lessons and escalations are recorded here per contract.

### Lessons (durable)

1. **A deleted hypothesis is an unrecorded verdict.** Before proposing a new selection or suppression mechanism, run `git log -S` for the old one. Here the repo's own history held the only out-of-sample test of the seed the loop has re-proposed four times.
2. **A test that lists files enforces a policy only on those files.** When auditing a copy rule, ask which surfaces leave the site (push, email, webhook, SVG, OG). Those are where the rule was most likely skipped and where the correction is never shown.
3. **A capped window can still be a valid out-of-sample test.** The 10,000-row cap is a disclosure defect (10-16 P1). It does not stop a window from being disjoint from an old selection date, and that disjointness is all an out-of-sample check needs.
4. **Fetch before citing.** A search snippet attributed numbers that the page it pointed at does not contain.

### Escalations (owner decision required)

1. **NEW, highest: the winning-cells hypothesis failed out-of-sample and has no recorded verdict** (P1). Owner calls: (a) authorize the REGISTRY entry; (b) run the expectancy query on `signal_history` for the six cells over 2026-07-06 → 2026-10-22; (c) adopt the two-cohort rule for any weak-pair suppression.
2. **NEW: `/api/v1/win-rates` ranks raw win rates with no n, interval, baseline or clustering note** (P2). Owner call: authorize the four fields and the sort change.
3. **NEW: 10 outbound files print "NN% confidence" against the product's own wording rule** (P3). Owner call: authorize the test inversion and the copy fix. Part 3 (band hit rate at point of use) is optional.
4. **Carried:** 10,000-row window (108.32 days, published size fell 12 in 7h); decay monitor 143 days stale; D1 alpha day 74 (two FAIL, one PASS, all now read directly); EMA200 = entry (fourth sample); D1 stall alarm untested; ISR caching of the fail-closed zero body (memory, product-code fix).
5. **Sixth consecutive run without `/deep-research` / `/market-research` backends.** Owner call: provision firecrawl/exa for the headless launcher, or amend the contract to name `WebSearch`/`WebFetch` as the fallback.
6. **10-22 daily lost to the account weekly limit**, machine-wide (8 of 8 logs). Not a project failure; no backfill.
7. **Harness config, owner-side:** loop log line 4 warns that the allow rule `Bash(git branch -D worktree-agent-*:*)` in `~/.claude/settings.json` mixes `*` with `:*`, so it matches only a literal `*`. Outside this repo; recorded here because the idea-shelf tool was not permitted in this run.
8. **Branch divergence:** 82 behind / 131 ahead. Work from these proposals must branch from `origin/main`. Not touched by this run.

---

## Sources

- Backtest overfitting: [Bailey, Borwein, López de Prado, Zhu, "The Probability of Backtest Overfitting", Journal of Computational Finance (2015)](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting); [SSRN abstract 2326253](https://papers.ssrn.com/abstract=2326253)
- Binomial intervals: [Brown, Cai, DasGupta, "Interval Estimation for a Binomial Proportion", Statistical Science 16(2) (2001)](https://projecteuclid.org/euclid.ss/1009213286)
- Ranking by Wilson lower bound: [Evan Miller, "How Not To Sort By Average Rating" (2009)](https://evanmiller.org/how-not-to-sort-by-average-rating.html)
- Performance-claim principle: [FINRA Rule 2210, Communications with the Public](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210)
- Market context: [volity.io, Best Forex Signal Providers 2026](https://volity.io/forex/forex-signal-providers/)
- Production reads today: `https://tradeclaw.win/api/calibration` (two probes), `https://tradeclaw.win/api/v1/win-rates`, `https://tradeclaw.win/api/signals`, `https://tradeclaw.win/track-record/alpha`, `https://tradeclaw.win/api/v1/badge/{METAUSD,BTCUSD}`, `https://tradeclaw.win/api/badge/{METAUSD,USDCAD}/json`
- Repo reads (read-only, `origin/main` unless noted): `apps/web/app/api/v1/win-rates/route.ts`, `apps/web/app/api/calibration/route.ts`, `apps/web/lib/confidence-calibration.ts`, `apps/web/lib/strategy-router-shadow.ts`, `apps/web/lib/router-decisions-log.ts`, `apps/web/lib/gate-log.ts`, `apps/web/lib/__tests__/rule-score-copy.test.ts`, `apps/web/migrations/048_broadcast_scope.sql`, `apps/web/app/lib/signal-generator.ts`, `docs/operators/strategy-dispatch.md`, `docs/plans/full-risk-gates-ab.md`, the 15 outbound files listed in P3; `40dd669c^:apps/web/lib/winning-cells.ts`; `git log -S getWinningCellsMode`; `docs/research/weekly-research-2026-{08-21,10-09,10-16}.md` (working tree); `loops/state/tradeclaw.STATE.md`; `loops/logs/tradeclaw/daily-2026-10-22_2348.log`

## Status

**3 proposals, all new.** P1: the deleted 05-02 winning-cells hypothesis wins 36.06% out-of-sample against 36.00% for every other cell. Record the verdict and make it the persistence rule for weak-pair suppression. P2: the win-rates table ranks raw rates with no interval, and its extremes are equity direction splits. P3: the "indicator agreement, not probability" rule stops at nine on-site files, and ten outbound files still print "NN% confidence". A fourth slot was left empty on purpose. The only other candidate (the `/tmp` shadow log) died under verification.

**5 carried items updated with measurements, none re-proposed. 5 findings killed under verification. 8 escalations, 3 new.**

Seeds: weak-pair suppression → P1 (its first measured design input) and P2. Proof-chain / outcome provenance → P2 (cell table) and the carried window item. Confidence calibration / transparency → P3. Pro conversion funnel → not proposed; there is no funnel.

**Propose-only compliance:** no product code edited, no test written, no migration, no deploy, no domain/claim/secret change, no PR opened, no write to Stripe or the signals table, no push to `main`, no force-push, no `git add -A`, no `--dangerously-skip-permissions`. Every number was read from a live GET, read from a cited line, or derived with the arithmetic shown. The one mechanism offered without proof (P2, EMA200 → equity asymmetry) is labelled `[INFERRED]` and comes with the test that would settle it. Single explicit-pathspec commit.

**Grill verdict: SURVIVED**
