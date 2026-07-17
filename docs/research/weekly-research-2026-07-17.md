# TradeClaw Weekly Research — 2026-07-17 (Friday)

- Date: 2026-07-17 (weekly improvement loop, propose-only)
- Working branch: `feat/premium-ui-overhaul` @ `b061bef3` (ahead of `origin/feat/premium-ui-overhaul` by 2; behind `origin/main` by 17, ahead 2). Not protected.
- Ground truth: `continuous-improvement:reconcile` + `safety-guard` run first. No in-progress merge/rebase; 23 concurrent worktrees registered (live parallel sessions — read-only on all product code this run).
- Mode: WEEKLY = propose, never implement. No product code edits, no migrations, no domain/claim/secret changes, no production PRs. The only write this run is this file (+ a state-file append).
- Brand frame: open-source AI trading signals, "Every trade verified." Radical transparency (wins and losses), disciplined risk management (auto-demote strategies that lose edge), measurable proof over marketing spin, LOCAL scanner/dev samples distinguished from the production verified record.

## Research inputs

- Internal (`/continuous-improvement`, repo read-only): edge gate `apps/web/lib/cost-adjusted-edge-gate.ts` + tests, calibration route `apps/web/app/api/calibration/route.ts` + `apps/web/lib/confidence-calibration.ts`, provenance surfaces `apps/web/lib/signal-history.ts` / `isCountedResolved` / `data-source-badge.tsx`, truth-labeling invariants `apps/web/lib/__tests__/truth-labeling.test.ts`, and the `earningsedge/*` paid surface. graphify snapshot (2026-07-06): `getTrackedSignals()` 42 edges, `getUserTier()` 33 edges still core.
- External, cited (`/deep-research`, `/market-research`): forecast calibration practice (reliability diagrams, Brier reliability/resolution/uncertainty decomposition, "check and fix calibration when outputs feed decisions; report calibration alongside accuracy"); trading-signal transparency benchmarks (third-party verified, timestamped entries, losses included, data export — cherry-picked screenshots are the standard red flag). Sources listed at the end.
- Two candidate concerns were verified as ALREADY FIXED and are not proposed: the weekly-report `mulberry32` PRNG (replaced by `getWeeklyPulse` real resolved-signal stats, `apps/web/app/api/report/route.ts`) and the EarningsEdge checkout (returns 503, checkout disabled). Confirming a solved problem stays solved is cheaper than re-solving it.

---

## Proposal 1 — Rolling per-pair edge-decay monitor with early-warning suppression

The cost-adjusted edge gate (`decideCostAdjustedEdge`) is a static 90-day cohort threshold: it allows broadcast only above a 100-observation floor, ≥0.9 coverage, ≥30 active days, positive per-signal mean net-R, and a positive day-clustered lower bound, else it blocks (`ready` / `insufficient_sample` / `stale` / `negative` / `inconclusive`). It correctly rejects a dead cohort, but it is binary and slow: a pair whose net-R is trending toward zero keeps broadcasting at full confidence until it crosses the hard floor, and a 90-day window reacts late. Add a rolling short-vs-long-window net-R slope per `(strategy_id, pair)` that flags/suppresses a pair the moment its recent edge decays materially below its own trailing baseline — an early-warning layer in front of the existing gate, not a replacement.

- Brand-alignment: directly serves "disciplined risk management — auto-demote strategies that lose edge" by catching erosion before users see it, not after the cohort is already dead.
- Evidence: repo — `apps/web/lib/cost-adjusted-edge-gate.ts` (`decideCostAdjustedEdge`, `summarizeEdgeEvidence`, `evaluateCostAdjustedEdge`) and `apps/web/lib/__tests__/cost-adjusted-edge-gate.test.ts` (90-day window, 100-obs boundary, day-clustered lower bound). Memory `engine-no-net-edge`: single-asset timing is foreclosed after real costs, so faster erosion detection is load-bearing, not cosmetic.
- Effort/Impact: medium effort (one rolling-window aggregate over the same `signal_history` cohort the gate already reads; reuses cost/provenance filters). High impact — shrinks the window where a decayed pair is still publicly broadcast.
- Grill verdict: SURVIVED — attacked as "the gate already blocks weak pairs," but the gate is a lagging binary floor; a trend monitor closes a real detection-latency gap without inventing metrics (all inputs are measured net-R over the counted cohort).

## Proposal 2 — Proof-chain provenance audit on the track-record page (LOCAL vs production)

Track-record, win-rate, calibration, and equity surfaces all route through `isCountedResolved` over `signal-history.ts`, and the edge gate already rejects `synthetic` / `unknown` / `force-expired` / `trade-close` provenance as unusable. What is not yet asserted end-to-end is that every *displayed* number on `/track-record` resolves to a real persisted `signal_history` id carrying an explicit LOCAL-scanner vs production-verified source tag, and that the page fails closed on any unmapped or ambiguous row. Build an automated proof-chain audit: each rendered stat → its contributing signal ids → provenance tag; publish the mapped-coverage percentage; render nothing (not a zero, an honest empty state) for any stat with unmapped rows.

- Brand-alignment: this is the literal "Every trade verified" claim and the mandated LOCAL-vs-production distinction, enforced by test rather than asserted by copy.
- Evidence: repo — `apps/web/app/track-record/TrackRecordClient.tsx`, `apps/web/lib/signal-history.ts` (`isCountedResolved`), `apps/web/app/components/data-source-badge.tsx`, and the truth-labeling invariants in `apps/web/lib/__tests__/truth-labeling.test.ts` (SOURCE-GATED outcomes, availability gating). External: market benchmark that legitimate providers publish timestamped entries with losses included and exportable data, not screenshots ([Myfxbook](https://www.myfxbook.com/reviews/signal-providers/13,1), [Investor's Handbook analysis](https://medium.com/the-investors-handbook/i-analyzed-20-forex-signal-providers-on-telegram-heres-whos-legit-9a846e7594d7)).
- Effort/Impact: low-medium effort (an audit + one invariant test over the existing resolved population; no new data). High impact — converts the headline transparency claim into a fail-closed, provable property.
- Grill verdict: SURVIVED — attacked as "provenance is already labeled," but labeling is per-source-badge; there is no single test proving the track-record aggregates contain zero unmapped rows. The gap is a coverage assertion, and it is real.

## Proposal 3 — Close the calibration loop: per-strategy reliability + transparent overconfident-band relabel

`/api/calibration` is already mature: it buckets the counted-resolved population into confidence bands (50-59 … 90-99), computes per-bucket realized 24h hit rate, per-bucket calibration error, Brier, ECE, and reported isotonic + logistic reliability curves on a time-ordered holdout, with an insufficient-data floor at 20 signals. Two gaps remain, both visible in the code: it is computed **globally** (no per-`strategy_id` breakdown), and it is **read-only** — the header comment states published confidence is deliberately not adjusted. So a chronically overconfident band (e.g. an 80-89% band realizing ~55%) keeps broadcasting inflated confidence with no user-facing correction. Propose per-strategy calibration segmentation plus a transparent relabel/demote of any band whose measured hit rate lags its stated confidence beyond the stable-sample threshold — the reliability report stays read-only; the new part is surfacing the measured gap where the user actually reads the confidence.

- Brand-alignment: "measurable proof over marketing spin" — confidence bands become claims tied to, and corrected by, actual outcomes per strategy, rather than uncorrected model output.
- Evidence: repo — `apps/web/app/api/calibration/route.ts` (global buckets, Brier, ECE, `calibrateConfidence`), `apps/web/lib/confidence-calibration.ts`, `apps/web/app/calibration/CalibrationClient.tsx`; the route comment itself notes multi-feature calibration is data-gated on migration-051 columns and published confidence is unchanged. External: calibration should be checked and corrected when outputs feed decisions, and reported alongside accuracy ([convexly.app on Brier/reliability decomposition](https://www.convexly.app/answers/how-to-measure-forecasting-calibration), [StatsTest reliability diagrams](https://www.statstest.com/calibration-checks-brier-score-reliability-diagrams)).
- Effort/Impact: medium effort (per-strategy grouping over an existing computation; a labeled relabel gated on the same 20-signal stable floor). High impact — turns an existing internal diagnostic into a user-facing honesty mechanism.
- Grill verdict: SURVIVED — attacked as "calibration already exists," which is true and is why the proposal narrows to the two verified gaps (global-only, report-only). Per-strategy relabel is additive and stays inside the measured-data floor; no fabricated bands.

## Proposal 4 — Free-vs-paid boundary transparency audit (EarningsEdge adjacency)

An adjacent paid product, EarningsEdge, lives inside the same web app as the free-OSS TradeClaw core: `apps/web/app/api/earningsedge/{checkout,webhook}/route.ts`, `apps/web/lib/earningsedge/{stripe,supabase,db}.ts`, `apps/web/app/earningsedge/page.tsx`, plus `SponsorClient`/`ContributeClient` funding surfaces. Checkout currently fails closed (503, "disabled until authenticated entitlement delivery is verified"), so this is not a live paywall contradicting the free claim today. The risk is positioning ambiguity: after the OSS pivot the product is "fully free," yet a Stripe/entitlement surface sits in-repo where a visitor or contributor can find it. Propose a boundary audit — document and label what is free-OSS TradeClaw vs the separate EarningsEdge product, and add a guard/test asserting the disabled checkout cannot silently re-enable without an explicit entitlement path.

- Brand-alignment: radical transparency and "no marketing spin" applied to the product's own commercial boundary — the visitor should never be unsure what is free.
- Evidence: repo — `apps/web/app/api/earningsedge/checkout/route.ts` (503, `checkoutEnabled: false`), `apps/web/lib/earningsedge/stripe.ts`, `apps/web/app/earningsedge/page.tsx`; graphify `getUserTier()` still a 33-edge core node post-pivot. Memory `oss-transparency-pivot`: the pivot removed Stripe/tiers and rebranded to fully-free OSS.
- Effort/Impact: low effort (documentation + one fail-closed guard test; no product behavior change). Medium impact — protects the transparency positioning and prevents an accidental re-enable regression.
- Grill verdict: SURVIVED (scoped) — attacked as "checkout is already disabled, so there is nothing to fix." True for behavior; the surviving core is the labeling/boundary clarity and a regression guard, which is a genuine transparency gap. Kept deliberately small.

---

## Reframed seed — Pro conversion funnel hardening (feature seed #3)

The seed "Pro conversion funnel hardening: checkout resume flows, friction between locked Pro features / pricing / subscription" is off-brand after the OSS transparency pivot, which removed Stripe/tiers and repositioned TradeClaw as fully free. Optimizing a Pro conversion funnel would contradict the current positioning. It is reframed into Proposal 4 (boundary transparency) rather than proposed as-is. Flagging this so the seed list can be updated for future weekly runs.

## Verification and scope

- Read-only on all product code. No files under `apps/`, `packages/`, `scripts/`, or migrations were modified. The concurrent ai-improvement/recost drift (`STATE.yaml`, `docs/ai-improvement/*`, `scripts/research/recost-*`) and the brand-art cluster were left untouched — not this loop's to land.
- Every metric referenced above is either a measured repo value/threshold or an external citation. No performance numbers were invented; illustrative band figures (e.g. "80-89% realizing ~55%") are labeled as illustrative, not measured results.
- Next weekly run: pick up whichever of P1–P4 the owner greenlights; none is implemented here.

Sources:
- [How to Measure Forecasting Calibration — Brier Score, Reliability Diagrams, Decomposition (convexly.app)](https://www.convexly.app/answers/how-to-measure-forecasting-calibration)
- [Calibration Checks: Brier Score and Reliability Diagrams (StatsTest)](https://www.statstest.com/calibration-checks-brier-score-reliability-diagrams)
- [Best Forex Signal Providers — verified performance (Myfxbook)](https://www.myfxbook.com/reviews/signal-providers/13,1)
- [I Analyzed 20 Forex Signal Providers on Telegram — Here's Who's Legit (Investor's Handbook)](https://medium.com/the-investors-handbook/i-analyzed-20-forex-signal-providers-on-telegram-heres-whos-legit-9a846e7594d7)
