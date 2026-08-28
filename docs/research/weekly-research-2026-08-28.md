# Weekly Research — 2026-08-28

Mode: WEEKLY (propose only — no implementation). Read-only on product code.
Branch: `feat/premium-ui-overhaul` @ `aaf2875d`. vs `origin/main` (`6342eb8c`, 2026-08-23): **77 behind / 56 ahead**. No merge/rebase in progress. Recovery stashes `stash@{0}` (tc254) and `stash@{1}` (tc253) preserved untouched.
Contract: `project-loops` weekly. Ground truth established via `continuous-improvement:reconcile` + `safety-guard` before any write.

## Method

- Internal friction/drift (`/continuous-improvement`): every repo claim below was read from **`origin/main`** via `git show origin/main:<path>` / `git grep origin/main`, never from this 77-behind working tree.
- Live production measurement: read-only `GET` on two public endpoints, fetched 2026-08-28 — `https://tradeclaw.win/api/calibration` and `https://tradeclaw.win/api/track-record/alpha`, plus the rendered `/track-record/alpha` page. No writes, no authenticated calls, no DB access.
- External, cited (`/deep-research`): calibration metrics (ECE, Brier, reliability diagrams), group-sequential futility boundaries.
- Competitive (`/market-research`): 2026 AI-signal win-rate and confidence-disclosure landscape.

Provenance labelling used throughout: **[PRODUCTION]** = measured from tradeclaw.win today; **[LOCAL]** = repo artifact that self-labels as local/dev sample; **[CODE]** = source read from `origin/main`. No metric in this document is synthesized.

## Standing escalation (not a proposal)

This checkout is 77 commits behind `origin/main` and does not contain TC-254. Last week's weekly re-proposed a calibration surface that was already shipped on `main`, because it was verified against a stale tree. Every proposal below was therefore re-verified against `origin/main` and, where a runtime claim was involved, against the live endpoint. Two candidate findings died in that pass and are recorded under Corrections rather than promoted.

---

## Proposal 1 — Stop ranking on the rule score: in production it is inverted across the only two bands that exist

**Problem.** The product ranks, filters, and colour-codes signals on the assumption that a higher rule score is a better signal. Production data says the opposite over the populated range.

[PRODUCTION] `GET /api/calibration` (2026-08-28, `"isSimulated": false`, `"insufficientData": false`, `totalSignals` 4902):

| Band | n | wins | realized win rate |
|---|---|---|---|
| 70–79 | 2,923 | 1,113 | **38.08%** |
| 80–89 | 1,979 | 670 | **33.86%** |
| 50–59 / 60–69 / 90–99 | 0 | 0 | null |

Brier `0.4011684618523138`, ECE `0.4216421868625051`. Two checks on those numbers: 2,923 + 1,979 = 4,902, so **every** counted-resolved signal sits in 70–89 and the published reliability chart is two points, not five. And the reported ECE reproduces exactly from those two rows — (2923 × |0.745 − 0.3808| + 1979 × |0.845 − 0.3386|) / 4902 = 0.4216 — so the figure is arithmetically consistent, not a rendering artifact. Pooled realized rate is 1,783/4,902 = 36.37%; a constant forecast at that base rate scores Brier 0.2314, so the score-as-probability reading is materially worse than a flat guess.

[CODE] The UI encodes higher-is-better anyway:
- `apps/web/app/api/screener/route.ts:121` — `.sort((a, b) => b.confidence - a.confidence)`, highest score first.
- `apps/web/app/screener/ScreenerClient.tsx:406,420` — defaults `minConfidence: 70` and `sortKey: 'confidence'`.
- `apps/web/app/components/signal-outcome-card.tsx:201-208` — ≥80 renders emerald, 65–79 zinc, <65 red, via `isHighRuleScore` (`apps/web/lib/signal-thresholds.ts:6`, threshold 80).

Net: the default screener view filters to ≥70, sorts descending, and paints the top of that list green — which is the 80–89 band, the band that measurably wins *less* than the one below it.

**Proposed change (future PR, propose-only here).** Three separable pieces, smallest first: (1) publish the inversion as a dated research note with the two-band table, the same way losses are published elsewhere; (2) attach the measured realized rate for the band to the score wherever it is rendered, so `85/100` reads alongside `this band has realized 33.9% (n=1,979)`; (3) drop score-descending as the default screener sort until the score earns monotonicity, replacing it with a neutral default (recency or symbol). Do not silently re-weight the generator — that would hide the finding rather than publish it.

**Evidence.** [PRODUCTION] `/api/calibration` figures above. [CODE] `screener/route.ts:121`, `ScreenerClient.tsx:406,420`, `signal-outcome-card.tsx:201-208`, `signal-thresholds.ts:6`. External: ECE is the standard miscalibration statistic and points below the diagonal indicate over-confidence — here both populated bands sit far below it ([ECE overview](https://www.emergentmind.com/topics/expected-calibration-error-ece), [classifier calibration metrics review, arXiv 2504.18278](https://arxiv.org/pdf/2504.18278)). Market: verified 2026 platforms publish realistic 55–65% accuracy and per-pattern historical win rates in the 65–87% range ([AI signal buyer's guide 2026](https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide), [crypto signal services 2026](https://aotrading.io/blogs/best-crypto-signal-services-2026)) — a visitor arriving from that market reads a green 85 as quality, whatever the API disclaimer says.

**Effort/impact.** Effort: low for (1) and (3), medium for (2) — the calibration report already exists and is already public, so this is plumbing plus copy, no model change. Impact: high — it converts the single largest measured claimed-vs-realized gap in the product from an API detail into a published finding, and stops the default view from promoting the weaker band.

**Brand-alignment:** Radical transparency means publishing the result that embarrasses the feature; "measurable proof over marketing spin" is empty if the UI keeps ranking on a score the measurement has falsified.

**Grill verdict:** SURVIVED — the strongest objection is "the API already says `mechanical rule/confluence score; not a probability or edge estimate` (`apps/web/app/api/proof/route.ts:154`) and the card says `85/100`, not `85%`." True, and that disclaimer is honest about *units*. It is silent about *order*: nothing tells the user that higher is not better, and the sort, the ≥70 filter default, and the emerald threshold all assert that it is. The disclaimer does not survive contact with `sort((a,b) => b.confidence - a.confidence)`.

## Proposal 2 — The edge-decay monitor stopped monitoring 86 days ago, and its trigger cannot fire

**Problem.** Two independent defects in the same mechanism.

*Staleness.* [LOCAL] `apps/web/data/strategy-decay-metrics.json` was last written by commit `59ccb823` (2026-06-03) and its `date_range` ends `2026-06-02` — 86 days without a refresh as of today. Nothing regenerates it: `git grep -l compute-strategy-decay origin/main` returns only the admin page, two sibling data files, `apps/web/lib/strategy-library.ts`, and two marketing docs. There is no workflow, no cron route, and no scheduled job in `.github/workflows/` that runs `scripts/compute-strategy-decay.py`. A monitor that last observed the engine in June is a snapshot, and the admin page renders it with no freshness stamp, so a stale reading is indistinguishable from a current healthy one.

*A threshold that cannot fire.* [CODE/LOCAL] The rule is `flag when rolling_90d_win_rate < 0.5 × historical_baseline`, baseline 50.8%, so the trigger sits at 25.4% (`strategy-decay-metrics.json` `_meta.decay_rule`, mirrored at `apps/web/lib/strategy-library.ts:125-133`). In the same artifact, `hmm-top3` shows `rolling_90d` win rate 33.7% on n=332 against that 50.8% baseline — a 17.1-point absolute drop, a 33.7% relative loss of edge — and it is not flagged, because it would have to shed a further 8.3 points to cross 25.4%. A strategy can lose a third of its edge and still read as healthy.

*And it gates nothing.* [CODE] `apps/web/app/lib/signal-generator.ts` contains exactly two suppression gates — market hours (`:670`) and ADX (`:673`). There is no decay or demote hook anywhere in the delivery path; `decay_status` / `auto_demote` (`strategy-library.ts:40-41,59-60`) are consumed only by `apps/web/app/admin/strategy-library/page.tsx`.

**Proposed change (future PR).** Freshness before cleverness: (1) schedule regeneration against the production source and stamp the artifact with `generated_at`, surfacing a "stale, last observed <date>" state anywhere decay is shown, so a dead monitor reads as dead; (2) replace the `0.5 × baseline` floor with a one-sided binomial test of the rolling window against the frozen baseline, keeping the existing n≥20 sample floor, so a statistically significant loss of edge flags instead of only a catastrophic one; (3) only then wire the flag into the delivery path, and show a demoted strategy *as demoted with its decay evidence*, never silently withheld. The artifact's own `_meta.provenance` already says `LOCAL scanner/dev samples — NOT production Railway Postgres`, so step (1) is also what makes any downstream gate legitimate.

**Evidence.** [LOCAL] `apps/web/data/strategy-decay-metrics.json` `_meta` + `strategies.hmm-top3.rolling_90d`; last-touch commit `59ccb823` 2026-06-03. [CODE] `strategy-library.ts:2-11,40-41,125-133`; `signal-generator.ts:670,673`; absence of `compute-strategy-decay` in `.github/workflows/`. External: alpha decay is continuous and detected by rolling re-evaluation, which is precisely the thing not running here ([signal decay patterns](https://microalphas.com/signal-decay-patterns/), [Foxholm on signal decay](https://foxholm.com/q/concepts/signal-decay/)).

**Effort/impact.** Effort: low for the freshness stamp and the schedule, medium for the significance test, medium for the delivery gate. Impact: high — "auto-demote strategies that lose edge" is a headline brand claim currently backed by a June snapshot and a threshold loose enough that the one strategy visibly losing edge does not trip it.

**Brand-alignment:** "Disciplined risk management (auto-demote strategies that lose edge)" is stated as a product property; today it is a report that stopped running, reading a sample that self-labels as non-production.

**Grill verdict:** SURVIVED — "this is just a stale dev artifact, not a product defect" fails because `strategy-library.ts` loads it into an operator-facing surface with no staleness signal, so it actively reassures. The second objection, "tightening the threshold will spam demotions," is answered by keeping the n≥20 floor and requiring statistical significance rather than lowering the bar arbitrarily.

## Proposal 3 — Reuse the shipped provenance badge on `/track-record` and `/calibration` (do not build a new one)

**Problem.** The brand constraint "distinguish LOCAL scanner/dev samples from production verified record" is enforced on one surface and absent on the two that carry the strongest numbers.

[CODE] `apps/web/components/data-provenance-badge.tsx` already exists and already models exactly this distinction — `export type DataProvenance = 'live' | 'mixed' | 'simulated' | 'empty'`, localized, with a source tooltip. Its only importers on `origin/main` are `apps/web/app/accuracy/AccuracyClient.tsx:5` and `apps/web/app/components/accuracy-stats-bar.tsx:5`. `/accuracy` is labelled. `/track-record` is not: `TrackRecordClient.tsx:12` imports only `isObservedOHLCVOutcomeSource` from `lib/outcome-provenance`, which answers "was this row's outcome observed from a price feed" — a per-row question, not a dataset-origin question. `/calibration` is not labelled either; `apps/web/app/api/calibration/route.ts` computes from `readHistoryAsync()` and returns `isSimulated` / `insufficientData` in the payload, but no dataset-origin label reaches the page.

**Proposed change (future PR).** Thread the existing `DataProvenance` value into the `/track-record` and `/calibration` responses and render the existing badge. No new component, no new vocabulary, no new copy to keep in sync across locales. This is the low-effort correction of last week's Proposal 2, which called for building a badge that turned out to be already built and already wired elsewhere.

**Evidence.** [CODE] `data-provenance-badge.tsx` (type + config); importer list from `git grep data-provenance-badge origin/main` = `AccuracyClient.tsx:5`, `accuracy-stats-bar.tsx:5`, and nothing else; `TrackRecordClient.tsx:12`; `api/calibration/route.ts` (`isSimulated`/`insufficientData` present in the payload, unlabelled in the UI). Market: 2026 buyer guidance repeatedly separates "published live track record" from backtest or demo output as the credibility test ([honest AI signals review](https://www.tradealgo.com/trading-guides/ai-trading/ai-trading-signals-review)).

**Effort/impact.** Effort: low — one field threaded per surface, component already shipped and localized. Impact: medium-high — closes a verbatim brand constraint on the two surfaces a skeptic checks first, at near-zero design cost.

**Brand-alignment:** The constraint is project policy word-for-word; the component that satisfies it exists and is simply not mounted where it matters most.

**Grill verdict:** SURVIVED — "the row-level observed/unverified label already covers it" remains false for the same reason as last week: observed-source is not dataset-origin, and a local sample row can be observed-OHLCV and read as verified. The new information is that the fix is a reuse, not a build.

## Proposal 4 — Give the D1 alpha lane a pre-registered futility boundary so it can fail honestly before day 365

**Problem.** The prospective ledger is running correctly and reporting honestly. [PRODUCTION] `GET /api/track-record/alpha` and the rendered `/track-record/alpha` page (2026-08-28): calendar days 18/365, consecutive snapshots 19/365, closed sleeve trades 0/12, unresolved cadence gaps 0/0, strategy net return +9.99%, benchmark net return +26.34%, **active return −16.35%**, strategy max drawdown 2.72% vs benchmark 3.04%, verified rows 19, `label: "collecting evidence"`, `promotion: "not-promoted"`. The losing number is published on the page, in plain sight, next to the benchmark that is beating it. That is the brand working.

The gap is what happens next. [CODE] `apps/web/lib/d1-alpha-protocol.ts:12-14` freezes the observation minimums at 365 calendar days, 365 snapshots, 12 closed trades, and `evaluateD1AlphaGate` (`:444-479`) returns `collecting-evidence` until those minimums are met, only then resolving to `eligible-for-review` or `failed-gate`. There is no interim decision point. A lane trailing its benchmark by 16 points will read "collecting evidence" for another 347 days and cannot be demoted before then, which is the one strategy state the brand explicitly promises to act on.

**Proposed change (future PR).** Pre-register and freeze — under the same rule-hash discipline that already protects the entry rule (`D1_ALPHA_RULE_SHA256`) — a futility boundary evaluated at fixed interim fractions of the observation window. Standard construction: stop for futility when conditional power, the probability of clearing the final gate given the data so far, falls below a pre-specified threshold. Publish the boundary before it is ever evaluated, alongside the existing thresholds, so an early retirement reads as the rule firing rather than as a decision made after seeing the result. Add a `failed-futility` status distinct from `failed-gate` so the ledger records *why* a lane stopped.

**Evidence.** [PRODUCTION] alpha ledger figures above, fetched today. [CODE] `d1-alpha-protocol.ts:12-14` (365/365/12), `:444-479` (`collecting-evidence` until minimums met; `passed ? 'eligible-for-review' : 'failed-gate'`), `D1_ALPHA_MAX_DIRECTION_CHANGES = 30` at `:19` showing the protocol already carries pre-registered discipline constants. External: futility boundaries are the established way to abandon early without the multiple-comparisons cost of ad-hoc peeking, are pre-specified in the analysis plan when binding, are typically evaluated after 30–50% of the planned sample, and commonly use a conditional-power threshold of 0.10–0.20 ([optimality criteria for futility stopping boundaries, PMC7643306](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7643306/), [optimal futility boundaries for binary endpoints, PMC11331636](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11331636/), [Jennison, group sequential designs with early stopping for efficacy and futility](https://people.bath.ac.uk/mascj/talks_2023/cj-nhlbi-slides.pdf)).

**Effort/impact.** Effort: medium — one pre-registered constant set plus a status, no change to the frozen entry rule and no change to how snapshots are written. Impact: medium-high — it makes "auto-demote" apply to the flagship prospective lane, and it protects the year-long gate's credibility by fixing the abandonment rule before anyone has a motive to argue about it.

**Brand-alignment:** Disciplined risk management and radical transparency both require that a losing lane can be retired by a rule written in advance, not by a judgement call made 347 days from now with the result already visible.

**Grill verdict:** SURVIVED — the serious objection is that interim looks are exactly what a pre-registered frozen protocol exists to prevent, and that adding them now, with the lane already down 16 points, is peeking dressed as method. That is why the proposal is a *pre-registered, frozen, published-before-evaluated* boundary with its own hash and its own status value, and why it is scoped to futility only — no early promotion path, no change to the entry rule, no re-opening of the efficacy gate.

---

## Killed seeds

**Confidence calibration surface — KILLED (already shipped).** Last week's Proposal 3 asked for a public reliability view. It exists on `origin/main`: `apps/web/app/calibration/page.tsx`, `apps/web/app/calibration/CalibrationClient.tsx`, `apps/web/app/api/calibration/route.ts` with tests, listed in `apps/web/app/sitemap.ts:31`, and linked from `apps/web/app/components/site-footer.tsx:37`, `apps/web/components/PageNavBar.tsx:114`, `how-it-works/HowItWorksClient.tsx:364`, and `open-data/page.tsx:119`. It is absent only from the marketing navbar's `PRIMARY_LINKS` (`apps/web/app/components/navbar.tsx:25-30`) — a discoverability detail, not a missing feature. Proposal 1 above builds *on* this shipped surface rather than re-proposing it.

**Grill verdict:** KILLED — shipped; re-proposing it would repeat the 2026-08-21 error of verifying against a 74-behind tree.

**Pro conversion funnel hardening — KILLED (re-verified, still dead).** `apps/web/app/pricing/page.tsx` on `origin/main` is a three-line `redirect('/track-record')` with the comment "TradeClaw no longer sells subscriptions." Migration `053_drop_monetization.sql` removed subscriptions and tiers. There is no funnel to harden, and proposing one would contradict the shipped OSS pivot.

**Grill verdict:** KILLED — no paid funnel exists on `main`.

## Corrections to the 2026-08-21 weekly

1. **Proposal 2 overstated the work.** It proposed adding "an explicit, machine-set provenance badge." The badge already exists at `apps/web/components/data-provenance-badge.tsx` with a `live | mixed | simulated | empty` type and is mounted on `/accuracy`. The real gap is narrower and cheaper: mount it on `/track-record` and `/calibration`. Proposal 3 above supersedes it.
2. **Proposal 3 was a re-proposal of shipped work.** The calibration surface was already live on `main` when it was written. Recorded above as a kill, and as the reason every claim in this run was verified against `origin/main` and the live endpoints rather than this working tree.

## Two candidate findings that died under verification (recorded, not proposed)

- **"The D1 alpha ledger has no writer."** False. `appendD1AlphaSnapshot` (`apps/web/lib/d1-alpha-ledger.ts:420`) is reached through `runD1SlowGateLane` (`apps/web/lib/d1-slow-gate-paper.ts:136`), which is imported by `apps/web/app/api/cron/signals/route.ts:30`. Live confirmation: 19 snapshots across 18 calendar days with 0 unresolved cadence gaps and a latest bar of 2026-08-28. The clock is ticking.
- **"Users read the rule score as a probability because nothing says otherwise."** Partly false. `apps/web/app/api/proof/route.ts:154` explicitly labels it "mechanical rule/confluence score; not a probability or edge estimate," and the card renders `85/100`, not `85%`. Proposal 1 was rewritten around what the disclaimer does *not* cover — ordering — which is asserted by the sort, the default filter, and the colour thresholds.

## Lessons and escalations

`loops/state/tradeclaw.STATE.md` is a permission-blocked sensitive path in this harness — the append was attempted and denied, the same block the 2026-07-17 and 2026-07-31 weeklies recorded. Per the loop contract these are recorded in the committed artifact instead, unabridged.

**Lessons (durable)**

1. Verify proposals against `origin/main` **and** the live endpoint, never the working tree. This checkout is 77 behind. Two candidate findings this run were false and died before reaching a proposal: "the D1 alpha ledger has no writer" (it is reached via `runD1SlowGateLane` from `api/cron/signals/route.ts:30`, and live shows 19 snapshots with 0 cadence gaps and a latest bar of today), and "nothing tells users the rule score is not a probability" (`api/proof/route.ts:154` says exactly that). Repo grep alone would have shipped both as real.
2. A public read-only GET on a production endpoint is the cheapest way to turn a repo-shaped guess into a measured fact, and it stays inside the propose-only boundary. `/api/calibration` and `/api/track-record/alpha` produced every headline number here.
3. Before proposing a component, grep for the type it would export, not just the page it would live on. Last week proposed building `DataProvenanceBadge`; it already existed and was already mounted on `/accuracy`.

**Escalations (owner decision required)**

1. **Measured confidence inversion in production.** `/api/calibration` (n=4,902, `isSimulated:false`): the 80–89 band realizes 33.86% against the 70–79 band's 38.08%; ECE 0.4216; Brier 0.4012 versus 0.2314 for a constant base-rate forecast. All counted-resolved signals fall in 70–89, so the public reliability chart is two points. The screener still sorts descending on that score (`api/screener/route.ts:121`), defaults to `minConfidence: 70` (`ScreenerClient.tsx:406`), and paints ≥80 emerald (`signal-outcome-card.tsx:201-208`). Owner call: publish the inversion, and change the default sort?
2. **The edge-decay monitor has not run in 86 days.** `apps/web/data/strategy-decay-metrics.json` last written by `59ccb823` (2026-06-03), `date_range` ends 2026-06-02, nothing regenerates it, and it renders with no freshness stamp. Its 25.4% trigger does not fire on `hmm-top3` at 33.7% rolling-90d. Owner call: schedule regeneration against the production source?
3. **Branch divergence is widening.** `feat/premium-ui-overhaul` is 77 behind / 56 ahead of `origin/main`, up from 74/45 on 2026-08-21, and still lacks TC-254. Any work from these proposals must branch from `origin/main`.

## Sources

- Calibration metrics: https://www.emergentmind.com/topics/expected-calibration-error-ece , https://arxiv.org/pdf/2504.18278
- Futility / group-sequential stopping: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7643306/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11331636/ , https://people.bath.ac.uk/mascj/talks_2023/cj-nhlbi-slides.pdf
- Alpha / signal decay: https://microalphas.com/signal-decay-patterns/ , https://foxholm.com/q/concepts/signal-decay/
- Market / competitive: https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide , https://www.tradealgo.com/trading-guides/ai-trading/ai-trading-signals-review , https://aotrading.io/blogs/best-crypto-signal-services-2026

## Status

4 proposals (P1 rule-score inversion, P2 decay monitor freshness + trigger, P3 provenance badge reuse, P4 D1 futility boundary), 2 seeds killed (calibration surface shipped, Pro funnel dead), 2 candidate findings killed under verification, 2 corrections to the 2026-08-21 weekly, 1 standing escalation (branch 77 behind `origin/main`).

Propose-only: no product code edited, no migration run, no domain, claim, or secret changed, no production PR opened, no write to Stripe or the signals table. Two read-only public GETs were the only network calls. Committed by explicit path to `feat/premium-ui-overhaul`.
