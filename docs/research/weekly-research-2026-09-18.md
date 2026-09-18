# Weekly Research — 2026-09-18

Mode: WEEKLY (propose only — no implementation). Read-only on product code.
Branch: `feat/premium-ui-overhaul`. At entry HEAD was `962f4413`, upstream **even** (`git rev-list --left-right --count origin/feat/premium-ui-overhaul...HEAD` returned `0 0`, so the 09-17 standup's push landed), **81 behind / 81 ahead** of `origin/main` (`51f94081`, 2026-08-29). No merge or rebase in progress (`.git/MERGE_HEAD`, `.git/rebase-merge`, `.git/rebase-apply` all absent). Recovery stashes `stash@{0}` (tc254) and `stash@{1}` (tc253) preserved untouched. 93 worktrees registered. Tracked drift 130 files, +9272 −5343.
Contract: `project-loops` weekly. Ground truth established via `continuous-improvement:reconcile` + `safety-guard` before any write.

## The organizing fact of this week

`origin/main` has not moved in 20 days: `git rev-list --count 51f94081..origin/main` returns **0**, the second consecutive weekly to measure zero. Last week's Lesson 1 said that when the ref you verify against has not moved, re-verification is a no-op and the budget should go where the state actually changed. That lesson is applied here rather than restated: no claim carried from 2026-09-11 that was read from `origin/main` was re-read this run, because it cannot have changed.

The budget went to two places instead — production, and **code on `origin/main` that no prior weekly had read**. The second is the important distinction: reading a file for the first time is not re-verification, and it produced the strongest finding of this run.

> The EMA200 that TradeClaw publishes on every signal is the **current price** whenever the candle window is shorter than 200 bars. The live signal being served right now is exactly that case: `ema200: 337.07999` and `entry: 337.07999`, byte-identical, because one is assigned from the other.

## Method

- Internal friction/drift (`/continuous-improvement`, `reconcile`): every repo claim read from `origin/main` via `git show origin/main:<path>` / `git grep origin/main`, never from this 81-behind working tree. One exception is declared inline (`calcEMA`, read from the working tree first, then re-read on `origin/main` and confirmed byte-identical).
- Live production measurement: read-only `GET` on three public endpoints, fetched 2026-09-18 — `/api/track-record/alpha`, `/api/calibration`, `/api/signals/public`. No writes, no authenticated calls, no DB access.
- External, cited: the `deep-research` and `market-research` skills route through the firecrawl/exa MCP servers, which are **again not connected** in this headless session (verified via `ToolSearch`, **third** consecutive week). Substituted `WebSearch` and say so rather than claim a capability that did not run.

Provenance labelling: **[PRODUCTION]** = measured from tradeclaw.win on 2026-09-18; **[LOCAL]** = repo artifact that self-labels as local/dev sample; **[CODE]** = source read from `origin/main`; **[DERIVED]** = arithmetic performed here on published inputs, inputs shown so it can be rechecked. No metric in this document is synthesized.

---

## Proposal 1 — The published EMA200 is the entry price, not an EMA, whenever the candle window is under 200 bars

**Problem.** TradeClaw publishes an `ema200` field on every signal, renders it on the dashboard, prints it in the explain surface, and documents it as a number. When the 200-period EMA is not computable, the field is silently filled with the current price. Nothing marks it. A reader cross-referencing it against a chart would find it does not match, and would have no way to learn why.

[PRODUCTION] `GET /api/signals/public`, 2026-09-18. `count` is **1**. The payload, verbatim on the fields that matter:

```
"id": "SIG-AAPLUSD-M15-BUY-MU5PAOO0", "symbol": "AAPLUSD", "direction": "BUY",
"confidence": 51, "preBoostConfidence": 71, "mtfAgreement": 0, "confluenceBonus": -20,
"entry": 337.07999, "stopLoss": 335.2264,
"takeProfit1": 340.78717, "takeProfit2": 342.64076, "takeProfit3": 345.42115,
"status": "active", "source": "real", "dataQuality": "real", "signalSource": "algo",
"strategyName": "Scalper", "timeframe": "M15", "timestamp": "2026-09-17T15:45:00.000Z",
"ema": { "trend": "up", "ema20": 335.72752, "ema50": 334.34452, "ema200": 337.07999 }
```

`ema200` (337.07999) and `entry` (337.07999) are identical to all five decimal places, while `ema20` and `ema50` are distinct, ordinary values. That is not a coincidence — it is an assignment, and the chain is four lines long.

[CODE] **Step 1 — the EMA series is all-NaN below its period.** `apps/web/app/lib/ta-engine.ts:78-80`:

```ts
function calcEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;
```

[CODE] **Step 2 — an all-NaN series becomes a scalar `NaN`.** `ta-engine.ts:262-270`, `calculateEMAs` filters out NaN and takes the last survivor, falling back to `NaN` when none survive:

```ts
const last200 = ema200.filter((v) => !isNaN(v));
...
ema200: last200.length > 0 ? last200[last200.length - 1] : NaN,
```

[CODE] **Step 3 — the publisher substitutes the price.** `apps/web/app/lib/signal-generator.ts:603-605`. `NaN` is falsy, so `||` takes the right branch:

```ts
ema20: +(emaCurrent.ema20 || currentPrice).toFixed(5),
ema50: +(emaCurrent.ema50 || currentPrice).toFixed(5),
ema200: +(emaCurrent.ema200 || currentPrice).toFixed(5),
```

[CODE] **Step 4 — `entry` is that same current price.** `signal-generator.ts:920`: `const entry = primary.indicators.closes[primary.indicators.closes.length - 1];`, and `currentPrice` is defined identically at `:666` as the last close. So the published `ema200` and the published `entry` are the same number by construction, which is precisely what the live payload shows.

[CODE + DERIVED] **The window is pinned to 100–199 bars.** `signal-generator.ts:660` refuses to emit a signal at all below 100 candles (`if (indicators.closes.length < 100) return [];`, commented "require at least 100 candles for reliable signals"). The live payload has real, distinct `ema20` and `ema50`, so the window cleared 50 bars; it has a collapsed `ema200`, so it did not clear 200. The generator's own minimum bar count is therefore **half the period of the longest indicator it publishes**, and every signal generated in that band publishes a fabricated EMA200.

**The honest counter-reading, stated because the brand requires the inconvenient direction too.** *The scoring engine is not fooled.* The decision path reads the raw value and guards it correctly — `signal-generator.ts:422-445` destructures `ema.current` and gates both trend bonuses behind `!isNaN(ema200)`, so when EMA200 is unavailable the "Strong uptrend (EMA20 > EMA50 > EMA200)" component is simply not awarded. The published `trend` label (`:597-601`) consults only `ema20` and `ema50`. **No trade decision is corrupted by this.** The defect is confined to display and to downstream consumers of the display — which is a smaller bug than it first looks, and a worse one for a product whose promise is that its numbers can be checked.

[CODE] **Four consumers render the fabricated value as measured.** `apps/web/app/dashboard/DashboardClient.tsx:320` renders a labelled "EMA200" row; `apps/web/app/lib/signal-explainer.ts:281` prints it into an `EMA 20 / 50 / 200` markdown table in the explain output; `apps/web/app/docs/signals/page.tsx:306` documents the field as `ema200: number` with no nullability; and `packages/agent/src/gateway/webhook-server.ts:78` validates inbound signals with `typeof indicators.ema?.ema200 === 'number'` — a check the substituted price passes.

[CODE] **The same line exists in four near-duplicate copies of the generator**, which is why a single-file fix will not hold: `signal-generator.ts:605`, `signal-generator-debug.ts:566`, `current.ts:570`, and `revert_25_58_scalp35_65.ts:566` all contain `ema200: +(emaCurrent.ema200 || currentPrice).toFixed(5)`.

**Proposed change (future PR, propose-only here).** Cheapest first. (1) Stop coercing: publish `null` for an indicator that did not compute, and type the field `number | null`. `||` on a numeric field is the bug class here — `0` is also falsy, so a genuine zero would be replaced too. (2) Make the surfaces render the absence: a dash and a "needs 200 bars, have N" note, reusing the `EMPTY` convention the alpha page already applies to empty evidence ("Empty evidence is shown as {EMPTY}, never +0%" — `track-record/alpha/page.tsx`). (3) Reconcile the 100-bar guard with the 200-period indicator: either fetch 200+ bars before publishing an EMA200, or stop publishing the field on windows that cannot support it. (4) Deduplicate the four generator copies, or at minimum add one test asserting no published indicator equals `entry` by fallback.

**Evidence.** [PRODUCTION] the `/api/signals/public` payload above, fetched read-only 2026-09-18. [CODE] `apps/web/app/lib/ta-engine.ts:78-80,262-270`; `apps/web/app/lib/signal-generator.ts:422-445,597-605,660,920`; `apps/web/app/dashboard/DashboardClient.tsx:320`; `apps/web/app/lib/signal-explainer.ts:281`; `apps/web/app/docs/signals/page.tsx:306`; `packages/agent/src/gateway/webhook-server.ts:78`. External: a 200-period EMA needs substantially more than 200 bars before its values are trustworthy, since an N-period EMA normally draws on more than N bars with those bars carrying roughly 86% of the weight ([MovAvgExponential, thinkorswim reference](https://toslc.thinkorswim.com/center/reference/Tech-Indicators/studies-library/M-N/MovAvgExponential), [EMA guide, TradingSim](https://www.tradingsim.com/blog/exponential-moving-average-guide)) — so 100–199 bars is not a marginal shortfall, it is under half the floor. Data-quality practice names this exact failure: a system that assumes perfect data "will quietly produce perfectly wrong results", and the output of a quality check "should not be silent correction, but explicit questions" ([data integrity in financial systems](https://medium.com/@imsajjadali/data-integrity-is-the-hardest-part-of-financial-systems-7d9f1a8dc207), [data quality best practices](https://montecarlo.ai/blog-data-quality-best-practices)). Market: buyer guidance rates providers on whether they "provide tools for members to cross-reference signals against live charts" ([best crypto signals providers 2026](https://mycryptoparadise.com/best-crypto-signals-providers-2026-honest-comparison/)) — the one check this field defeats.

**Effort/impact.** Effort: low for (1) and (2) — one type change and a render branch per surface; medium for (3) and (4). Impact: high. It is a published number that is not the thing it is labelled as, on the surface a skeptical user would check first.

**Brand-alignment:** "Measurable proof over marketing spin" requires that a published measurement is a measurement. An indicator field silently backfilled with the entry price is a placeholder presented as an observation, and it fails the project's own constraint to distinguish real values from stand-ins.

**Grill verdict:** SURVIVED — the strongest objection is that this is cosmetic, because the scoring engine guards `!isNaN(ema200)` and no trade decision changes. That is true, is stated above in the proposal's own body rather than buried, and it is why this is written as a disclosure defect and not a trading defect. It does not rescue the finding, for three reasons. The value is published on `/dashboard`, in the explain output, and through an agent webhook that type-checks it as a valid number, so three consumers consume a fabrication. A user who cross-references it against a chart finds a mismatch and learns nothing about why — the failure is silent in exactly the way that destroys trust rather than merely inconveniencing. And the `||` coercion is unsound independent of the NaN case: a legitimate `0` is also falsy. A second objection — that this is inferred from one live signal — fails because the mechanism is read from source as a four-line chain and the live payload is the predicted signature of that chain, not the basis for it.

## Proposal 2 — The only alarm that fires when the D1 alpha writer dies has no test, and the corpus already describes it incorrectly

**Problem.** The D1 alpha lane publishes one green card that means "the ledger is current." Everything about whether that card can be trusted rests on an arithmetic branch that no test exercises — and the strongest evidence that the branch needs a test is that the project's own committed record gets its behaviour wrong.

[CODE] **The branch.** `apps/web/lib/d1-alpha-ledger.ts`, inside `readD1AlphaReport`, after the chain walk:

```ts
const expectedLatestClosedBar = Math.floor(now / D1_ALPHA_DAY_MS) * D1_ALPHA_DAY_MS - D1_ALPHA_DAY_MS;
if (latest.payload.barTimestamp < expectedLatestClosedBar) {
  unresolvedCadenceGaps += Math.floor(
    (expectedLatestClosedBar - latest.payload.barTimestamp) / D1_ALPHA_DAY_MS,
  );
}
```

That result flows straight to the gate: `:604` `const cadencePassed = unresolvedCadenceGaps === 0 && integrityPassed;` → `d1-alpha-protocol.ts:452` `cadence: options.cadencePassed` → `track-record/alpha/page.tsx:229-234`, which renders a `GateCard` labelled "Unresolved cadence gaps" with `passed={report.gate.observationChecks.cadence}`. If the daily writer stops, this is the **only** thing on the public surface that turns red.

[CODE] **There is no test for it.** `readD1AlphaReport` is tested in exactly one file, `apps/web/lib/__tests__/d1-alpha-ledger.test.ts`, in exactly two cases (`:109`, `:134`). Both pin `now: Date.UTC(2026, 7, 10, 12)` — one day after the genesis bar — so both sit inside the *fresh* branch, and one of them asserts `unresolvedCadenceGaps: 0`. The `{ now }` seam that would make a staleness test trivial **already exists and is already used twice**; neither use advances the clock. Searching all d1-alpha suites for the stale path returns nothing.

[CODE] **The adjacent case is tested, which is what makes the gap specific rather than a general shortfall.** The *stored mid-chain* gap — two ledger rows more than one day apart — is caught at `d1-alpha-ledger.ts:575` (`throw new Error('stored snapshot cadence is not consecutive')`) and is covered by `d1-alpha-protocol.test.ts:126` ("refuses cadence gaps and prospective/engine state divergence"). The other three cadence references in that suite (`:160`, `:181`, `:189`) pass `cadencePassed: true` *into* the gate as a fixture. So: stored gaps tested, tail staleness untested, and the untested one is the one that detects a dead cron.

**Why a dead cron is not hypothetical in this repo.** `/api/cron/*` dispatchers were returning 403 to the runners and the fix parked the dead schedules (PRs #154, #155); the weekly-report path was found publishing seeded-PRNG statistics. This project has shipped silent scheduler failure before.

[DERIVED] **Correction to the committed standup corpus — the alarm is prompt, not two days late.** The 2026-09-17 standup records that "the tail arithmetic absorbs EXACTLY ONE missed commit day, worked twice against real timestamps, so cadence is a two-day-late alarm and must never be read as the pipeline ran today." The first half is a misreading, and the working is short enough to check by hand. From today's payload, `latestBarTimestamp` is `1789603200000` = 20713 × 86 400 000 = **2026-09-17T00:00Z**, and `latestCommittedAt` is `2026-09-18T00:02:07.138Z` — so the writer commits the *previous* closed bar, bar = commit day − 1. Now trace a miss. The writer's 09-19 run would commit bar 09-18; if it fails, the latest bar stays 09-17. A reader at any time on 09-19 computes `expectedLatestClosedBar` = floor(09-19/day)·day − day = **09-18**, and 09-17 < 09-18, so the gap increments to 1 and `cadence` goes **false on the same day the run was missed**. The one-day tolerance in the formula is not an absorbed miss — it is exactly the normal publication lag between a closed bar and its commit. The correct statement is that detection latency is bounded by the next UTC midnight, up to 24 hours, not that the alarm is two days late. This correction is the argument for the proposal, not a digression from it: an untested branch accumulated an incorrect description in the committed record and nothing caught it, because there is no test to read.

[CODE] **A second, separate defect in the same counter, found while checking the above.** When the chain breaks at row *k*, the walk `break`s and `latest` becomes row *k−1* — an old bar — so the tail branch then adds a large gap count for what is actually an integrity failure. `unresolvedCadenceGaps` therefore conflates "commits are missing" with "the chain is corrupt", and the page renders that conflated number as a bare count under the label "Unresolved cadence gaps". Today it reads 0 and the question is moot; on the day it does not, the number will misdescribe the fault.

**Proposed change (future PR).** (1) One test, owner-side, using the seam that already exists: seed a valid single-row ledger, call `readD1AlphaReport({ now: <genesis + N days> })`, assert `unresolvedCadenceGaps === N - 1`, `gate.observationChecks.cadence === false`, and `integrity.status === 'pass'` — the last assertion is what distinguishes a stalled writer from a corrupt chain and is the case no current test produces. (2) A second test pinning the boundary: at `now = genesis + 1 day` the count must still be 0, so the normal publication lag can never be regressed into a false alarm. (3) Separate the two causes in the report — keep `unresolvedCadenceGaps` for real gaps and surface staleness as its own field with the last-committed timestamp beside it. (4) Display `latestCommittedAt` next to the cadence card, so a reader sees the freshness fact directly rather than inferring it from a boolean.

**Evidence.** [CODE] `apps/web/lib/d1-alpha-ledger.ts` (tail-staleness block; `:575` stored-gap throw; `:604` `cadencePassed`); `apps/web/lib/d1-alpha-protocol.ts:448-455`; `apps/web/app/track-record/alpha/page.tsx:229-234`; `apps/web/lib/__tests__/d1-alpha-ledger.test.ts:109,134`; `apps/web/lib/__tests__/d1-alpha-protocol.test.ts:126,160,181,189`. [PRODUCTION] `latestBarTimestamp` 1789603200000 and `latestCommittedAt` 2026-09-18T00:02:07.138Z, decoded above. External: the governing rule is stated plainly in the monitoring literature — an untested dead man's switch "is worse than none at all because it gives false confidence", and such switches should be tested on a schedule ([a dead-man's switch that pages once and goes quiet](https://dev.to/merlonix/a-dead-mans-switch-that-pages-once-and-goes-quiet-is-worse-than-none-ours-went-silent-for-43-days-1f0n)); the pattern itself is the standard remedy for scheduled work that must not die silently ([cron job dead man's switch monitoring](https://johal.in/cron-job-dead-man-switch-monitoring-guide), [heartbeat and dead man's switch alerts](https://oneuptime.com/blog/post/2026-02-06-heartbeat-dead-man-switch-opentelemetry-pipeline/view), [data freshness and SLA monitoring](https://pipecode.ai/blogs/data-freshness-sla-monitoring-budgets)).

**Effort/impact.** Effort: **low** — (1) and (2) are two unit tests against an existing injectable clock, no production change at all; medium for (3) and (4). Impact: high relative to cost. This is the cheapest item in this document and it protects the integrity claim the whole alpha lane is built on.

**Brand-alignment:** "Every trade verified" depends on the verification pipeline actually running, and the public page asserts that it is via a single green card. A project that publishes hash chains and frozen rule fingerprints to prove its record cannot be tampered with should not leave the one check that detects a *stopped* record untested — an undetected stall produces a record that is silently frozen rather than verified.

## Proposal 3 — Five observation booleans published, four performance verdicts withheld, and the page renders zero of the four

**Problem.** Carried from 2026-09-11 and sharpened by a week of new data and one new structural fact. Last week's framing was "the payload publishes four nulls." The stronger and newly-verified version is that the same object publishes **five** observation booleans in full, and the public page renders **four** of those as pass/fail cards and **none** of the performance checks — while its own body copy names all four.

[PRODUCTION] `GET /api/track-record/alpha`, 2026-09-18 vs 2026-09-11:

| Field | 2026-09-11 | 2026-09-18 | Δ |
|---|---|---|---|
| calendarDays | 32 | 39 | +7 |
| snapshots / verifiedRows | 33 | 40 | +7 |
| closedTrades | 0 | **0** | 0 |
| strategyNetReturn | +5.434352% | +5.307993% | −0.126 pts |
| benchmarkNetReturn | +21.136291% | +20.999187% | −0.137 pts |
| activeReturn | −15.701939% | −15.691194% | +0.011 pts |
| strategyMaxDrawdown | 4.474217% | **5.978915%** | +1.505 pts |
| benchmarkMaxDrawdown | 4.438693% | **5.948821%** | +1.510 pts |
| strategyCalmar | 18.521437 | **10.413485** | −8.108 |
| benchmarkCalmar | 178.191481 | **83.265496** | −94.926 |
| unresolvedCadenceGaps | 0 | 0 | 0 |

`label` `"collecting evidence"`, `promotion` `"not-promoted"`, `ruleFrozen` true, `integrity.status` `"pass"`, `latestCommittedAt` `2026-09-18T00:02:07.138Z` (the writer ran today), positions `BTCUSD: LONG` / `ETHUSD: LONG`. `ruleSha256` `a9c222a3…` and `artifactSha256` `1a6b28e4…` are unchanged from 09-11 and 09-06 and still match `D1_ALPHA_RULE_SHA256` / `D1_ALPHA_ARTIFACT_SHA256` — **the frozen protocol is intact across three weekly readings**, which remains the thing that would matter most if it were not.

[DERIVED] **Integrity checks on the payload, so nothing below rests on trust.** `activeReturn` reproduces exactly: 5.307992810599993 − 20.999187234599992 = **−15.691194424** ✓, matching the published value to the last digit. `calendarDays` reproduces from the bar timestamps: 1789603200000 − 1786233600000 = 3 369 600 000 ms = **39 days** ✓, and `snapshots` 40 = calendarDays + 1 ✓. The Calmar formula reproduces on **both** legs at the published `calendarDays`: (1.05307993)^(365/39) − 1 = 0.62261, ÷ 0.059789146 = **10.4138** against a published 10.413485; (1.20999187)^(365/39) − 1 = 4.95338, ÷ 0.059488205 = **83.266** against a published 83.265496. The divisor is `calendarDays` = 39, not `snapshots` = 40.

[DERIVED] **The gate verdicts, applied to the published numbers.** `positiveStrategyReturn` **true** (+5.31%); `positiveActiveReturn` **false** (−15.69%); `drawdownNoWorse` **false** — 5.978915% > 5.948821%, a **3.009 bp** shortfall; `calmarNoWorse` **false** — 10.413 against 83.265, a factor of **7.996**. Three of four fail, unchanged in count from last week.

[DERIVED] **Last week's finding is upheld and narrowed at the same time.** The drawdown check remains failed for a second consecutive week, so the 09-11 flip was not a one-read artifact. But the gap **narrowed** from 3.552 bp to 3.009 bp, and it narrowed for an unflattering reason: a genuine drawdown event moved *both* legs by roughly 1.5 points in seven days, and the benchmark's grew marginally more (+1.510 vs +1.505). The strategy did not improve. Reporting the narrowing without the cause would be the cherry-pick.

[DERIVED] **The Calmar collapse is almost entirely an artifact, and this is the decomposition that shows it.** Calmar fell 43.8% (18.521 → 10.413) in a week during which strategy net return fell **0.126 points**. Since Calmar = CAGR ÷ maxDD, back out the numerator: CAGR went 0.8287 → 0.6226 (−24.9%) while maxDD went 4.474% → 5.979% (+33.6%). Splitting the numerator further, holding net return at last week's 5.434352% and moving only the annualisation window from 365/32 to 365/39 gives CAGR 0.6409 — so **the shortening annualisation exponent accounts for the overwhelming majority of the numerator move**, and the actual return change accounts for about 2.9% of it. At 39 days of a 365-day protocol, Calmar is dominated by the calendar, exactly as the 2026-09-15 standup argued from three consecutive readings on an unmoved denominator.

**This is the strongest argument *for* the gate's restraint, and it belongs in the proposal, not in a footnote.** A `calmarNoWorse: false` published today as a binding verdict would be a near-meaningless number presented as a judgement. The frozen rule's refusal to evaluate at 39 days is defensible and nothing here proposes changing it.

[CODE] **What is not defensible is the asymmetry, and it is worse on the page than in the API.** `evaluateD1AlphaGate` (`d1-alpha-protocol.ts:448-465`) computes and returns all five `observationChecks` unconditionally — `{ calendarDays: false, snapshots: false, closedTrades: false, cadence: true, integrity: true }` ships in today's payload — then returns the four `performanceChecks` as hard-coded `null` on the early-return path. On the public page the imbalance widens: `track-record/alpha/page.tsx:210-236` renders four `GateCard`s for the observation checks, and `git grep` for `performanceChecks`, `drawdownNoWorse`, `calmarNoWorse` and `positiveStrategyReturn` across that page returns **nothing**. The page's own copy states that "the later performance gate requires positive strategy return, positive active return, no worse drawdown, and Calmar at least equal to the benchmark" — it names all four in prose and shows the value of none.

[DERIVED] **Closure pace, restated with the week's arithmetic.** Day **39** of 365 with **0** of 12 closed trades. Even pace is one closure per 30.42 days, so the lane is now 8.6 days past its first due closure; the remaining requirement has tightened to 12 in 326 days = one per **27.17 days**, 10.7% tighter than at inception. This is still not evidence the strategy is broken — `D1_ALPHA_MAX_DIRECTION_CHANGES = 30` shows the protocol expects low turnover, both sleeves are legitimately long, and the standing memory records that the underlying rule historically yields roughly 8.4 closes/year against a minimum of 12, which is the deeper problem. It is evidence that nothing measures or publishes the pace.

**Proposed change (future PR).** Unchanged in substance from 09-11, re-ordered by what this week's evidence supports. (1) Render the four performance checks on the page as an explicitly **non-binding preview**, each with the inputs beside it and each marked not-yet-gating — the payload already contains every input, and the page already has a `GateCard` component and an `EMPTY` convention to express "not judged yet". (2) Publish the Calmar decomposition alongside it, or suppress Calmar entirely below some day count, because a 43.8% move driven by the annualisation window is actively misleading next to a 0.126-point return change. (3) Add a terminal `insufficient-activity` status when `calendarDays >= D1_ALPHA_MIN_CALENDAR_DAYS` and `closedTrades < D1_ALPHA_MIN_CLOSED_TRADES`, and surface the pace as "0 of 12 closed trades, day 39 of 365; even pace requires 1 per 30.4 days." (4) Then the pre-registered futility boundary carried from 2026-08-28 P4, frozen and published under the same rule-hash discipline before it is ever evaluated.

**Evidence.** [PRODUCTION] the two alpha payloads above, both fetched read-only; the 09-11 figures are quoted from the committed `weekly-research-2026-09-11.md`, not re-fetched. [CODE] `apps/web/lib/d1-alpha-protocol.ts:448-465` (observation checks always returned, performance checks hard-nulled), `:471-476` (the four checks), `:16` (12-trade minimum), `:19` (30 direction changes); `apps/web/app/track-record/alpha/page.tsx:210-236` and the negative grep result above. External: interim reporting of an unblinded quantity is exactly what pre-registration governs, and futility boundaries exist so a trial can be abandoned without the multiple-comparisons cost of ad-hoc peeking ([futility in clinical trials, JAMAevidence](https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930), [trials stopped early for futility, BMC Med Res Methodol](https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1)).

**Effort/impact.** Effort: low for (1) — the values are computed and the components exist; low for (2) as a suppression, medium as a published decomposition; low for (3); medium for (4). Impact: high, and the impact is now specifically about the page rather than the API: a reader of `/track-record/alpha` sees four observation cards and a sentence promising four performance checks that are nowhere on the page.

**Brand-alignment:** "Disciplined risk management (auto-demote strategies that lose edge)" requires that a lane can end and that an adverse result is visible when it happens. Publishing five observation booleans and withholding four performance verdicts computed from already-published inputs is selective disclosure inside the one surface built to prove the project does not do that.

**Grill verdict:** SURVIVED, and it survives a harder grilling than last week because this run supplied the best counter-argument itself. The objection is that at 39 days the performance numbers are dominated by annualisation artifacts, so publishing verdicts derived from them would mislead — and the Calmar decomposition above proves that objection is *correct on the merits*. It does not kill the proposal, because the proposal asks for the four verdicts to be shown as explicitly non-binding next to their inputs, and because the underlying numbers are **already public on the same endpoint and the same page**. The choice is not between disclosure and restraint; it is between a reader doing this arithmetic by hand and the page doing it for them. Two weeklies in a row have now done it by hand and both were right. A second objection — that `drawdownNoWorse` failing twice is just noise — is answered by reporting the narrowing gap and its unflattering cause rather than the convenient direction.

## Proposal 4 — Every signal on the public endpoint today is one the record will never score

**Problem.** Carried from 2026-09-11 P1. The mechanism is unchanged and is not re-derived here, because `origin/main` has not moved and last week established it from source: signals are *shown* from confidence 50 (`tracked-signals.ts:210-215`, a `Math.min` over the dead tier map `STRATEGY_MIN_CONFIDENCE`) and *recorded* only from 70 (`tracked-signals.ts:69-73` and `api/cron/signals/route.ts:159,161`, the only two writers). What changed is the measurement.

[PRODUCTION] Last week, one of five signals on `/api/signals/public` sat below the recording floor. Today `count` is **1**, and it is below the floor:

| Read | signals returned | below record floor (< 70) | share |
|---|---|---|---|
| 2026-09-11 | 5 | 1 | 20% |
| 2026-09-18 | 1 | **1** | **100%** |

`SIG-AAPLUSD-M15-BUY-MU5PAOO0`, confidence **51**, `source: "real"`, `dataQuality: "real"`, `signalSource: "algo"`, with entry 337.07999, stop 335.2264 and three targets. It carries a complete executable trade plan and its outcome cannot enter `/api/calibration` or `/track-record`.

[DERIVED] **The demotion mechanism reproduces exactly, for a second week and on a different symbol.** `preBoostConfidence` 71 + `confluenceBonus` −20 = published 51 ✓, with `mtfAgreement: 0`. The signal scored **above** the recording floor and was pushed under it by the multi-timeframe conflict penalty, the same `-20` step documented last week at `signal-generator.ts:903-915`. Last week the identity held across all five rows; this week it holds on the only row. Stated as an observed identity across six rows over two weeks, not as a traced code path.

**Sample-size honesty, stated up front.** A single-row payload is not evidence that the *population* of served signals shifted — 1 of 1 and 1 of 5 are entirely consistent with the same underlying rate, and no claim of a trend is made here. What the single row does establish is that the **only** thing a consumer of `/api/signals/public` can see right now is unrecordable, which is a fact about today's product surface regardless of the rate.

**Proposed change (future PR).** Unchanged from 09-11 and not re-argued at length: (1) collapse the publish floor and the record floor into one named constant and delete the `Math.min` over dead tier data; (2) shadow-record every served signal, flagged `below_publication_floor` and excluded from headline figures by default — the mirror of the pattern the codebase already uses for gate-blocked rows at `tracked-signals.ts:160-163`; (3) until (2) lands, label a sub-70 signal at the point of display as not counted in the public record; (4) then test whether the `-20` conflict penalty removes better-than-average signals from the record. **(5) is new and belongs to Proposal 1:** the same payload also carries a fabricated `ema200`, so the sub-70 disclosure label and the indicator-nullability fix touch the same response shape and should ship together.

**Evidence.** [PRODUCTION] the `/api/signals/public` payload above and the 09-11 payload quoted from the committed weekly. [CODE] `tracked-signals.ts:69-73,160-163,210-215`; `signal-thresholds.ts:18-24`; `api/cron/signals/route.ts:159,161` — all read from `origin/main` last week and unchanged by construction (`rev-list --count` = 0). External: the anti-cherry-picking rule in performance-presentation standards is that a firm must include *all* actual portfolios in at least one composite, precisely to prevent selective inclusion ([GIPS standards](https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/the-gips-standards/)); buyer guidance names the same thing as the primary credibility test — "ask for the full record, or assume the worst" ([best crypto signals providers 2026](https://mycryptoparadise.com/best-crypto-signals-providers-2026-honest-comparison/)), alongside comprehensive trade logs covering every signal issued ([best trading signal providers 2026](https://www.daytrading.com/trading-signals)).

**Effort/impact.** Effort: low for (1) and (3); medium for (2). Impact: high — it touches the literal brand promise. Ranked fourth only because it is fully argued in last week's document and this week adds a measurement rather than an argument.

**Brand-alignment:** "Every trade verified" and "radical transparency (wins AND losses, no cherry-picking)" are contradicted when the sole signal on the public endpoint is one whose outcome is structurally excluded from the verified record.

**Grill verdict:** SURVIVED, with its weakest point named rather than hidden — a one-row sample cannot establish a rate, and this document says so in the proposal body instead of letting "100%" stand unqualified. The finding does not depend on the rate: the floors differ by twenty points in code, both writers filter at 70, and that is true whether the payload holds one row or five.

---

## Carried but deliberately not re-proposed

**The edge-decay monitor is now 108 days stale** (2026-08-28 P3, 2026-09-06 P4, 2026-09-11 P4). `apps/web/data/strategy-decay-metrics.json` still has no `generated_at` key (grep returns only three `date_range` entries), its `date_range` still ends 2026-06-02, and nothing regenerates it. Unchanged by construction since `origin/main` has not moved. This would be the **fourth** consecutive weekly to carry it at full length, and re-litigating an unchanged proposal pads the document instead of informing it. Its technical case stands exactly as written on 2026-09-11; the only new content would be seven more days of staleness and the updated like-for-like production figure (36.69%, below).

**The provenance badge is still unmounted on `/track-record` and `/calibration`** (2026-08-28 P4, 2026-09-06 P4, demoted 2026-09-11). Unchanged, same reasoning, and it belongs in the same PR as Proposal 1's labelling work and Proposal 4's disclosure label.

**The confidence score still does not order outcomes out of sample** (2026-09-11 P2). Not re-proposed as a separate item, but re-measured because the measurement is cheap and the result is now a three-window streak. [PRODUCTION] `/api/calibration`, 2026-09-18 (`updatedAt` 2026-09-17T20:57:37.779Z, `isSimulated` false): `totalSignals` 6,293, `overallAccuracy` 0.36691562053074844, Brier 0.39854411250596056, ECE 0.4183354520896234; band 70–79 n=3,760 wins=1,431 (38.0585%), band 80–89 n=2,533 wins=878 (34.6625%), other three bands empty. [DERIVED] Integrity first: 3,760 + 2,533 = 6,293 ✓; 1,431 + 878 = 2,309 and 2,309/6,293 = 0.3669156 ✓ to seven places; ECE reproduces as (3,760 × 0.3644149 + 2,533 × 0.4983754)/6,293 = 2,632.583/6,293 = **0.4183355** ✓. Differencing against last week gives a clean 546-signal out-of-sample window: 70–79 gained 334 rows and 141 wins (**42.216%**), 80–89 gained 212 rows and 86 wins (**40.566%**), z = **0.381**, p ≈ **0.70**. Pooling all three windows since 2026-08-28 (earlier two quoted from committed artifacts): 70–79 at 318/837 = 37.993%, 80–89 at 208/554 = 37.545%, z = **0.169**, p ≈ **0.87**. The cumulative inversion remains significant and essentially unmoved at z = **2.741**, p ≈ **0.0061** (was z = 2.732 on 09-11), still carried by older data. Three consecutive out-of-sample windows now show no detectable ordering.

## Corrections

1. **To the 2026-09-17 standup — the cadence alarm is not "two days late."** It fires on the same day a scheduled commit is missed; the one-day tolerance in the formula is the normal bar-to-commit publication lag, not an absorbed miss. Full working in Proposal 2, using today's measured `latestBarTimestamp` and `latestCommittedAt`.
2. **To the standup corpus's genesis date.** Today's `firstBarTimestamp` is 1786233600000 = 20674 × 86 400 000 = **2026-08-09T00:00Z**, while the corpus (09-16, 09-17) records the genesis row as 2026-08-10. Both are probably right about different things — the corpus dates rows by commit and the payload by bar, and the payload itself shows bar = commit − 1. Flagged so the two dating conventions stop being used interchangeably; not asserted as an error in either.
3. **To this run's own first hypothesis.** The EMA200 fallback was initially traced to `calculateEMA` in `packages/signals/src/indicators.ts`, which returns a plain mean rather than NaN below its period and therefore could **not** trigger the `||` fallback. That refutation was correct and it killed the first version of Proposal 1. The actual producer is `calculateEMAs` in `apps/web/app/lib/ta-engine.ts`, which does emit `NaN`. Recorded because the wrong module very nearly buried a real finding.
4. **Branch position.** Last week recorded 81 behind / 74 ahead at commit time. This run entered at 81 behind / **81 ahead**: the behind-count is identical for the third consecutive weekly because `main` has not moved, and the ahead-count grew by seven daily standups.

## Findings that died under verification this run (recorded, not proposed)

- **"`calculateEMA` returns NaN below its period, so the fallback fires."** False for that function, and it was the first thing checked. `packages/signals/src/indicators.ts:10-15` returns `0` for an empty array and the **arithmetic mean** when `prices.length < period`. Had Proposal 1 been written against that module it would have been refuted by one file read. See Correction 3.
- **"The scoring engine is corrupted by the fabricated EMA200."** False, and this is the objection that would have made Proposal 1 far larger if it had held. `signal-generator.ts:422-445` gates both EMA200 trend components behind `!isNaN(ema200)` read from the **raw** `ema.current`, not from the published value, so the score correctly abstains. The finding is a disclosure defect, and saying so is the difference between a real finding and an overclaimed one.
- **"The published `trend: up` label depends on the fabricated EMA200."** False. `signal-generator.ts:597-601` computes `trend` from `currentPrice`, `ema20` and `ema50` only; `ema200` is not consulted.
- **"The cadence staleness branch is untested *and* the stored-gap case is untested too."** Half false, and the half that is false matters. `d1-alpha-protocol.test.ts:126` explicitly refuses stored cadence gaps. Reporting a blanket "cadence is untested" would have been both wrong and weaker than the true, narrower claim.
- **"Four commits may have landed on `main` addressing last week's proposals."** False by measurement: `git rev-list --count 51f94081..origin/main` returns 0. `main` is static at 20 days.

## Lessons and escalations

`loops/state/tradeclaw.STATE.md` has no `## Lessons` or `## Escalations` heading anywhere in its 427 lines — the file is machine run-records only, and the append is blocked at the harness sensitive-path layer (`loops/state/` is outside the granted write scope). Per the loop contract these are recorded in the committed artifact instead, unabridged.

**Lessons (durable)**

1. **"Do not re-verify an unmoved ref" is not "do not read code."** Last week's Lesson 1 was applied correctly this run — no `origin/main` claim was re-read — but the same static tree still yielded the run's strongest finding, because `ta-engine.ts` had never been read by any weekly. The rule is *don't re-read what you already read from a ref that hasn't moved*; it is not *the code is exhausted*. A static `main` still contains everything nobody has looked at yet.
2. **When a hypothesis is refuted, check whether you refuted the right module.** The EMA200 finding was killed by `packages/signals/src/indicators.ts` returning a mean instead of NaN — a correct refutation of the wrong file. The value actually came from `apps/web/app/lib/ta-engine.ts`. One more grep separated a dead finding from the best one in this document.
3. **A byte-identical pair of published numbers is a code fact, not a coincidence.** `ema200 === entry` to five decimals was the entire entry point. Two published fields that match exactly should always be traced to the assignment that makes them match.
4. **Write the counter-argument into the proposal when it is correct.** Proposal 3's Calmar decomposition is the strongest argument *against* publishing performance verdicts today, and it was produced by this run. Burying it would have made the proposal look stronger and be weaker; including it narrowed the ask from "publish the verdicts" to "publish them as non-binding with their inputs", which is the version that should actually ship.
5. **An untested branch attracts incorrect descriptions.** The 09-17 standup's "two-day-late alarm" went into the committed record and nothing contradicted it, because there is no test that states the branch's behaviour. The missing test is not only a correctness risk; it is why the corpus drifted.
6. **Report the sample size before the percentage.** "100% of served signals are unrecordable" is true and nearly worthless on n = 1. Stating n first, and stating what the single row does and does not establish, is the version that survives a grilling.
7. **Third consecutive week that a named research skill was unavailable via MCP.** `deep-research` and `market-research` route through firecrawl/exa; `ToolSearch` returns neither. The substitution is declared every time rather than glossed, but three weeks is a pattern worth an owner decision (Escalation 6).

**Escalations (owner decision required)**

1. **NEW AND HIGHEST — the published EMA200 is the entry price whenever the candle window is under 200 bars.** Verified as a four-line chain (`ta-engine.ts:78-80` → `:262-270` → `signal-generator.ts:603-605` → `:920`) and observed live: `ema200` and `entry` both 337.07999 on the only signal currently served. The generator's minimum is 100 bars; the indicator's period is 200. Trade decisions are unaffected — the scorer guards `!isNaN` — but `/dashboard`, the explain surface, the public docs and an agent webhook validator all treat the substituted value as measured. Owner call: publish `null` and render an explicit "not computable" state, or fetch 200+ bars before publishing the field?
2. **NEW — the only alarm for a stalled D1 alpha lane has no test.** `readD1AlphaReport`'s tail-staleness branch drives the single public cadence card; both existing tests pin `now` to one day after genesis and sit in the fresh branch. The `{ now }` seam already exists. Two unit tests, no production change. Owner call: authorize the two tests? (The loop does not write tests; this is owner-side by contract.)
3. **The D1 alpha gate's disclosure asymmetry, now measured on the page.** The payload publishes five observation booleans and four `null` performance checks; `/track-record/alpha` renders four observation cards and **zero** performance checks while its body copy names all four. Day 39 of 365, 0 of 12 closed trades, three of four performance checks would fail, `drawdownNoWorse` false for a second week (gap narrowed 3.552 → 3.009 bp, but only because a real drawdown event moved both legs ~1.5 pts). Owner call: render the four as a marked non-binding preview and add terminal `insufficient-activity`, both without touching the frozen rule?
4. **Every signal on the public endpoint today is below the recording floor.** `count: 1`, confidence 51, `dataQuality: "real"`, full trade plan, demoted from a pre-boost 71 by the `-20` conflict penalty. n = 1, so no rate claim is made. Owner call, unchanged from 09-11: shadow-record every served signal, or raise the display floor to the record floor?
5. **The edge-decay monitor has not run in 108 days.** Fourth weekly carrying it; deliberately demoted from proposal status this run rather than re-argued. Production like-for-like pooled win rate is 36.69%, measured today, against the artifact's 50.8% scanner baseline. Owner call: schedule regeneration and compute a like-for-like baseline?
6. **NEW — the weekly's two named research skills have been unavailable for three consecutive runs.** `deep-research` and `market-research` depend on firecrawl/exa MCP servers that are not connected in the headless loop session. The substitution works, but the loop contract names those skills specifically. Owner call: provision the MCP servers for the loop session, or amend the contract to name the fallback?
7. **Branch divergence is static-behind and growing-ahead.** `feat/premium-ui-overhaul` is 81 behind / 81 ahead of `origin/main`; the behind-count is unchanged for a third weekly. No PR opened by this run: weekly mode is propose-only, and any work arising from these proposals must branch from `origin/main`, not from this 81-behind tree.

## Sources

- EMA warmup / minimum bars: https://toslc.thinkorswim.com/center/reference/Tech-Indicators/studies-library/M-N/MovAvgExponential , https://www.tradingsim.com/blog/exponential-moving-average-guide
- Data integrity / silent fallback: https://medium.com/@imsajjadali/data-integrity-is-the-hardest-part-of-financial-systems-7d9f1a8dc207 , https://montecarlo.ai/blog-data-quality-best-practices
- Dead man's switch / staleness monitoring: https://dev.to/merlonix/a-dead-mans-switch-that-pages-once-and-goes-quiet-is-worse-than-none-ours-went-silent-for-43-days-1f0n , https://johal.in/cron-job-dead-man-switch-monitoring-guide , https://oneuptime.com/blog/post/2026-02-06-heartbeat-dead-man-switch-opentelemetry-pipeline/view , https://pipecode.ai/blogs/data-freshness-sla-monitoring-budgets
- Performance-presentation standards / anti-cherry-picking: https://analystprep.com/cfa-level-1-exam/ethical-and-professional-standards/the-gips-standards/
- Market / buyer transparency criteria: https://mycryptoparadise.com/best-crypto-signals-providers-2026-honest-comparison/ , https://www.daytrading.com/trading-signals
- Futility / interim analysis: https://jamaevidence.mhmedical.com/content.aspx?bookid=2742&sectionid=287653930 , https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-020-0899-1

## Status

4 proposals — P1 EMA200 published as the entry price (**new**, traced through four source lines and confirmed by the live payload's signature), P2 the untested stall alarm (**new**, and it corrects a wrong description of the same branch in the committed standup corpus), P3 the D1 gate's observation/performance disclosure asymmetry (carried, sharpened by the page-level negative grep and by a Calmar decomposition that argues partly against itself), P4 the publish/record floor mismatch (carried, advanced by measurement, sample size stated). 3 items deliberately demoted from proposal status rather than re-argued (decay monitor at 108 days, provenance badge, calibration ordering — the last re-measured anyway because it is cheap, giving a third consecutive out-of-sample window with no detectable ordering). 4 corrections, one of them to this run's own first hypothesis. 5 candidate findings killed under verification. 7 escalations, 3 of them new.

Previously killed seeds not re-proposed: the public calibration surface (shipped on `main`) and Pro conversion funnel hardening (`pricing/page.tsx` is a `redirect('/track-record')`; migration `053_drop_monetization.sql` removed subscriptions and tiers — there is no funnel to harden, and proposing one would contradict the shipped OSS pivot).

Propose-only: no product code edited, no test written by this loop, no migration run, no domain, claim, or secret changed, no production PR opened, no write to Stripe or the signals table, no push to `main`, no `git add -A`, no edit to `gate.ps1` or to the shared `project-loops` contract. Three read-only public GETs and three web searches were the only network calls. Single explicit path staged and committed to `feat/premium-ui-overhaul` via pathspec, so a concurrent writer's staged content cannot be bundled in.

**Grill verdict: SURVIVED**
