# Weekly Research — 2026-09-11

Mode: WEEKLY (propose only — no implementation). Read-only on product code.
Branch: `feat/premium-ui-overhaul`. At entry HEAD was `61eb9786`, upstream even (`git ls-remote` returned `61eb9786`, byte-equal to local HEAD), **81 behind / 73 ahead** of `origin/main` (`51f94081`, 2026-08-29). **HEAD moved during this run** — see the concurrency note below — and this document commits onto `33b4b4fd` at **81 behind / 74 ahead**. No merge/rebase in progress. Recovery stashes `stash@{0}` (tc254) and `stash@{1}` (tc253) preserved untouched. 94 worktrees registered.
Contract: `project-loops` weekly. Ground truth established via `continuous-improvement:reconcile` + `safety-guard` before any write.

This run fired on slot. `loops/logs/weekly-all-2026-09-11_0817.log` exists and the batch walked DrSaid `0817` → MosRev `0840` → continuous-improvement `0908` → tradeclaw `0922`, the serial-batch ordering established on 2026-09-07. **This answers Escalation 1 of the 2026-09-06 weekly** — see Escalations.

**Concurrency note (recorded because it happened to this run).** The project's on-slot 09:30 daily standup fired against the same checkout while this weekly was mid-flight and committed `33b4b4fd` at 09:39:10, moving HEAD off `61eb9786`. It touched `docs/automation/standups/2026-09-11.md` only — 251 insertions, 0 deletions, nothing under `docs/research`, no contact with this artifact — so nothing was lost or clobbered in either direction. Ground truth was re-established immediately before staging rather than assumed from the entry snapshot, which is the only reason the header above is accurate. This weekly commits via the pathspec form `git commit <path>` so that foreign staged content in the shared index cannot be bundled into it, the same defence the 09:30 standup adopted for the mirror-image risk.

## The organizing fact of this week

`origin/main` has not moved in 13 days: `git rev-list --count 51f94081..origin/main` returns **0**. Every claim in last week's document that was read from `origin/main` is therefore still true *by construction*, and re-verifying it proves nothing new. So this run spent its budget where the state actually changed — **production** — and the result is that the headline finding is new, measured, and worse than the one it replaces.

Last week's P1 said the reliability chart is range-restricted at 70 and does not disclose it. That is true and remains true. This week the same restriction was traced in the other direction — *out* of the ledger and into the live product — and the finding is no longer about a chart axis:

> A real signal is being served on the public API right now at **confidence 51**, with entry, stop and three take-profit levels, and neither writer will ever record its outcome.

## Method

- Internal friction/drift (`/continuous-improvement`, `reconcile`): all repo claims read from `origin/main` via `git show origin/main:<path>` / `git grep origin/main`, never from this 81-behind working tree.
- Live production measurement: read-only `GET` on three public endpoints, fetched 2026-09-11 — `/api/calibration`, `/api/track-record/alpha`, `/api/signals/public`. No writes, no authenticated calls, no DB access.
- External, cited: the `deep-research` and `market-research` skills route through the firecrawl/exa MCP servers, which are **again not connected** in this headless session (verified via `ToolSearch`, second consecutive week). Substituted `WebSearch` + read-only `WebFetch` and say so rather than claim a capability that did not run. Every external claim carries a URL that returned 200 this run; one candidate source (`targethit.com`) returned **HTTP 410 Gone** and is therefore not cited.

Provenance labelling: **[PRODUCTION]** = measured from tradeclaw.win on 2026-09-11; **[LOCAL]** = repo artifact that self-labels as local/dev sample; **[CODE]** = source read from `origin/main`; **[DERIVED]** = arithmetic performed here on published inputs, inputs shown so it can be rechecked. No metric in this document is synthesized.

---

## Proposal 1 — TradeClaw publishes signals it will never record. Measured live at confidence 51, `dataQuality: "real"`

**Problem.** The floor at which signals are *shown* (50) is twenty points below the floor at which outcomes are *recorded* (70). Everything in between is served to users with full trade levels and then deleted from the accountability record.

[PRODUCTION] `GET /api/signals/public`, 2026-09-11. Five signals returned. The fifth, verbatim from the payload:

```
"id": "SIG-AMDUSD-M15-BUY-MTVP7Q00", "symbol": "AMDUSD", "direction": "BUY",
"confidence": 51, "entry": 503.48001, "stopLoss": 498.7987,
"takeProfit1": 512.84263, "takeProfit2": 517.52394, "takeProfit3": 524.5459,
"status": "active", "source": "real", "dataQuality": "real", "signalSource": "algo",
"preBoostConfidence": 71, "mtfAgreement": 0, "confluenceBonus": -20
```

It is not a synthetic. `source` and `dataQuality` are both `"real"`, `signalSource` is `"algo"`, and it carries a complete executable trade plan. This matters because the synthetic path is capped at 59 by construction (`signal-generator.ts:163-167` clamps synthetic confidence to `WATCHLIST_MIN_CONFIDENCE - 1`), so "anything under 60 is a labelled dummy" was the obvious defence and the payload refutes it.

[CODE] **Both writers filter at 70, and they are the only two.** Writer A, the request path: `tracked-signals.ts:69-73` records only `signal.dataQuality === 'real' && signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE`. Writer B, the cron path: `api/cron/signals/route.ts:159` fetches with `{ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE }` and `:161` re-filters. `/api/calibration` reads the resulting ledger (`readHistoryAsync()` → `isCountedResolved`, `api/calibration/route.ts:44-51`). An unrecorded signal cannot appear in `totalSignals`, in any bucket, in Brier, in ECE, or on `/track-record`.

[CODE] **The read floor is 50, not 70, and it is computed rather than declared.** `tracked-signals.ts:210-215`:

```ts
const floor = Math.min(
  PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  ...STRATEGY_PRIORITY.map((sid) => minConfidenceFor(sid)),
);
result.signals = result.signals.filter((s) => s.confidence >= floor);
```

With `STRATEGY_MIN_CONFIDENCE = { classic: 50, 'regime-aware': 60, 'hmm-top3': 55, 'vwap-ema-bb': 60, 'full-risk': 50 }` (`signal-thresholds.ts:18-24`), that resolves to `Math.min(70, 50, 60, 60, 55, 50)` = **50**. Nothing in the file names 50; it falls out of a `Math.min` over a list that was written for a tier system the OSS pivot deleted. The comment above it still says "Published confidence floor."

[CODE] **Eleven verified call sites request no 70 floor**, so the 50–69 window is reachable from each: `dashboard/page.tsx:21-23` (explicitly 60), `api/consensus/route.ts:51-52` (explicitly `minConfidence: 0`, twice), `api/signals/public/route.ts:44` (`{}`), `api/digest/daily/route.ts:8` (`{}`), `api/votes/route.ts:10` (`{}`), `api/screener/route.ts:40` (`parseFloat(searchParams.get('minConfidence') || '0')`), `alert/[id]/page.tsx:66`, `api/explain/route.ts:116` and `:152`, `api/news/route.ts:78`, `api/og/signal/[id]/route.tsx:32`, `api/metrics/route.ts:59`. Stated fairly, the other direction exists too and is the larger group by traffic: `api/live-feed/route.ts:10,15`, `api/v1/signals/route.ts:73,133`, `api/v1/badge/[pair]/route.ts:15`, `api/signal-of-the-day/route.ts:48`, `api/badge/badge-state.ts:50`, `api/telegram/webhook/route.ts:145` and `lib/telegram-broadcast.ts:321` (80) all pass the floor explicitly. The defect is the inconsistency, not a blanket absence.

[CODE] **The mechanism that pushes a signal under the floor is a penalty, not a low score.** `signals.ts:299-311` applies a multi-timeframe confluence adjustment after scoring — `sig.confidence = Math.max(0, sig.confidence + mtf.confluenceBonus)` on the negative branch (floored at **0**, not at 48 or 50) — and `signal-generator.ts:903-915` sets that bonus as a step function of agreement across four timeframes: 4/4 → `+15`, 3 → `+10`, 2 → `+5`, 2v2 → `-20` (`isConflicted`), any other split → `-20` (`isConflicted`). AMDUSD scored **71 pre-boost**, above the recording floor, and was demoted to 51 by the conflict penalty. It is served; it will not be scored.

[DERIVED] The arithmetic identity `confidence = preBoostConfidence + confluenceBonus` reproduces exactly on all five live rows: 69+15=84, 70+10=80, 70+5=75, 70+5=75, 71−20=51. Reported as an observed identity across the sample, not as a traced code path.

**The honest counter-reading, because the brand forbids reporting only the convenient direction.** The natural assumption is that dropping low-confidence signals inflates the published win rate. **That is not established, and the available evidence points the other way.** Inside the recorded range, higher confidence realizes a *lower* win rate (Proposal 2: 70–79 at 37.65%, 80–89 at 34.12%). If that relationship extended below 70, the excluded signals would win *more often* and the published record would be understating TradeClaw, not flattering it. The true direction is unknown and — this is the actual defect — **unknowable, because the outcomes are never written down.** The problem is not a proven inflation. It is an unmeasurable selection applied to the number the entire brand rests on.

**Proposed change (future PR, propose-only here).** Four separable pieces, cheapest first. (1) Make the two floors one named constant and state the intended relationship in code, replacing the `Math.min` over dead tier data; whichever value wins, `publish` and `record` should not be able to drift apart silently. (2) Shadow-record every served signal regardless of confidence — scored, outcome-tracked, flagged `below_publication_floor`, excluded from headline figures by default and available behind a toggle. This is the same pattern the codebase already uses for gate-blocked rows, which are recorded for accounting and stripped from the response (`tracked-signals.ts:160-163`) — the inverse of the current 50–69 behaviour, which shows more than it records. (3) Until (2) lands, label a sub-70 signal *at the point of display* as not counted in the public record. (4) Then test the hypothesis (2) makes available for the first time: whether the `-20` conflict penalty is removing better-than-average signals from the record.

**Evidence.** [PRODUCTION] `/api/signals/public` payload above, fetched read-only 2026-09-11. [CODE] `tracked-signals.ts:69-73,160-163,210-215`; `signal-thresholds.ts:1-2,18-24,26-28`; `signals.ts:299-311`; `signal-generator.ts:163-167,903-915`; `api/cron/signals/route.ts:159,161`; `api/calibration/route.ts:44-51`; the eleven call sites listed above. External: the GIPS standards exist to solve exactly this class of problem and state the remedy as a rule — firms must "include all actual, discretionary, fee-paying portfolios in at least one composite defined by investment mandate, objective, or strategy to prevent firms from cherry-picking their best performance" ([GIPS standards, AnalystPrep](https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/the-gips-standards/), [GIPS Guidance Statement on Composite Definition](https://www.gipsstandards.org/wp-content/uploads/2021/03/composite_def_gs_2011.pdf)). Market: 2026 buyer guidance names selective publication as the specific thing to distrust — "Cherry-picked screenshots are the subtle one. Anyone can crop the winners and hide the stops that were hit. Ask for the full record, or assume the worst," alongside "honest reporting of losing trades, not just wins" and "a dated, verifiable track record you can actually check" ([best crypto signals provider vetting guide](https://mycryptoparadise.com/best-crypto-signals-provider/)); comparison guides rank a "transparent, verifiable track record" with "clear entry, stop-loss, and take-profit levels on every signal" as the primary credibility test ([best trading signal providers 2026](https://www.daytrading.com/trading-signals), [forex signals providers 2026](https://www.forexbrokers.com/guides/forex-signals-providers)).

**Effort/impact.** Effort: low for (1) and (3) — one constant and one label; medium for (2), which needs a flag on the write path and an exclusion in the read path, but no new storage system since the ledger already carries `gateBlocked`/`gateReason` for precisely this purpose. Impact: **highest on this list.** It is the only finding that touches the literal brand promise rather than a chart or an internal gate.

**Brand-alignment:** "Every trade verified" and "radical transparency (wins AND losses, no cherry-picking)" are contradicted by a live endpoint serving a real, fully-specified trade at confidence 51 whose outcome is structurally excluded from the verified record. A record that omits the trades the engine was least sure about is a filtered log presented as the log.

**Grill verdict:** SURVIVED — the strongest objection is that a sub-70 signal is a *candidate*, not a recommendation, so excluding it from the track record is correct scoping. Three answers. The payload carries no field marking it as a candidate: `status` is `"active"`, identical to the 84-confidence row, and it ships entry, stop and three targets. There is no `isConflicted` flag in the response even though the generator computes one (`signal-generator.ts:909,914`), so a consumer cannot distinguish the two classes without reverse-engineering `mtfAgreement`. And the codebase already demonstrates the correct pattern in the opposite direction — gate-blocked signals are recorded for accounting and withheld from display, with a comment explaining exactly why ("users must not be alerted about trades the system refused to take"). Applying the mirror of that reasoning here yields: record it, then decide whether to show it. A second objection — that `/api/signals/public` is a low-traffic developer endpoint — fails because `/dashboard`, the primary product surface, requests at 60 (`dashboard/page.tsx:22`).

## Proposal 2 — The confidence number is mostly a timeframe-agreement score, and its ordering power is now zero out of sample

**Problem.** Two things are true at once and only the first has been reported before: the published confidence is badly mis-levelled (ECE 0.4231), *and* as of this week it no longer orders outcomes at all.

[PRODUCTION] `GET /api/calibration`, 2026-09-11 (`updatedAt` `2026-09-10T18:01:51.119Z`, `isSimulated` false, `insufficientData` false):

| Band | n | wins | realized win rate | calibrationError |
|---|---|---|---|---|
| 50–59% | 0 | 0 | null | null |
| 60–69% | 0 | 0 | null | null |
| 70–79% | 3,426 | 1,290 | **37.653240%** | 0.368468 |
| 80–89% | 2,321 | 792 | **34.123223%** | 0.503768 |
| 90–99% | 0 | 0 | null | null |

`totalSignals` 5,747, `overallAccuracy` 0.362276, Brier 0.401381, ECE 0.423110.

[DERIVED] Integrity checks first, so nothing below rests on trust. 3,426 + 2,321 = 5,747 ✓. 1,290 + 792 = 2,082, and 2,082 / 5,747 = 0.3622760 ✓ matching `overallAccuracy` to seven places. ECE reproduces exactly: (3,426 × 0.368468 + 2,321 × 0.503768) / 5,747 = (1,262.370 + 1,169.245) / 5,747 = 2,431.615 / 5,747 = **0.4231103** ✓.

[DERIVED] **The cumulative inversion is still significant.** Two-proportion z-test, 1,290/3,426 vs 792/2,321: pooled p = 0.3622760, SE = 0.0129220, **z = 2.732, two-sided p ≈ 0.0063** (was z = 2.867, p ≈ 0.0041 on 2026-09-06). Over the full pool, the higher-confidence band still wins less.

[DERIVED] **And it is not happening any more.** Differencing the 09-06 payload against today's gives a clean 431-signal out-of-sample window: 70–79 gained 231 rows and 79 wins (**34.199%**); 80–89 gained 200 rows and 70 wins (**35.000%**). The higher band did slightly *better*. z = −0.174, **p ≈ 0.86**. Adding the previous window reported on 09-06 (+272/+98 and +142/+52 since 08-28 — quoted from that committed artifact, not re-fetched, and labelled accordingly) gives 845 signals since 2026-08-28: 70–79 at 177/503 = 35.189%, 80–89 at 122/342 = 35.673%, z = −0.144, **p ≈ 0.89**.

So the correct statement as of today is not "the score is backwards." It is: **over the last 845 resolved signals the two published bands are statistically indistinguishable, and the significant cumulative inversion is carried by older data.** The score is not inverted. It is uninformative — over the only range it is ever measured on.

[PRODUCTION + CODE] **Why the number moves at all is now visible in the payload, and it is not the model.** Across the five live signals, `preBoostConfidence` is clustered at **69, 70, 70, 70, 71** — a 2-point spread — while published confidence ranges **51 to 84**. The entire 33-point spread comes from the multi-timeframe confluence step (`+15/+10/+5/−20`, `signal-generator.ts:903-915`, applied at `signals.ts:299-311`). On this sample the published "confidence" is very nearly a relabelled MTF-agreement count, and the bands the reliability chart compares are mostly `+5/+10` versus `+15`.

That makes the calibration result a direct test of a widely-asserted trading claim. Practitioner literature holds that multi-timeframe agreement is "among the strongest forms of confluence" and "significantly reduces false signals" ([multi-timeframe confluence](https://tradefundrr.com/multiple-timeframe-confluence-trading/), [confluence in trading](https://www.chartguru.io/blog/what-is-confluence-in-trading)) — and the search for supporting evidence returns practitioner and educational material, not peer-reviewed results. TradeClaw has 5,747 resolved signals with which to check it, and its own record does not support it: the `+15` band realizes 34.12% against the `+5/+10` band's 37.65%.

**Proposed change (future PR).** (1) Stop calling the field `confidence` on public surfaces, or state next to it that a 74.5% midpoint band realizes 37.65% — an ECE of 0.42 means the number is not a probability of winning, and presenting it as a percentage invites exactly that reading. (2) Publish the decomposition already present in the payload — `preBoostConfidence`, `mtfAgreement`, `confluenceBonus` — on the signal detail surface, so a reader can see that the headline number is mostly a confluence step. (3) Publish the rolling out-of-sample band comparison beside the cumulative one, so "the inversion stopped" is visible rather than buried under five months of pooled history. (4) Do not silently re-weight the generator to fix the chart; that hides the finding instead of publishing it.

**Evidence.** [PRODUCTION] `/api/calibration` payload above; `/api/signals/public` `preBoostConfidence`/`confluenceBonus` fields. [CODE] `api/calibration/route.ts:28-34` (five hard-coded bands), `:36-41` (the comment recording the prior fabricated-by-construction bug), `:44-51`; `signal-generator.ts:903-915`; `signals.ts:299-311`. External: a confidence score is not a probability unless it is calibrated, and ECE is defined as the bin-size-weighted gap between stated confidence and realized accuracy ([confidence calibration in LLMs, arXiv](https://arxiv.org/pdf/2605.23909), [two sides of miscalibration, arXiv 2308.03172](https://arxiv.org/pdf/2308.03172)); ECE itself is a coarse summary and can stay small under large overconfidence risk, which is an argument for publishing the per-band table rather than the scalar ([Beyond ECE, arXiv 2605.01796](https://arxiv.org/html/2605.01796)).

**Effort/impact.** Effort: low for (1) and (2) — copy plus fields the API already computes; medium for (3). Impact: high. This is the number on the dashboard, the screener sort key, and the social-post copy (`tracked-signals.ts:184` posts `${sig.confidence}% confidence` to social for every signal ≥ 75).

**Brand-alignment:** "Measurable proof over marketing spin" cuts against TradeClaw's own marketing too. The site publishes a number labelled as a percentage that its own 5,747-row record shows is off by 37–50 points at the level and currently carries no ordering information. Publishing that, rather than re-weighting until the chart looks better, is the brand.

**Grill verdict:** SURVIVED — the serious objection is that win rate is the wrong yardstick: a 35% win rate with 3:1 targets is profitable, so a "confidence" that does not predict win rate is not necessarily broken. That is correct and it is why this proposal asks for relabelling and decomposition rather than for the generator to be changed. It does not rescue the calibration chart, which plots confidence against *win rate* specifically and reports an ECE computed on that basis; if win rate is the wrong yardstick, `/calibration` is measuring the wrong thing and should say so. Either way the page as shipped makes a claim the data contradicts. A second objection — that a 431-signal window is too small to conclude "no ordering" — is accepted: the claim made here is the absence of a detectable difference, not proof of equality, and both windows are reported with their n and p rather than summarized.

## Proposal 3 — The D1 alpha gate's last passing performance check just failed, exactly as predicted five days ago, and the gate still cannot record it

**Problem.** The 2026-09-06 weekly wrote that the lane's only favourable metric was "1.3 basis points from being the difference between a published `failed-gate` and 338 more days of 'collecting evidence'." That was a falsifiable prediction. **It resolved against the strategy in five days.**

[PRODUCTION] `GET /api/track-record/alpha`, 2026-09-11 vs the 2026-09-06 reading:

| Field | 2026-09-06 | 2026-09-11 | Δ |
|---|---|---|---|
| calendarDays | 27 | 32 | +5 |
| snapshots / verifiedRows | 28 | 33 | +5 |
| closedTrades | 0 | **0** | 0 |
| strategyNetReturn | +8.732507% | **+5.434352%** | −3.30 pts |
| benchmarkNetReturn | +24.889428% | +21.136291% | −3.75 pts |
| activeReturn | −16.156921% | **−15.701939%** | +0.46 pts |
| strategyMaxDrawdown | 4.359046% | **4.474217%** | +0.12 pts |
| benchmarkMaxDrawdown | 4.372139% | 4.438693% | +0.07 pts |
| unresolvedCadenceGaps | 0 | 0 | 0 |

`label` `"collecting evidence"`, `status` `"collecting-evidence"`, `promotion` `"not-promoted"`, `ruleFrozen` true, `integrity.status` `"pass"`, `latestCommittedAt` `2026-09-11T00:01:51.307Z` (the writer ran today), positions `BTCUSD: LONG` / `ETHUSD: LONG`. `ruleSha256` `a9c222a3…` and `artifactSha256` `1a6b28e4…` are unchanged from 09-06 and still match `D1_ALPHA_RULE_SHA256` / `D1_ALPHA_ARTIFACT_SHA256` in `d1-alpha-protocol.ts:6-9` — **the frozen protocol is intact**, which is the thing that would matter most if it were not.

[DERIVED] **The drawdown check has flipped.** On 09-06, benchmark − strategy = 4.372139% − 4.359046% = **+1.31 bp** in the strategy's favour. Today it is 4.438693% − 4.474217% = **−3.55 bp** against. The gate condition is `drawdownNoWorse: metrics.strategyMaxDrawdown <= metrics.benchmarkMaxDrawdown` (`d1-alpha-protocol.ts:473`), which now evaluates **false**.

[DERIVED] Applying the published gate logic to the published numbers, **three of four performance checks now fail**, up from two on 09-06: `positiveStrategyReturn` **true** (+5.43%); `positiveActiveReturn` **false** (−15.70%); `drawdownNoWorse` **false** (newly); `calmarNoWorse` **false**. The Calmar leg no longer needs deriving — the API now publishes it directly: `strategyCalmar` **18.521437** against `benchmarkCalmar` **178.191481**, a factor of **9.62**.

[PRODUCTION] **And the payload publishes four nulls where those answers belong.** `gate.performanceChecks` is `{ positiveStrategyReturn: null, positiveActiveReturn: null, drawdownNoWorse: null, calmarNoWorse: null }` — the response advertises exactly four named checks, ships every input needed to evaluate all four in the same object, and reports none of them, because `observationMinimumMet` is false so `evaluateD1AlphaGate` returns early (`d1-alpha-protocol.ts:444-482`). A reader is shown a gate with no verdicts and a label that says evidence is being collected.

[DERIVED] **The closure-pace boundary was crossed this week.** `D1_ALPHA_MIN_CLOSED_TRADES = 12` over 365 days is one closure per **30.42 days**. On 09-06 the lane sat at day 27 with zero closes — at the boundary, which last week correctly refused to call a failure. Today it is **day 32 with zero closes**, so the first closure is past due on an even pace, and the remaining requirement has tightened to 12 closes in 333 days = one per **27.75 days**, 8.8% tighter than at inception. This is still not evidence the strategy is broken — `D1_ALPHA_MAX_DIRECTION_CHANGES = 30` (`:19`) shows the protocol expects low turnover, and both sleeves are legitimately long. It is evidence that **nothing measures or publishes the pace**, and that a healthy slow strategy and a lane that will never satisfy its own minimum remain indistinguishable from outside.

[CODE] The structural defect is unchanged and re-stated rather than re-discovered: `evaluateD1AlphaGate` (`:444-482`) has no calendar-expiry branch and no terminal status. If the sleeve closes fewer than 12 trades in 365 days, `observationMinimumMet` stays false and the lane returns `collecting-evidence` **past day 365, indefinitely** — never `failed-gate`, never `eligible-for-review`.

**Proposed change (future PR).** Three pieces, and the first two are nearly free. (1) Evaluate and publish the four performance checks as **non-binding preview** whenever the inputs exist, clearly marked as not yet gating — the payload already contains every input, so this replaces four nulls with four honest answers and costs no change to the frozen rule. (2) Add a terminal `insufficient-activity` status when `calendarDays >= D1_ALPHA_MIN_CALENDAR_DAYS` and `closedTrades < D1_ALPHA_MIN_CLOSED_TRADES`, and surface the pace on `/track-record/alpha` as "0 of 12 closed trades, day 32 of 365; even pace requires 1 per 30.4 days." (3) Then the pre-registered futility boundary carried from 2026-08-28 P4: freeze and publish it under the same rule-hash discipline before it is ever evaluated, scope it to futility only, and give it a `failed-futility` status. Pieces (1) and (2) add no look at performance that changes the rule and are worth shipping alone.

**Evidence.** [PRODUCTION] the two alpha payloads above, both fetched read-only; the 09-06 figures are quoted from the committed `weekly-research-2026-09-06.md`. [CODE] `d1-alpha-protocol.ts:6-9` (hashes matching production), `:16` (12-trade minimum), `:19` (30 direction changes), `:256` (closure increment), `:401-408` (Calmar), `:444-482` (early return, no terminal branch), `:471-476` (the four checks); `d1-alpha-ledger.ts:213-215`. External: futility boundaries exist to permit abandoning early without the multiple-comparisons cost of ad-hoc peeking, and "event rates too low to support a meaningful comparison" is a recognized stopping reason and is precisely this case ([futility in clinical trials, JAMAevidence](https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930), [trials stopped early for futility, BMC Med Res Methodol](https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1), [standardising interim-analysis terminology, arXiv 2410.01478](https://arxiv.org/pdf/2410.01478)).

**Effort/impact.** Effort: low for (1) — the values are already computed; low for (2) — one status value, one comparison, one display string; medium for (3). Impact: high, and now demonstrated rather than argued: a check that a human reading last week's document knew was 1.3 bp from failing has failed, and the published artifact still says `collecting evidence` with four nulls.

**Brand-alignment:** "Disciplined risk management (auto-demote strategies that lose edge)" requires that a lane can end, and that an adverse result is visible when it happens. A gate whose only reachable state is "collecting evidence" converts a measurable negative into an indefinite pending — the exact failure mode of every track record this project was built to replace.

**Grill verdict:** SURVIVED — the honest objection is that 32 days of a 365-day protocol is noise and reporting a drawdown flip at this stage is the peeking the frozen rule exists to prevent. Accepted in full for the *rule*: nothing here proposes changing what the gate does, when it binds, or the frozen hashes, and the proposal explicitly keeps the rule untouched. It is rejected for the *disclosure*: the lane already publishes `strategyNetReturn`, `activeReturn`, both drawdowns and both Calmars on a public endpoint, so the numbers are public already and only the four verdicts derived from them are withheld. Publishing four nulls next to four published inputs is not restraint, it is a gap a reader must close by hand — and last week this document closed it by hand and got the prediction right.

## Proposal 4 — The edge-decay monitor is 101 days stale, and the production number it should be judged against is measured today

**Problem.** Carried from 2026-09-06 and 2026-08-28, re-stated because `origin/main` has not moved, with one new measured input and a tightened staleness count.

*Staleness.* [LOCAL] `apps/web/data/strategy-decay-metrics.json` was last touched by commit `59ccb823` (authored 2026-06-03, committed 2026-06-04 — both dates given because prior standups have cited them inconsistently), and its `date_range` ends **2026-06-02**, now **101 days** without a refresh, up from 96 on 09-06. Nothing regenerates it: `git grep -l compute-strategy-decay origin/main` returns only consumers, and there is no workflow or cron route. The admin page renders it with no freshness stamp.

*A threshold that cannot fire.* [LOCAL/CODE] The rule is `flag when rolling_90d_win_rate < 0.5 × historical_baseline`, baseline 50.8%, trigger 25.4% (`_meta.decay_rule`, mirrored at `strategy-library.ts:125-133`), `min_sample_for_window` 20. `hmm-top3` sits at 33.7% rolling-90d on n = 332 and is not flagged; it would have to shed another 8.3 points.

*The comparison is cross-methodology, by the artifact's own admission.* `_meta.cross_source_note` states the 50.8% baseline is **scanner** methodology while the per-strategy rates are **web** methodology, that "the stricter web win definition understates hmm-top3 against the looser scanner baseline," and that the comparison is "only INDICATIVE."

[PRODUCTION] The like-for-like number the trigger should be built on was measured again this run: web-methodology pooled win rate = 2,082 / 5,747 = **36.23%** (36.36% on 09-06). The LOCAL scanner baseline of 50.8% sits **14.6 points** above it before any question of decay arises.

*And it gates nothing.* [CODE] `signal-generator.ts` contains exactly two suppression gates — market hours (`:670`) and ADX (`:673`). No decay hook exists in the delivery path; `decay_status` / `auto_demote` (`strategy-library.ts:40-41,59-60`) are read only by `admin/strategy-library/page.tsx`.

**Proposed change (future PR).** Unchanged in substance from 09-06, ordered cheapest first. (1) Stamp `generated_at` and surface a "stale, last observed &lt;date&gt;" state wherever decay is displayed, so a dead monitor reads as dead. (2) Compute a web-methodology baseline from the production ledger so trigger and measurement share a definition; the number to beat is 36.23%, measured today. (3) Replace the `0.5 × baseline` floor with a one-sided binomial test against the frozen like-for-like baseline, keeping the n ≥ 20 floor. (4) Only then wire the flag into the delivery path, showing a demoted strategy *as demoted with its evidence*, never silently withheld.

**Evidence.** [LOCAL] `strategy-decay-metrics.json` `_meta` and `strategies.hmm-top3` (`resolved_signals` 332, `wins` 112, `rolling_90d.win_rate` 33.7, `date_range` ends 2026-06-02); last-touch `59ccb823`. [PRODUCTION] 2,082/5,747 = 36.23% from `/api/calibration`. [CODE] `strategy-library.ts:40-41,59-60,125-133`; `signal-generator.ts:670,673`. External: alpha decay is continuous and is detected by rolling re-evaluation, which is the thing not running here ([signal decay patterns](https://microalphas.com/signal-decay-patterns/), [Foxholm on signal decay](https://foxholm.com/q/concepts/signal-decay/)).

**Effort/impact.** Effort: low for (1); medium for (2)–(4). Impact: high. "Auto-demote strategies that lose edge" is a headline claim backed by a 101-day-old LOCAL snapshot judged against a threshold the artifact itself calls indicative.

**Brand-alignment:** "Distinguish LOCAL scanner/dev samples from production verified record" is a verbatim project constraint, and this artifact is the clearest live case of the two being mixed — a scanner baseline setting the trigger for web-methodology numbers, rendered with no staleness or provenance signal.

**Grill verdict:** SURVIVED, with a caveat stated rather than hidden — this is the **third consecutive weekly** to carry it, and a proposal that survives three grillings without being built is evidence about prioritization, not about the proposal. Its technical case is unchanged and re-verified (mechanically, since `origin/main` is byte-identical to last week); its new content is one measured input (36.23%) and five more days of staleness. It is ranked last here for that reason, not because it got weaker.

---

## Carried but demoted from proposal status

**The provenance badge is still unmounted on `/track-record` and `/calibration`** (2026-08-28 P4, 2026-09-06 P4). `git grep -l data-provenance-badge origin/main` returns four paths, only two of which are code — `accuracy/AccuracyClient.tsx` and `components/accuracy-stats-bar.tsx` — re-run this run and unchanged. `/api/calibration` still ships `isSimulated: false` and `insufficientData: false` and neither reaches the page. This is deliberately **not** written as a fifth proposal: it has been proposed twice, is unchanged, and re-litigating it a third time at full length would pad this document rather than inform it. It is one field per surface against a component that already exists and is already localized, and it belongs in the same PR as Proposal 1's labelling work.

## Corrections to the 2026-09-06 weekly

1. **"The Friday 2026-09-04 weekly did not self-heal, because `promptFile.weekly` is `null`."** The mechanism claim is true — `loops/projects/tradeclaw.json:10` does set `"weekly": null`, re-read this run — but the conclusion drawn from it, that the weekly rides a scheduler entry the wake did not reach, is **refuted by this run's own existence**. `loops/logs/weekly-all-2026-09-11_0817.log` exists and shares the `0817` stamp with the daily catch-up, so the same wake fired both. The 09-04 gap was host-off, not a broken entry. This is the 2026-09-07 lesson recurring: verifying a mechanism is not verifying an event.
2. **Branch position.** Last week recorded 81 behind / 68 ahead. At this run's entry it was 81 behind / **73 ahead**, and at commit time 81 behind / **74 ahead** after the 09:30 standup landed mid-run. The behind-count is identical across all three readings because `origin/main` has not moved; the ahead-count grew by five standups over the week and one more during this run.
3. **Decay artifact date.** Last week said "commit `59ccb823` (2026-06-04)". Author date is 2026-06-03, committer date 2026-06-04. Neither is wrong; both are now stated so the ambiguity stops propagating. The load-bearing date is `date_range` ending 2026-06-02, which is unchanged.

## Findings that died under verification this run (recorded, not proposed)

- **"The `/dashboard` 60-point request means users see a labelled watchlist tier, and the 60–69 band is quarantined."** False — there is no watchlist tier. `git grep -ni watchlist` across `apps/web/app/dashboard`, `apps/web/lib/tracked-signals.ts` and `apps/web/app/components` returns exactly two hits, both the import and the use of the constant at `dashboard/page.tsx:4,22`. No label, no separate section, no copy. The band is not quarantined; it is simply mixed in. This made Proposal 1 stronger, not weaker, and it was found only because the grep was run instead of assumed.
- **"The 90–99 band is empty because the generator cannot reach it."** False, and worth stating because it is the tempting symmetry with the low bands. `scaleConfidence` clamps real signals at **95** (`signal-generator.ts:170`) and the positive confluence branch clamps at 95 (`signals.ts:300`), so 90–95 is reachable. Zero of 5,747 landed there. That is an empirical fact about the score distribution, not a structural impossibility, and conflating the two would have been the same error as last week's screener-default misreading.
- **"The AMDUSD signal at 51 is a labelled synthetic, so excluding it is correct."** False, and this was the objection most likely to kill Proposal 1. The payload reports `source: "real"`, `dataQuality: "real"`, `signalSource: "algo"`, and the synthetic path is capped at 59 by `WATCHLIST_MIN_CONFIDENCE - 1` (`signal-generator.ts:163-167`) — so 51 is *consistent* with a synthetic, which is exactly why it had to be checked rather than assumed. It is real.
- **"Four commits may have landed on `main` addressing last week's proposals."** False by measurement, not by inspection: `git rev-list --count 51f94081..origin/main` returns 0. `main` is static at 13 days.

## Lessons and escalations

`loops/state/tradeclaw.STATE.md` has no `## Lessons` or `## Escalations` heading anywhere in its 386 lines — the file is machine run-records only, and the append is blocked at the harness sensitive-path layer (`loops/state/` is outside the granted write scope; `gateguard` clears it and the harness then denies it, the two-layer pattern recorded 2026-09-03 and re-confirmed 2026-09-07 and 2026-09-08). Per the loop contract these are recorded in the committed artifact instead, unabridged.

**Lessons (durable)**

1. **When the ref you verify against has not moved, re-verification is a no-op — spend the budget where the state actually changed.** `origin/main` was byte-identical to last week (`rev-list --count` = 0), so every `origin/main` claim was already true and re-reading it would have produced a document of unchanged findings. Redirecting to production produced the strongest finding of the run. The general rule: before re-verifying, check whether the source could have changed.
2. **Follow the value through to the caller before believing a filter.** `dashboard/page.tsx` requests `minConfidence: 60`, but that request is not what binds — `tracked-signals.ts:210-215` computes a response floor via `Math.min` over a `STRATEGY_MIN_CONFIDENCE` map left behind by the deleted tier system, which resolves to 50. Neither number is written in the file. This is 2026-09-06's Lesson 1 ("a grep proves the line exists, not that it is the one that runs") applied successfully for the first time, and it changed the finding from "the chart hides a band" to "the product ships trades it never scores."
3. **Check the defence that would kill your finding before you write the finding.** A confidence of 51 is consistent with the synthetic cap of 59. Had this document asserted the accountability gap without fetching `dataQuality`, one field would have destroyed it. The cost of the check was one request; the cost of skipping it would have been the whole proposal.
4. **A falsifiable prediction is the cheapest verification instrument available to a weekly loop.** Last week's "1.3 basis points from a failed check" resolved in five days against the strategy, converting a hypothetical structural argument into a demonstrated one at zero additional cost. Record predictions with the number and the direction so the next run can grade them.
5. **Report the direction of a bias only if it is measured.** The intuitive read — excluding low-confidence signals inflates the published win rate — is unsupported here, and the in-range data points the other way. Stating "the bias is unmeasurable because the outcomes are never recorded" is both the honest claim and the stronger one.
6. **A dead source URL is not a citation.** `targethit.com` returned HTTP 410; it was dropped rather than cited from search-snippet text. Second consecutive week that a named research skill (`deep-research`, `market-research`) was unavailable via MCP and the substitution was declared rather than glossed.
7. **Re-check HEAD immediately before staging, not once at entry.** This run opened at `61eb9786` and committed onto `33b4b4fd`: the project's own 09:30 daily standup fired against the same checkout mid-flight. Nothing was lost because the two runs write disjoint paths and the re-check happened before staging — but a document whose header asserted an entry-time HEAD would have shipped a stale fact in the same artifact that criticizes unverified claims. On a shared checkout the entry snapshot is a starting point, never the commit-time truth.

**Escalations (owner decision required)**

1. **RESOLVED — the weekly scheduler entry is registered and fired on slot.** Last week's Escalation 1 asked whether it still existed. `loops/logs/weekly-all-2026-09-11_0817.log` exists, the batch walked DrSaid `0817` → MosRev `0840` → continuous-improvement `0908` → tradeclaw `0922`, and this run is that fire. The 2026-09-04 gap was host-off, not deregistration. No owner action needed. Separately, the 2026-09-11 standup's falsifiable prediction is **CONFIRMED**: `loops/logs/tradeclaw/daily-2026-09-11_0930.log` exists, so the second daily fired on slot as predicted.
2. **NEW AND HIGHEST — TradeClaw serves real, fully-specified trades below the floor at which it records outcomes.** Measured live: `SIG-AMDUSD-M15-BUY-MTVP7Q00`, confidence 51, `dataQuality: "real"`, entry 503.48 / stop 498.80 / three targets, demoted from a pre-boost 71 by a `-20` multi-timeframe conflict penalty. Both writers filter at ≥ 70, so its outcome can never enter `/api/calibration` or `/track-record`. Eleven verified call sites request no 70 floor, including `/dashboard`. Owner call: shadow-record every served signal (flagged, excluded from headline figures by default), or raise the display floor to the record floor? One of the two, because the current state publishes a promise the record cannot keep.
3. **The D1 alpha lane's last passing performance check has failed.** Strategy drawdown 4.474217% now exceeds benchmark 4.438693% by 3.55 bp, reversing a 1.31 bp advantage in five days; three of four performance checks would now fail; published `strategyCalmar` 18.52 vs `benchmarkCalmar` 178.19; day 32 of 365 with 0 of 12 closed trades, past the even-pace deadline of day 30.4. The payload publishes four `null` performance checks beside every input needed to evaluate them. Owner call: publish the four checks as a non-binding preview and add terminal `insufficient-activity`, both without touching the frozen rule?
4. **The published confidence number no longer orders outcomes.** Over the last 431 resolved signals, 70–79 realized 34.20% and 80–89 realized 35.00% (z = −0.17, p ≈ 0.86); over 845 since 2026-08-28, 35.19% vs 35.67% (z = −0.14, p ≈ 0.89). The cumulative inversion remains significant (z = 2.73, p ≈ 0.0063) but is carried by older data. ECE 0.4231 over two populated bins. Owner call: relabel the field and publish the `preBoostConfidence`/`confluenceBonus` decomposition, or keep sorting the screener by it?
5. **The edge-decay monitor has not run in 101 days and its threshold is cross-methodology.** Nothing regenerates it; the 25.4% trigger derives from a 50.8% scanner baseline applied to web-methodology rates the artifact itself calls "only INDICATIVE"; production web-methodology pooled is 36.23%, measured today. Third consecutive weekly carrying this. Owner call: schedule regeneration and compute a like-for-like baseline?
6. **Branch divergence is static-behind and growing-ahead.** `feat/premium-ui-overhaul` is 81 behind / 73 ahead of `origin/main`. The behind-count has not changed in 13 days because `main` has not moved. Per the 2026-09-09 standup's correction, of the branch-unique commits the overwhelming majority are standups and research-CLI work and exactly one is the UI overhaul, so the standing "this loop does not own the UI overhaul" reason is true but describes a single commit. No PR opened by this run: weekly mode is propose-only, and any work arising from these proposals must branch from `origin/main`, not from this 81-behind tree.

## Sources

- Performance-presentation standards / anti-cherry-picking: https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/the-gips-standards/ , https://www.gipsstandards.org/wp-content/uploads/2021/03/composite_def_gs_2011.pdf
- Market / buyer guidance on full-record transparency: https://mycryptoparadise.com/best-crypto-signals-provider/ , https://www.daytrading.com/trading-signals , https://www.forexbrokers.com/guides/forex-signals-providers
- Multi-timeframe confluence (practitioner claims, not peer-reviewed): https://tradefundrr.com/multiple-timeframe-confluence-trading/ , https://www.chartguru.io/blog/what-is-confluence-in-trading
- Calibration / ECE / overconfidence: https://arxiv.org/pdf/2605.23909 , https://arxiv.org/pdf/2308.03172 , https://arxiv.org/html/2605.01796
- Futility / interim analysis / stopping: https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930 , https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1 , https://arxiv.org/pdf/2410.01478
- Alpha / signal decay: https://microalphas.com/signal-decay-patterns/ , https://foxholm.com/q/concepts/signal-decay/

## Status

4 proposals — P1 publish/record floor mismatch (**new**, measured live, subsumes and re-grounds last week's P1 on a mechanism rather than a chart axis), P2 confidence is an MTF-agreement score with zero out-of-sample ordering (**new decomposition**, absorbs last week's P1 calibration evidence), P3 D1 gate terminal state with last week's prediction resolved (sharpened), P4 decay monitor staleness at 101 days (carried, third weekly, ranked last and said so). 1 item deliberately demoted from proposal status (provenance badge). 3 corrections to the 2026-09-06 weekly. 4 candidate findings killed under verification. 6 escalations, 1 of them resolved and closed.

Previously killed seeds not re-proposed: the public calibration surface (shipped on `main`) and Pro conversion funnel hardening (`apps/web/app/pricing/page.tsx` is a `redirect('/track-record')`; migration `053_drop_monetization.sql` removed subscriptions and tiers — there is no funnel to harden, and proposing one would contradict the shipped OSS pivot). Noted for completeness: the dead tier system is not merely absent, it is *load-bearing in the wrong direction* — `STRATEGY_MIN_CONFIDENCE`, the map left behind by that removal, is what silently sets the read floor to 50 in Proposal 1.

Propose-only: no product code edited, no migration run, no domain, claim, or secret changed, no production PR opened, no write to Stripe or the signals table, no push to `main`, no edit to `gate.ps1` or to the shared `project-loops` contract. Three read-only public GETs, three web searches and two read-only web fetches were the only network calls. Single explicit path staged and committed to `feat/premium-ui-overhaul`.

**Grill verdict: SURVIVED**
