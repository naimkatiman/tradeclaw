# TradeClaw weekly research — 2026-10-09

Mode: weekly (propose only). Branch: `feat/premium-ui-overhaul` @ `caf9064c`, 81 behind / 84 ahead of `origin/main`. `origin/main` last moved **2026-08-29** (`51f94081`) — **41 days static**, `git rev-list --count 51f94081..origin/main` = 0.

Label convention used throughout: `[PRODUCTION]` = read from a live public GET today. `[SOURCE]` = read from a git ref, file and line cited. `[DERIVED]` = arithmetic on the two, shown. `[INFERRED]` = reconstructed, not read.

---

## The organizing fact of this week

**The engine's measured out-of-sample accuracy fell 9.50 points on 1,194 fresh signals, and every mechanism built to catch exactly that was either pointed at 129-day-old local data, anchored so staleness can never trip it, or — in the loop's own case — dead for 21 days.**

Three independent surfaces, one shape. The production calibration stream is alive and fresh (`updatedAt` 2026-10-08T22:49:42.348Z, window 2026-06-16 → 2026-10-08) and it says accuracy is deteriorating. The edge-decay monitor that exists to raise that alarm reads a local file whose newest row is **2026-06-02 — fourteen days before the calibration window even begins** — and its rolling window is anchored to its own data, so it cannot report that it went blind. This loop, which would have said so on 2026-09-19, produced nothing for 21 days.

This is the first week in five that the decay monitor is proposed again rather than carried. Four prior weeklies (08-28 P3, 09-06 P4, 09-11 P4, 09-18 demoted) asked for the same thing: *schedule regeneration*. That ask was treatable as a chore, which is probably why it never shipped. This run traced the monitor's code and the ask changed shape: regeneration alone would not have helped, because the monitor is structurally incapable of noticing the outage and its demote rule cannot fire on the failure mode the engine is actually in.

## Method

Ground truth first (`continuous-improvement:reconcile` + `safety-guard`): branch and HEAD snapshotted and re-verified immediately before the commit, real drift read via `git diff --stat` (130 files, +9272/−5343 — pre-existing branch content, untouched by this run), two stashes noted on unrelated branches, no `MERGE_HEAD`/rebase in progress, 94 worktrees enumerated.

Internal friction via `/continuous-improvement` plus direct reads of the loop logs and of `origin/main` source. External evidence via `WebSearch`. **Declared substitution, fourth consecutive run:** `/deep-research` and `/market-research` route through firecrawl/exa MCP servers; `ToolSearch` returns neither in this headless session (the connected servers are railway, claude.ai docs, playwright, and mobbin — mobbin unauthenticated). `WebSearch`/`WebFetch` were used instead. This is Escalation 8 below, now at four weeks.

Read-only on code throughout: every repo read was `git show <ref>:<path>` or `Read`/`Grep`. No product file was edited.

---

## Proposal 1 — The decay monitor cannot detect that its own feed died, and auto-demote cannot fire on negative expectancy

Five weeklies have now reported `apps/web/data/strategy-decay-metrics.json` as stale. None read the generator. The staleness is the symptom; here is the mechanism, and it changes the ask.

**The rolling window is anchored to the data, not to the clock.** [SOURCE] `scripts/compute-strategy-decay.py:27` (on `origin/main`):

```python
cut = max_ts - dt.timedelta(days=days)
```

`max_ts` is the newest timestamp *in the input*. So "rolling 90 days" means the last 90 days of whatever data exists, however old that data is. `:32` computes `"insufficient_sample": n < MIN_N` on that same window, and `MIN_N = 20` (`:21`). The consequence is categorical: **no amount of staleness can ever make the window empty, make `insufficient_sample` true, or change the published status.** The monitor is not merely stale — it is constructed so that it cannot report being stale.

[PRODUCTION/SOURCE] Measured today against the live file on `origin/main`:

| Strategy | resolved | win rate | rolling_90d n | `insufficient_sample` | realized R | `decay_status` | `auto_demote` |
|---|---|---|---|---|---|---|---|
| hmm-top3 | 332 | 33.7% | 332 | **false** | **−0.12% mean / −0.45% median** | watch | **false** |
| zaky_strategy | 209 | 61.2% | 209 | false | +0.26 (n=140) | healthy | false |
| tradingview_screener | 177 | 45.2% | 177 | false | +0.71 (n=21) | watch | false |

[DERIVED] Win rates reproduce exactly: 112/332 = 33.73%, 128/209 = 61.24%, 80/177 = 45.20%. The `_meta.date_range` newest value is **2026-06-02**; 2026-06-02 → 2026-10-09 is **129 days** (30 + 31 + 31 + 30 + 7). Prior corpus readings of 106 days (09-16) and 108 days (09-18) reproduce from the same anchor, so the measurement method is the corpus's own.

**The demote rule has no expectancy term.** [SOURCE] `:39-40` fires `DECAYED` and `demoted = True` only when `r90["win_rate"] < thresh`, where `thresh` = `0.5 × historical_baseline`. [DERIVED] 0.5 × 50.8% = **25.4%**, the value published in `_meta.decay_threshold_pct`. hmm-top3 sits at 33.7% — **8.3 points of headroom** — while its realized R-multiple is **negative on both mean and median**. A strategy that loses money on the average trade is not demoted, and cannot be, because the rule only watches hit rate. hmm-top3 has already surrendered a third of its baseline hit rate (33.7% against a 50.8% baseline) and still reads `auto_demote: false`.

`auto_demote` is **false for all three strategies**, and two of the three carry a "watch" status. The product's stated discipline is "auto-demote strategies that lose edge." The field exists, is wired, and has never fired.

**The data the monitor needs already exists and is fresh.** [PRODUCTION] `/api/calibration` today: `totalSignals` 7,487, `updatedAt` 2026-10-08T22:49:42.348Z, `windowStart` 1781569800000, `windowEnd` 1791492300000. [DERIVED] Those decode to **2026-06-16T00:30Z → 2026-10-08T20:45Z**, a live ~114-day window. [SOURCE] It is built from `readHistoryAsync` + `isCountedResolved` (`apps/web/app/api/calibration/route.ts:2,51`), and the underlying rows carry a strategy key — `strategyId` / `strategy_id` at `apps/web/lib/signal-history.ts:276,309`. So a per-strategy decay window over fresh production outcomes is reachable from code that already ships.

Note the ordering: the decay file's newest row (2026-06-02) predates the start of the calibration window (2026-06-16) by 14 days. The two surfaces do not merely disagree on freshness; they do not overlap at all.

**External corroboration.** The anti-pattern is named in the data-reliability literature: freshness is defined as the lag between `now()` and the newest event timestamp, and a check that only asks "is the newest row recent relative to the rest of the data" is explicitly described as blind to a pipeline that died with fresh-enough-looking data still sitting there — the recommended complement is a wall-clock heartbeat or dead-man's switch ([pipecode.ai](https://pipecode.ai/blogs/data-freshness-sla-monitoring-budgets), [Conduktor](https://www.conduktor.io/glossary/data-freshness-monitoring-sla-management), [sempervent](https://sempervent.github.io/best-practices/data-governance/data-freshness-sla-governance/)). `compute-strategy-decay.py` computes nothing against `now()`.

**Ask (three parts, narrowed from four prior weeklies' "schedule regeneration"):**
1. Add a wall-clock freshness term: `now() − max_ts`, published in the artifact as `generated_at` + `data_age_days`, and surfaced as `stale` above a stated budget. Regeneration without this just resets the clock on the same blindness.
2. Add an expectancy term to `decay_status` so negative realized R is a demotable condition independently of hit rate.
3. Repoint the per-strategy window at the production resolved-outcome source behind `/api/calibration`, partitioned on the `strategy_id` that already exists.

Effort: part 1 is a small, self-contained change to one Python script plus one JSON key and one badge. Part 2 is a rule change requiring an owner decision on the threshold. Part 3 is the largest and genuinely needs design (the calibration route aggregates by confidence band, not by strategy, so the partition is new work). Impact: part 1 alone converts a silent 129-day outage into a visible one, and is the highest ratio in this document.

**Brand-alignment:** "Disciplined risk management (auto-demote strategies that lose edge)" is a load-bearing public claim, and the mechanism behind it currently cannot fire on the erosion the product is measuring elsewhere on the same site. Making the monitor able to say "I am blind" is the transparency position, not the marketing one.

**Grill verdict:** SURVIVED. The strongest objection is that this is three asks wearing one hat, and it is conceded: parts 2 and 3 are separable and part 3 is the expensive one. The proposal is written so part 1 can ship alone and still be worth shipping. The second objection — "the file is explicitly labelled LOCAL, so nothing public is misstated" — is correct and important, and the `_meta.provenance` label is intact and accurate. It does not dissolve the finding: the defect is that the alarm cannot fire, and the public claim it backs does not carry the LOCAL caveat.

---

## Proposal 2 — Out-of-sample accuracy fell 9.50 points on 1,194 fresh signals, and the public surface reports one flat cumulative number

[PRODUCTION] `/api/calibration`, 2026-10-09 (`isSimulated: false`, `insufficientData: false`, `updatedAt` 2026-10-08T22:49:42.348Z): `totalSignals` **7,487**, `overallAccuracy` **0.35955656471216774**, `brier` **0.40177074929878454**, `ece` **0.4251656204087084**, `minStableSignals` 20. Bands: 70–79 n=**4,513** observed **0.37092842898293815**; 80–89 n=**2,974** observed **0.34229993275050435**; bands 50–59, 60–69 and 90–99 all n=0, observed `null`.

**Payload integrity checked before any use.** [DERIVED] 4,513 + 2,974 = 7,487 ✓ exactly the published total. Back out the win counts: 4,513 × 0.37092842898293815 = **1,674.000** and 2,974 × 0.34229993275050435 = **1,018.000** — both land on exact integers, which is what a true count ratio does and a synthesized number does not. Cross-check against a field I did not use to derive them: (1,674 + 1,018)/7,487 = 2,692/7,487 = **0.35955656**, against the published `overallAccuracy` 0.35955656471216774 ✓ to eight decimal places. Band errors reproduce too: 0.745 − 0.37092842898293815 = 0.37407157101706185 vs published 0.37407157101706184, and 0.845 − 0.34229993275050435 = 0.50270006724949565 vs published 0.5027000672494957. ECE reproduces from the bands as (4,513 × 0.37407157 + 2,974 × 0.50270007)/7,487 = **0.42516564** ✓.

**The new out-of-sample window.** The 2026-09-18 weekly recorded the same endpoint at `totalSignals` 6,293, band 70–79 n=3,760 wins=1,431, band 80–89 n=2,533 wins=878. Differencing today against that committed artifact yields a clean, genuinely out-of-sample window of **1,194 signals** (753 + 441 = 1,194 ✓ = 7,487 − 6,293):

| Window | n | wins | accuracy |
|---|---|---|---|
| Band 70–79, new | 753 | 243 | **32.271%** |
| Band 80–89, new | 441 | 140 | **31.746%** |
| **All, new (09-18 → 10-09)** | **1,194** | **383** | **32.077%** |
| All, prior window (09-11 → 09-18) | 546 | 227 | 41.575% |

[DERIVED] **Out-of-sample accuracy fell from 41.575% to 32.077% — a 9.50-point decline on more than twice the sample.** Cumulative `overallAccuracy` fell 36.692% → 35.956%. ECE worsened 0.4183355 → 0.4251656; Brier worsened 0.39854411 → 0.40177075. All three cumulative measures moved the wrong way, and the fresh window is worse than either.

**Ordering is still undetectable.** [DERIVED] On the new window, 32.271% (n=753) vs 31.746% (n=441): difference 0.525pt, pooled p = 383/1,194 = 0.32077, SE = 0.02799, **z = 0.188, p ≈ 0.85**. This is the **fourth consecutive out-of-sample window** showing no detectable relationship between stated confidence and realized outcome (09-11, 09-18, and now 10-09 on a window twice the size).

**The cumulative inversion weakened — stated because it did.** On the full 7,487 sample the higher band still underperforms the lower one (34.230% vs 37.093%), z = **2.526**, p ≈ **0.0115**, computed on today's two populated bands. The 09-18 run recorded z = 2.741, p ≈ 0.0061. The inversion remains significant and still points the wrong way, but it is **less** significant than last week, because the fresh data is flat rather than inverted. Reporting only the worsened ECE while omitting the weakened z would be the cherry-pick available here.

**What the public surface shows instead.** One cumulative `overallAccuracy` over a 114-day window. A cumulative mean over 7,487 signals cannot fall fast enough to show a 9.5-point deterioration in its most recent 1,194 — it moved 0.74 points. The deterioration is only visible by differencing two committed artifacts a week apart, which is work no user will do.

**Ask:** publish the rolling out-of-sample window (n, accuracy, and the delta against the prior window) next to the cumulative figure, from the data the endpoint already computes. Effort: small — the route already derives `windowStart`/`windowEnd` (`route.ts:84-85`) and the row set is in hand; this is a second aggregation and a card, not new data collection. Impact: high, and it is the only proposal here that makes bad news *arrive on time* rather than merely arrive.

**Brand-alignment:** "Radical transparency (wins AND losses, no cherry-picking)" is not satisfied by a cumulative average that structurally dampens recent losses. Publishing the trailing window is the mechanical form of the promise, and this week it would publish a 9.5-point decline.

**Grill verdict:** SURVIVED. Objection one: "1,194 signals over 21 days may be a regime artifact, not decay." Conceded, and it is the reason the ask is to *publish the window*, not to relabel the engine — a rolling number lets a regime effect show itself as recovery next week, which a cumulative mean cannot. Objection two: "differencing two artifacts assumes no backfill or restatement between them." Fair; the band counts grew monotonically and the deltas are positive in both bands, which is consistent with append-only but does not prove it, so the window is labelled derived-by-differencing rather than measured. Objection three: "ECE across five bands when three are empty is a weak statistic." Correct, and it is why the headline rests on the differenced accuracy rather than on ECE.

---

## Proposal 3 — The published EMA200 is still the entry price, 21 days and three independent samples later

Carried from 2026-09-18 P1 (Escalation 1). Re-proposed at length rather than demoted, because this run adds a **third independent sample** and the mechanism's one falsifiable prediction held again. The code is unchanged by construction — `origin/main` is 41 days static.

[PRODUCTION] `/api/signals`, 2026-10-09, `count: 2`:

| Signal | entry | ema20 | ema50 | ema200 | verdict |
|---|---|---|---|---|---|
| AMDUSD | **620.72998** | 623.38794 | 631.61585 | **620.72998** | `ema200` byte-identical to `entry` |
| USDCHF | 0.83101 | 0.83148 | 0.83199 | 0.83243 | genuine, distinct — control |

Both `dataQuality: "real"`, both with full three-tier trade plans. AMDUSD's `ema20` and `ema50` are ordinary distinct values, so this is not a flat series — only the 200-period field collapses onto the last close.

**The mechanism's prediction held.** The 09-18 standup established that the defect tracks candle supply: instruments whose candles only accrue during market hours cannot reach 200 bars, so the fallback fires. Today's split is exactly that — **AMDUSD is a market-hours-limited stock CFD and carries the defect; USDCHF is near-24/5 forex and does not.** Across the three samples (weekly 09-18 at n=1, standup 09-18 at n=4, today at n=2) the market-hours correlation is now **unbroken**: every affected instrument has been market-hours-limited, and the only clean `ema200` values have been on continuously-traded instruments (BNBUSD on 09-18, USDCHF today). [INFERRED] The candle counts themselves were not read; the correlation is on instrument class, not on a bar count.

The four-line source chain was established and verified in the primary tree on 09-18 (`ta-engine.ts:78-80` fills NaN below period → `:259-270` collapses to scalar NaN → `signal-generator.ts:603-605` coerces through a falsy `||` so `NaN || currentPrice` yields the price → `:920/931` makes `entry` that same last close). It is **not re-read this run**: the ref has not moved, and re-verifying an unmoved ref is the waste the 09-18 lessons name. What is new is the live confirmation and the class correlation.

Scope, stated as narrowly as it was on 09-18: this is a **disclosure defect, not a trading defect.** `signal-generator.ts:422-445` gates both EMA200 trend components behind `!isNaN(ema200)` read from the raw indicator, so the scorer correctly abstains. The damage is that `/dashboard`, the explain surface, the public API docs and the agent webhook all receive a fabricated number that type-checks as a measured one.

**Ask, unchanged:** publish `null` and render an explicit "not computable — fewer than 200 bars" state, or fetch 200+ bars before publishing the field. The generator's own floor is 100 bars (`signal-generator.ts:660`), exactly half the period of the longest indicator it publishes. Effort: small and local. Impact: it is the only item in this document where the product currently publishes a number that was never measured.

**Brand-alignment:** "Every trade verified" and "numbers must be measured or labeled pending real data" are the same sentence from two directions. A field that silently substitutes the entry price for an unavailable indicator violates both, and it does so on the public API that third parties consume.

**Grill verdict:** SURVIVED. The objection that matters is "this is a re-proposal and `main` has not moved, so it is padding." Partly fair, and the response is the reason it is here: 21 days of non-fix on a known fabricated public number is itself the finding, and the third sample plus the now-unbroken instrument-class correlation is new evidence that was not available on 09-18. The weaker objection — "n=2 today" — is conceded in the table; the claim does not rest on today's rate but on the byte-identity, which is a code fact.

---

## Proposal 4 — The D1 alpha gate publishes four observation checks and zero performance verdicts, now at day 60 with zero closed trades

Carried from 2026-09-18 P3 (Escalation 3). Advanced by a measurement at a new day count, which lets two published identities be tested a third time and makes the `closedTrades` impossibility quantitative rather than projected.

[PRODUCTION] `/track-record/alpha`, 2026-10-09: latest bar **2026-10-08**, committed **2026-10-09T00:01:04.505Z**, snapshots **61**, verifiedRows **61**, ledger integrity **pass**, unresolved cadence gaps **0 / 0 (PASS)**, calendar days **60 / 365 (OPEN)**, consecutive snapshots **61 / 365 (OPEN)**, closed sleeve trades **0 / 12 (OPEN)**, strategy net return **+8.83%**, benchmark net return **+24.97%**, strategy max drawdown **8.75%**, Calmar **7.69**, NAV **1.088 / 1.250**, positions **BTCUSD LONG, ETHUSD LONG**, status **NOT-PROMOTED**.

**The asymmetry holds at the page level.** The page renders **four** observation checks (calendar days, consecutive snapshots, closed trades, cadence gaps) and **zero** performance verdicts. It publishes performance *numbers* — net return, drawdown, Calmar — with no pass/fail against the gate's own performance criteria, while the 09-18 read confirmed the payload carries four `null` performance checks and the page body names all four. Unchanged after 21 days.

**Three self-checks, all passing, two of them identities now holding a third time.**

1. [DERIVED] `snapshots` = `calendarDays` + 1: 61 = 60 + 1 ✓. Proven by construction on 09-17/09-18 at cd=38 and cd=39; holds now at cd=60, 21 days and 21 bars later.
2. [DERIVED] Calmar reproduces. Using the formula reverse-engineered on 09-16 and confirmed since — CAGR/maxDD with 365/`calendarDays` annualisation: NAV 1.0883 → CAGR = 1.0883^(365/60) − 1 = 0.6732; 0.6732/0.0875 = **7.694**, against published **7.69** ✓. And the divisor is confirmed by exclusion a second independent time: using `snapshots`=61 instead gives 1.0883^(365/61) − 1 = 0.6592, /0.0875 = **7.53**, which does not match. The annualisation divisor is `calendarDays`, not `snapshots`.
3. [DERIVED] Internal consistency: net return +8.83% ⇒ NAV 1.0883 ✓ rounds to the published 1.088; benchmark +24.97% ⇒ 1.2497 ✓ rounds to 1.250.

**The bad news, reported because it is bad.** [DERIVED] `activeReturn` = 8.83 − 24.97 = **−16.14 points**. The 09-16 standup reconstructed it at −15.4484. The strategy's underperformance against its own benchmark **deepened by 0.69 points** over 22 bar-days — modest widening, not collapse, and stated that way. Strategy max drawdown moved from 5.978915% (09-18) to **8.75%**, a **+2.77-point deterioration**. The benchmark drawdown leg is not published on this page, so `drawdownNoWorse`'s verdict is **not claimed** here; what is measured is that the strategy's own drawdown worsened by 2.77 points while its active return widened.

**`closedTrades` is now empirically, not just projectionally, unreachable.** The gate requires 12 closed sleeve trades in 365 days. At **day 60 of 365 the count is 0**, and both sleeves are still LONG — meaning **not one exit has occurred in 60 days**. A linear pace to 12-in-365 would want ~2 by now. The standing memory note (`d1-alpha-closedtrades-minimum-unreachable.md`) put the rule's historical yield at ~8.4 closes/year from a 150-flip sample; this prospective run is tracking below even that. The honest reading is that the minimum is a specification error in the gate, not a pacing miss by the strategy, and 60 days of zero exits is the cleanest evidence yet.

**Ask, unchanged from 09-18:** render the four performance checks as a **marked non-binding preview** with their inputs shown, and add a terminal `insufficient-activity` outcome so a rule that structurally cannot reach 12 closes resolves rather than sitting OPEN for 365 days. Neither touches the frozen rule. Effort: small, presentational plus one terminal state. Impact: medium.

**Counter-argument, included because it is correct.** The 09-18 run showed that most of a 43.8% week-over-week Calmar move was an annualisation artifact: with the drawdown denominator frozen, the Calmar ratio and the CAGR ratio are the same number, and moving only the 365/`calendarDays` window reproduces nearly the whole swing. That argument is why the ask is a *marked non-binding preview* and not "publish the verdicts." Day-60 Calmar of 7.69 against day-39's 10.413 should not be read as a trend; the window moved.

**Brand-alignment:** publishing five observation booleans and withholding four performance verdicts selects which half of the evidence the public sees, which is the structure of cherry-picking even when every individual number shown is true. GIPS makes the adjacent point for managed performance: composites exist specifically to stop firms presenting a favourable subset, and discontinued composites must stay listed for at least five years rather than disappearing ([AnalystPrep](https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/global-investment-performance-standards-gips-standards/), [IFT](https://ift.world/booklets/ethics-introduction-to-gips-part1/)). A gate that can never terminate is the signals analogue of a composite that never closes.

**Grill verdict:** SURVIVED. Objection: "three of four performance checks would fail, so this proposal asks the project to publish its own bad numbers for no gain." That is the point, and it is the brand position. Second objection: "the Calmar artifact argument undercuts publishing anything." It undercuts publishing *binding verdicts*, which is why the ask is narrowed to a marked preview with inputs — the same narrowing the 09-18 run applied, retained here rather than quietly widened back.

---

## Carried but deliberately not re-proposed

**The untested D1 alpha stall alarm** (09-18 P2, Escalation 2). `readD1AlphaReport`'s tail-staleness branch still drives the single public cadence card and still has no test; the `{ now }` seam exists and is used twice inside the fresh branch. Unchanged by construction (`main` static 41 days). Owner-side by contract — this loop does not write tests — and re-arguing it at length would pad the document. It gains urgency from this week's loop outage: the alarm for a dead writer is exactly the class of code that this week proved does fail silently.

**The provenance badge is still unmounted on `/track-record` and `/calibration`** (08-28 P4, 09-06 P4, demoted since 09-11). Unchanged. Note one supporting measurement taken today: `/api/calibration` has **no** `source`, `provenance`, `origin`, or `asOf` key (`isSimulated: false` is the only integrity field), so a consumer of that endpoint cannot tell production from local. It belongs in the same PR as Proposal 2's window card.

**`/calibration` does not serve a calibration page.** A GET to `https://tradeclaw.win/calibration` returned methodology prose with no Brier, no ECE and no bands — consistent with the standing memory that page-level `redirect()` serves 200 plus app-shell HTML rather than a 307/308. The data is only reachable at `/api/calibration`. Not proposed as its own item; folded into Proposal 2's ask, since a published rolling window with no page to render it is not a disclosure.

---

## Corrections

1. **To the 2026-09-18 weekly's P4, which reverses direction today.** That run reported "100% of the public endpoint is unrecordable" at n=1 (one signal, confidence 51, 19 points below `PUBLISHED_SIGNAL_MIN_CONFIDENCE` = 70). Today **both** served signals clear the floor: AMDUSD confidence 75 (preBoost 70) and USDCHF confidence 70 (preBoost 70). **0% of the endpoint is unrecordable at n=2.** The 09-18 run stated its own n=1 caveat in the proposal body, and this is that caveat cashing out. The underlying code finding is untouched — `api/signals/route.ts:24` still defaults `minConfidence` to `'0'` and `:53` still filters only when `>0`, so the publish path still does not apply the constant named for publishing — but the *rate* claim does not survive, and the percentage should stop being quoted.
2. **To this run's own strongest early hypothesis, which is dead.** I expected `apps/web/app/api/calibration/route.ts:53` — `.filter((s) => s.confidence >= MIN_CALIBRATION_CONFIDENCE)` — to be the reason bands 50–59 and 60–69 are empty, which would have made the empty bands a by-construction exclusion of exactly the sub-floor signals the endpoint publishes. [SOURCE] `apps/web/lib/confidence-calibration.ts:149` sets `MIN_CALIBRATION_CONFIDENCE = 0.5`, and the confidence field is on a 0–100 scale (observed: 75, 70, 51). A `>= 0.5` test admits everything with confidence ≥ 1. **The guard is inert and explains nothing.** Recorded in full because the refuted version was the better story and publishing it would have been the worst error available this week. A smaller real observation survives: the constant's name promises a 50% floor that its value cannot enforce on a 0–100 field — either a dead guard or a scale mismatch. Not proposed; it needs the write-time scale read, which this run did not do.
3. **To the corpus's D1 alpha genesis date, resolving the 09-18 Correction 2.** Today's `snapshots` = 61 at `calendarDays` = 60 only reconciles with a genesis **bar** of 2026-08-09, not the 2026-08-10 the 09-16/09-17 standups record. Both are right about different things, exactly as the 09-18 run flagged: the corpus dates rows by `committedAt`, the payload by bar, and bar = commit − 1. [INFERRED] — the genesis row was not read directly this run. This is the 09-17 keying trap in live use: keyed by bar date the identity holds, keyed by commit date it appears broken.

---

## Findings that died under verification this run (recorded, not proposed)

1. **"The calibration route filters out sub-70 signals, which is why the low bands are empty."** Dead. The constant is 0.5 against a 0–100 field. See Correction 2. This was this run's best-looking finding for about ten minutes.
2. **"The `isDarkStrategy` filter hides losing strategies from the public record."** Dead, and it reverses. [SOURCE] `signal-history.ts:362-364,373,380` excludes `strategy_id LIKE 'tv-%'` from public history. But [SOURCE] the decay file shows `tradingview_screener` with `realized_rr_mean` **0.71** — the **best** realized R of the three strategies. The filter removes the best performer, not the worst, so it is the opposite of survivorship bias. Recorded because "there is a hidden-strategy filter" reads like a scandal until you check which way it points.
3. **"`rolling_90d` equals `all_sample` on all three strategies, so the windowing is broken."** Dead. [DERIVED] Every strategy's `date_range` spans fewer than 90 days (hmm-top3 04-14→06-02 = 49 days, zaky 04-07→06-03 = 57, tv 04-02→06-02 = 61), so the 90-day window legitimately contains the whole sample. `tradingview_screener`'s `rolling_30d` correctly narrows to n=48 of 177, proving the windowing works. The real defect is the *anchor* (Proposal 1), not the width.
4. **"`snapshots` = `calendarDays` + 1 broke this week."** Dead. 61 vs 60 looked like an off-by-one against a 2026-08-10 genesis; applying the corpus's own bar-vs-commit lesson resolves it exactly. See Correction 3. Had this been reported it would have been a fabricated integrity incident — the precise failure mode the 09-17 standup warned about after its own 3-for-3 false alarm.
5. **"The loop's six-run failure streak is a gate or repo misconfiguration."** Dead. Three distinct account-level causes, read from the logs. See Escalation 1.

---

## Lessons and escalations

`loops/state/tradeclaw.STATE.md` still has no `## Lessons` or `## Escalations` heading in its 472 lines — it is machine run-records only. Per the loop contract these are recorded in the committed artifact instead, unabridged.

**The write-block was re-tested this run rather than inherited, and it is two layers deep.** Nine prior artifacts recorded the append as "blocked at the harness sensitive-path layer." Attempting it today found that claim correct but incomplete: the first refusal is **gateguard**, which demands the four facts and then *clears successfully* for this path (`gateguard-clear.mjs` returned `Cleared 1`); the retry is then refused again by the **harness sensitive-path layer**, which a non-interactive session cannot satisfy. So a future run should expect a gateguard clear to succeed here and still not get the write — clearing the first gate is necessary-looking and insufficient. This correction is recorded against **this run's own premature conclusion**: between the two refusals I had drafted a lesson asserting "this file is writable, nine prior artifacts were wrong," which was itself wrong, and only the second block stopped it from being published. The standing memory note "STATE.md append is scope-denied, not flat-denied" is accurate and should keep its wording.

### Lessons (durable)

1. **Five weeklies reported a symptom; one read of the generator changed the ask.** "The decay monitor is 129 days stale" was carried four times as a scheduling chore and never shipped. One file read found that regeneration alone would not have fixed anything, because the window is anchored to its own data. When a carried item will not die, read the code behind it instead of re-measuring the symptom.
2. **Check which way a filter points before calling it bias.** The `tv-%` exclusion looked like hidden losers and turned out to hide the best-performing strategy. The shape of a finding ("there is a hidden subset") is not its direction.
3. **A constant's name is not its value.** `MIN_CALIBRATION_CONFIDENCE` promises a 50% floor and is set to `0.5` against a 0–100 field. Reading the name and the call site was not enough; the declaration was the only thing that settled it, and it killed the run's most attractive hypothesis.
4. **Difference two committed artifacts to manufacture an out-of-sample window.** The 9.50-point accuracy decline is invisible in any single payload and only exists because 09-18's numbers were committed in full precision. Writing full precision into the artifact is what made this week's headline measurable — a reason to keep doing it.
5. **Report the metric that weakened your case in the same breath as the one that strengthened it.** ECE and Brier both worsened; the inversion z-score *fell* from 2.741 to 2.526. Quoting only the first two would have been true and misleading.
6. **An identity that appears to break is more likely a keying error than tampering.** `snapshots` vs `calendarDays` looked off by one until the bar-vs-commit convention was applied. Second time this specific trap has fired in this corpus.
7. **The gate cannot distinguish "ran and produced nothing" from "never started."** Six runs, three causes, one exit code. A deterministic gate is still the right design; it just needs the launcher to classify the upstream failure before the gate speaks. See Escalation 1.

### Escalations (owner decision required)

1. **NEW AND HIGHEST — this loop was dead for 21 days and the state file reports all seven failures identically.** Last gate PASS was **2026-09-18**. Read from the logs, cause by cause: `tradeclaw/daily-2026-09-20_0930.log` and `daily-2026-09-21_0930.log` → *"Failed to authenticate: OAuth session expired and could not be refreshed"*; **no runs at all 2026-09-22 → 2026-10-05** (14 days, scheduler silent, no log files exist); `daily-2026-10-06_2303.log` and `weekly-2026-10-06_2316.log` → same OAuth failure; `daily-2026-10-07_0930.log` → *"Error: Reached max turns (50)"*; `daily-2026-10-08_0930.log` → *"You've hit your weekly limit · resets 5am (Asia/Kuala_Lumpur)"*. All seven recorded as `FAIL(2)` = "expected output file not found" (`gate.ps1:34`), which is accurate and tells the owner nothing about which of three unrelated problems to fix. Of 21 calendar days, **18 produced no artifact** and `docs/automation/standups/` ends at 2026-09-18. Owner call: (a) add an auth/quota preflight to `run-loop.ps1` so an expired OAuth session records `FAIL(auth)` and does not burn a slot, (b) alert on the scheduler's own silence — nothing noticed 14 missing fire-days, and (c) decide whether the 09-19 cause is recoverable (its log is gone; `run-loop.ps1:265` bounds each mode's logs to 30, so it rotated out).
2. **NEW — the 10-07 run burned all 50 turns and wrote nothing, violating the contract it was given.** Contract clause 7 is explicit: "If you cannot finish cleanly within it, write what you have, record the blocker in the state file, and STOP." That run produced no partial artifact. This is the one failure in the streak that is self-inflicted rather than account-level, and it is the one a prompt change can fix. Owner call: add a hard instruction to write a partial artifact at a turn-count watermark, or lower `dailyMaxTurns` so exhaustion arrives earlier and more survivably.
3. **NEW — the decay monitor is structurally incapable of reporting its own outage.** `compute-strategy-decay.py:27` anchors the rolling window to `max_ts`. 129 days stale, `insufficient_sample: false`, `auto_demote: false` on all three strategies, and one of them has negative realized expectancy. Proposal 1. Owner call: authorize the wall-clock freshness term and `generated_at` key as a standalone change, independently of the larger repointing work?
4. **NEW — measured accuracy is falling and the public surface cannot show it in time.** 1,194 fresh signals at 32.077% against the prior window's 41.575%; cumulative moved only 0.74 points. Proposal 2. Owner call: publish the rolling out-of-sample window, and give `/calibration` a real page to render it on?
5. **The published EMA200 is still the entry price** (09-18 Escalation 1, unchanged in code, confirmed live on AMDUSD today, third independent sample, instrument-class correlation now unbroken). Owner call unchanged: publish `null` with a "not computable" state, or fetch 200+ bars before publishing the field?
6. **The only alarm for a stalled D1 alpha lane still has no test** (09-18 Escalation 2). Owner-side by contract. This week's loop outage is the argument.
7. **The D1 alpha gate's disclosure asymmetry, now at day 60 with 0 of 12 closed trades and not one exit in 60 days** (09-18 Escalation 3). Proposal 4. Owner call: marked non-binding preview plus a terminal `insufficient-activity` state?
8. **Fourth consecutive run with the weekly's two named research skills unavailable.** `/deep-research` and `/market-research` depend on firecrawl/exa MCP servers that are not connected in the headless loop session; `mobbin` additionally requires an interactive OAuth flow that a headless session cannot run. The `WebSearch`/`WebFetch` substitution is declared every time, but four weeks is a standing contract-vs-reality gap. Owner call: provision the MCP servers for the loop session, or amend the contract to name the fallback?
9. **Branch divergence: static-behind, growing-ahead.** `feat/premium-ui-overhaul` is 81 behind / 84 ahead; the behind-count is identical for a fourth consecutive weekly because `main` has not moved since 2026-08-29. No PR opened by this run (weekly mode is propose-only). Any work arising from these proposals must branch from `origin/main`, **not** from this 81-behind tree — the d1-alpha and decay-monitor files this document cites do not exist on this branch at all and were read via `git show origin/main:<path>`.

---

## Sources

- Data freshness / dead-man's switch / wall-clock vs timestamp-lag monitoring: [pipecode.ai](https://pipecode.ai/blogs/data-freshness-sla-monitoring-budgets), [Conduktor](https://www.conduktor.io/glossary/data-freshness-monitoring-sla-management), [sempervent best-practices](https://sempervent.github.io/best-practices/data-governance/data-freshness-sla-governance/), [Kestra blueprint](https://kestra.io/blueprints/data-freshness-sla-guard), [DataTrail](https://datatrail.ai/features/freshness-monitoring)
- Calibration, ECE and reliability diagrams: [Two Sides of Miscalibration (arXiv 2308.03172)](https://arxiv.org/html/2308.03172v1), [Beyond Accuracy: Reliability and Uncertainty Estimation in CNNs](https://arxiv.org/pdf/2603.10731), [A Comparative Study of Confidence Calibration in Deep Learning](https://arxiv.org/pdf/2206.08833), [Estimating Expected Calibration Errors](https://www.researchgate.net/publication/354517176_Estimating_Expected_Calibration_Errors)
- Performance-presentation standards, composites and survivorship bias: [AnalystPrep GIPS](https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/global-investment-performance-standards-gips-standards/), [IFT GIPS](https://ift.world/booklets/ethics-introduction-to-gips-part1/), [EY GIPS](https://www.ey.com/en_us/insights/wealth-asset-management/global-investment-performance-standards)
- Production reads today (3 GETs): `https://tradeclaw.win/api/signals`, `https://tradeclaw.win/api/calibration`, `https://tradeclaw.win/track-record/alpha` (plus one confirming `https://tradeclaw.win/calibration`)
- Repo reads (read-only, via `git show origin/main:<path>` / `Read` / `Grep`): `scripts/compute-strategy-decay.py`, `apps/web/data/strategy-decay-metrics.json`, `apps/web/app/api/calibration/route.ts`, `apps/web/lib/confidence-calibration.ts`, `apps/web/lib/signal-history.ts`, `docs/research/weekly-research-2026-09-18.md`, `loops/state/tradeclaw.STATE.md`, `loops/lib/gate.ps1`, `loops/lib/run-loop.ps1`, `loops/projects/tradeclaw.json`, and six `loops/logs/tradeclaw/*.log`

## Status

**4 proposals.** P1 the decay monitor's data-anchored window and expectancy-blind demote rule (**new mechanism** for an item four weeklies carried as a chore; the ask changed shape as a result). P2 the 9.50-point out-of-sample accuracy decline and the flat cumulative surface that hides it (**new**, and the strongest measurement in this document). P3 the EMA200-is-entry defect at 21 days unfixed (carried, advanced by a third independent sample and an unbroken instrument-class correlation). P4 the D1 alpha gate's observation/performance asymmetry at day 60 with zero exits in 60 days (carried, advanced by a new day count that re-confirms two published identities and quantifies the `closedTrades` impossibility).

**3 items deliberately demoted** rather than re-argued (the untested stall alarm, the unmounted provenance badge, `/calibration` serving no calibration page — the last folded into P2's ask). **4 corrections** — one reversing a percentage this corpus published last week, one killing this run's own best-looking hypothesis, and one (in Lessons) correcting a conclusion this run reached and nearly published before a second permission layer refuted it. **5 findings killed under verification**, including two that would have been reported as scandals pointing the wrong way. **9 escalations, 4 new**, the highest being that this loop was dead for 21 days with three distinct causes collapsed into one exit code.

Previously killed seeds not re-proposed: the public calibration surface (shipped on `main`) and **Pro conversion funnel hardening** — `pricing/page.tsx` is a `redirect('/track-record')` and migration `053_drop_monetization.sql` removed subscriptions and tiers, so there is no funnel to harden and proposing one would contradict the shipped OSS pivot. Both remaining seeds from the launcher's candidate list are therefore addressed: signal quality gates / weak-pair suppression by P1, and confidence calibration / expectancy transparency by P2.

**Propose-only compliance:** no product code edited, no test written by this loop, no migration run, no deploy, no domain/claim/secret changed, no production PR opened, no write to Stripe or the signals table, no push to `main`, no force-push, no `git add -A`, no edit to `gate.ps1` or to the shared `project-loops` contract, no `--dangerously-skip-permissions`. Every performance number above is either read from a live public GET, read from a cited source line, or derived with the arithmetic shown; nothing is synthesized, and the two places where evidence runs out (`drawdownNoWorse`'s verdict, the genesis bar row) are labelled rather than filled in. Four network reads and two web searches were the only outbound calls. Ground truth re-verified immediately before commit (`caf9064c`, unmoved). Single explicit path staged via pathspec, so a concurrent writer's staged content cannot be bundled in.

**Grill verdict: SURVIVED**
