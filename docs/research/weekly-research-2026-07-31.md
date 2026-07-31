# TradeClaw Weekly Research — 2026-07-31 (Friday)

- Date: 2026-07-31 (weekly improvement loop, propose-only)
- Working branch: `feat/premium-ui-overhaul` @ `9266e0fe`. Local HEAD == `origin/feat/premium-ui-overhaul` tip (no unpushed drift on the branch); behind `origin/main` by 41, ahead by 13. Not protected.
- Ground truth: `continuous-improvement:reconcile` + `safety-guard` run first. No stashes, no in-progress merge/rebase. Working tree carries 99 tracked-dirty + 46 untracked files — the known inherited drift owned by parallel sessions (ai-improvement/recost/brand-art clusters). Left untouched this run; the only write is this file.
- Mode: WEEKLY = propose, never implement. No product code edits, no migrations, no domain/claim/secret changes, no production PRs.
- Brand frame: open-source AI trading signals, "Every trade verified." Radical transparency (wins AND losses, no cherry-picking), disciplined risk management (auto-demote strategies that lose edge), measurable proof over marketing spin, LOCAL scanner/dev samples distinguished from the production verified record.

## How this run relates to 2026-07-17

The prior weekly run produced four SURVIVED proposals (P1 edge-decay monitor, P2 provenance audit, P3 calibration loop, P4 free/paid boundary). None was implemented — weekly mode is propose-only and the owner has not greenlit them. Re-emitting the same four adds nothing. This run verifies each subsystem against current code, confirms the gaps are still open, and advances the three on-brand seeds with a concrete new mechanism per proposal plus one genuinely new surface (P4). Each proposal below names the 07-17 proposal it supersedes so intent compounds instead of resetting.

## Research inputs

- Internal (`/continuous-improvement`, repo read-only, verified this run):
  - `apps/web/lib/cost-adjusted-edge-gate.ts` — still a static 90-day cohort binary floor: `WINDOW_DAYS=90`, `MIN_USABLE_TRADES=100`, `MIN_ACTIVE_DAYS=30`, `MIN_COVERAGE=0.9`, `MAX_EVIDENCE_AGE_DAYS=7`, `DAILY_LCB_MULTIPLIER=2.05`; verdicts `ready|insufficient_sample|incomplete_data|stale|negative|inconclusive|unavailable`. No rolling-slope or suppression layer exists (no `*decay*` file; grep for decay/slope/rolling returns unrelated hits).
  - `apps/web/app/api/calibration/route.ts` — still GLOBAL confidence buckets (50-59 … 90-99), `MIN_STABLE_CALIBRATION_SIGNALS=20`, per-bucket win-rate/calibration-error over `isCountedResolved`. No `strategy_id` segmentation (grep for per-strategy/strategy_id in the calibration dir: none).
  - `apps/web/lib/band-comparison.ts` — already computes `expectancyR` per band, but ONLY premium-vs-all (`classifyBandComparison`, verdicts `premium_better|premium_fewer_trades|premium_worse`). No per-strategy and no per-confidence-band expectancy surface.
  - `apps/web/lib/signal-history.ts` — `isCountedResolved`, `isObservedOHLCVOutcomeSource`, `NOT_DARK_STRATEGY_SQL`. No proof-chain / provenance-coverage test exists anywhere under `apps/web` (grep: none).
  - `apps/web/lib/trade-autopsy.ts` — a rule-based grader (grade A–F; sections setup/entry/exit/riskManagement/psychology; `keyLessons`; `repeatability`) wired through `apps/web/app/api/journal/autopsy/route.ts`, which is session-scoped (401 without a user session). It runs on the private user trade journal, never on the public signal record.
  - `apps/web/app/api/export/route.ts` — a data-dump endpoint (fail-safe modes, `TRADECLAW_DISABLE_GLOBAL_EXPORT`) that already exists as the raw audit trail.
- External, cited (`/deep-research`, `/market-research`): edge/alpha decay is empirically real and fast (predictive signals lose ~5–10% effectiveness annually, faster under stress), and rolling-window predictive-power analysis is the standard detection method; third-party verification (Myfxbook/FX Blue read-only, unalterable record) is the market's honesty bar for signal providers; expectancy (= win-rate × avg-win − loss-rate × avg-loss, judged as expectancy × frequency) is the minimum-viable-system metric and "win rate means nothing without reward-to-risk"; systematic loss post-mortems turn a journal into a dataset (binary rule-adherence facts, per-trade rationale) rather than a diary. Sources listed at the end.

## Verify-before-propose — confirmed already built, NOT proposed

- Per-band expectancy exists (`band-comparison.ts`, `expectancyR`) — so "add expectancy" would be wrong. P3 below narrows to the two verified gaps: it is premium-vs-all only, not per-`strategy_id` and not aligned to the calibration confidence bands.
- A trade-autopsy engine exists (`trade-autopsy.ts`) — so "build an autopsy engine" would be wrong. P4 below reuses that engine and only extends its input population to the public losing-signal record.

---

## Proposal 1 — Edge-decay slope monitor with a TRANSPARENT auto-suppression ledger (supersedes 07-17 P1)

07-17 P1 proposed detecting decay in front of the static gate. This run adds the missing half the seed actually asks for — the suppression ACTION — and makes the suppression itself transparent instead of silent. Add a rolling short-vs-long-window net-R slope per `(strategy_id, pair)` over the same counted cohort the gate already reads; when a pair's recent net-R decays materially below its own trailing baseline, auto-demote it to a `monitoring` state that stops broadcast AND writes a public demotion-ledger row stating the pair, the measured slope, and the trigger. The suppression is the disciplined-risk action; the ledger is the transparency guarantee that we don't quietly bury a pair we used to promote.

- Brand-alignment: serves "disciplined risk management — auto-demote strategies that lose edge" (the suppression) and "radical transparency, no cherry-picking" (the public ledger of what we suppressed and why), together.
- Evidence: repo — `apps/web/lib/cost-adjusted-edge-gate.ts` (static 90-day binary floor; no rolling layer). Memory `engine-no-net-edge`: single-asset timing is foreclosed after real costs, so faster erosion detection is load-bearing. External — signals lose ~5–10% of effectiveness annually and rolling-window predictive-power analysis is the standard decay detector ([mql5 Edge Decay, 2026-07-07](https://www.mql5.com/en/blogs/post/772286); [microalphas Signal Decay Patterns](https://microalphas.com/signal-decay-patterns/); [Foxholm Signal Decay](https://foxholm.com/q/concepts/signal-decay/)).
- Effort/Impact: medium effort (one rolling aggregate over the existing `signal_history` cohort + a small append-only demotion-ledger table/surface; reuses cost/provenance filters). High impact — shrinks the public-broadcast window of a decaying pair and makes the demotion itself auditable.
- Grill verdict: SURVIVED — attacked as "the gate already blocks weak pairs." The gate is a lagging binary floor; a trend monitor closes a real detection-latency gap, and the ledger is what makes auto-suppression honest rather than a silent cherry-pick. All inputs are measured net-R over the counted cohort; nothing fabricated.

## Proposal 2 — Outcome-SOURCE integrity audit on /track-record (supersedes 07-17 P2)

07-17 P2 proposed mapping each displayed stat to a real `signal_history` id. This run sharpens it from id-presence to outcome-source integrity: every stat rendered on `/track-record` must trace to ids whose resolved outcome passes `isObservedOHLCVOutcomeSource` — i.e. real observed OHLCV, not `synthetic` / `force-expired` / `trade-close` placeholders leaking into a displayed aggregate. Publish the mapped-and-observed coverage percentage, fail closed (honest empty state, never a zero) on any stat containing an unobserved or unmapped row, and expose the contributing id set through the existing `/api/export` route as the read-only audit trail — the OSS analog of a third-party verified account.

- Brand-alignment: this is the literal "Every trade verified" claim plus the mandated LOCAL-vs-production distinction, enforced by a test and an exportable trail rather than asserted by copy.
- Evidence: repo — `apps/web/lib/signal-history.ts` (`isCountedResolved`, `isObservedOHLCVOutcomeSource`), `apps/web/app/components/data-source-badge.tsx`, truth-labeling invariants in `apps/web/lib/__tests__/truth-labeling.test.ts`, `apps/web/app/api/export/route.ts` (the trail already exists). No provenance-coverage test exists today (verified). External — legitimate providers publish an unalterable, third-party-readable record, not screenshots ([ForexBrokers.com signals guide](https://www.forexbrokers.com/guides/forex-signals-providers); [Verify signals with MyFxBook](https://www.jptradingcapital.com/blog/en/verified-forex-signals)).
- Effort/Impact: low-medium effort (one invariant test + a coverage number over the existing resolved population; the export trail is already built). High impact — converts the headline transparency claim into a fail-closed, provable, exportable property.
- Grill verdict: SURVIVED — attacked as "provenance is already labeled." Labeling is per-source-badge; there is still no single assertion that a displayed aggregate contains zero unobserved rows. The gap is an outcome-source coverage assertion, and it is real.

## Proposal 3 — Per-strategy, per-band realized expectancy surfaced next to stated confidence (supersedes 07-17 P3)

07-17 P3 proposed per-strategy calibration relabel. This run reframes to the owner's exact seed #4 wording — "real-time expectancy reporting tying confidence bands to actual outcomes per strategy" — and grounds it in what already exists. `band-comparison.ts` proves TradeClaw can compute `expectancyR`, but only premium-vs-all. Extend that computation to per-`strategy_id` AND per-confidence-band (the same 50-59 … 90-99 buckets the calibration route uses), then surface the measured E[R] and the measured-vs-stated gap where the user reads the confidence number. Keep the reliability report read-only; the new part is the expectancy figure and the gap, gated on the existing 20-signal stable floor so no thin band is shown.

- Brand-alignment: "measurable proof over marketing spin" — a confidence band stops being a model output and becomes a claim carrying its own realized per-trade edge, per strategy, checkable by the user.
- Evidence: repo — `apps/web/lib/band-comparison.ts` (`expectancyR`, premium-vs-all only), `apps/web/app/api/calibration/route.ts` (global buckets, `MIN_STABLE_CALIBRATION_SIGNALS=20`, no per-strategy). External — expectancy is the minimum-viable-system metric, judged as expectancy × frequency, and win rate is meaningless without reward-to-risk ([CrossTrade Win Rate vs Expectancy](https://crosstrade.io/learn/performance-metrics/win-rate-vs-expectancy); [LuxAlgo Top 5 Metrics](https://www.luxalgo.com/blog/top-5-metrics-for-evaluating-trading-strategies/); [Win Rate vs Risk-Reward, 2026](https://traderssecondbrain.com/guides/win-rate-vs-risk-reward)).
- Effort/Impact: medium effort (generalize an existing expectancy computation across two grouping keys; reuse the calibration buckets and stable floor). High impact — turns an internal diagnostic into a user-facing, per-strategy honesty number.
- Grill verdict: SURVIVED — attacked as "expectancy already exists." True at premium-vs-all, which is why the proposal narrows to the two verified gaps (per-strategy, per-band) and stays inside the measured 20-signal floor. No fabricated bands.

## Proposal 4 — Published loss post-mortems for the public losing-signal record (new this run)

Radical transparency of losses is the brand's sharpest claim, and it is currently under-served: losses are counted on the track record but not explained. TradeClaw already owns a rule-based autopsy engine (`trade-autopsy.ts`) that grades a trade and extracts key lessons — but it only runs on the private user journal behind a session wall. Adapt that same engine to the public counted-resolved LOSING signals: for each resolved loss, generate a machine post-mortem from the data present at entry (what the edge gate verdict, regime, and cost estimate said; where the stop sat versus realized move), grade it, and publish it on the signal/track-record surface. Reuse the engine and grading vocabulary; change only the input population (public signal_history losses, no psychology notes — those fields are simply absent, not invented).

- Brand-alignment: "radical transparency (wins AND losses, no cherry-picking)" made concrete — every published loss carries a why, not just a red number.
- Evidence: repo — `apps/web/lib/trade-autopsy.ts` (rule-based grader, `keyLessons`, `repeatability`), `apps/web/app/api/journal/autopsy/route.ts` (session-scoped today), `apps/web/lib/signal-history.ts` (`isCountedResolved` losing population). External — recording and systematically reviewing losing trades is the documented process bar; a journal with per-trade rationale and post-mortem notes "becomes a dataset instead of a diary" ([Earn2Trade Post-Trade Analysis](https://www.earn2trade.com/blog/conducting-a-post-trade-analysis/); [TradePath Post-Trade Analysis](https://www.tradepath.ai/blogs/post-trade-analysis); [Tradechainly Post-Session Reviews](https://tradechainly.com/blog/post-session-reviews-that-actually-work)).
- Effort/Impact: medium effort (a signal-loss adapter feeding the existing autopsy engine + a public render; no new grading model). High impact — differentiates on the one axis competitors hide, using code already in the repo.
- Grill verdict: SURVIVED — attacked as "an autopsy engine already exists, nothing to do." It exists but never touches the public loss record; extending its input population from private journals to published losses is a genuine transparency gain and reuses, rather than rebuilds, the engine.

---

## Verification and scope

- Read-only on all product code. No files under `apps/`, `packages/`, `scripts/`, or migrations were modified. The concurrent ai-improvement/recost/brand-art drift (99 tracked-dirty + 46 untracked) was left untouched — not this loop's to land.
- Every repo reference above was opened and confirmed this run (file:symbol level). Every metric is either a measured repo threshold or an external citation. No performance numbers were invented; there are no illustrative figures in this run's proposals.
- Next weekly run: pick up whichever of P1–P4 the owner greenlights; none is implemented here. 07-17 P1–P4 remain open and are superseded (P1–P3) or complemented (P4) by the sharper versions above.

## Escalations and lessons (recorded here — STATE.md write is harness-blocked)

- Environmental (recurring, unchanged): `loops/state/tradeclaw.STATE.md` resolves outside this run's two allowed working dirs (`C:\Ai\tradeclaw`, `C:\Users\User\.claude\loops\skills\project-loops`). It is not readable or writable this run; the launcher appends its own machine run-record. Lessons/escalations are recorded in this committed doc and in TradeClaw memory, per the established pattern (same block hit on 07-16 and 07-17).
- Owner action (still open from 07-17): update `featureSeeds` in `C:\Users\User\.claude\loops\projects\tradeclaw.json` — seed #3 "Pro conversion funnel hardening" is OFF-BRAND after the OSS free pivot and was reframed again this run. Remove or replace it so future runs stop reframing the same dead seed.
- Standing infra gap (not re-verified this run): Cloudflare WAF rule must cover `/api/cron/*`, `/api/digest/*`, and `/track-record` (cron-dispatchers-403 root cause).

Sources:
- [Edge Decay: Why Even a Genuinely Real Trading Edge Fades (mql5, 2026-07-07)](https://www.mql5.com/en/blogs/post/772286)
- [Signal Decay Analysis: Understanding Alpha Lifecycles (microalphas)](https://microalphas.com/signal-decay-patterns/)
- [Signal Decay and Alpha Erosion (Foxholm Financial)](https://foxholm.com/q/concepts/signal-decay/)
- [7 Best Forex Signals Providers for 2026 (ForexBrokers.com)](https://www.forexbrokers.com/guides/forex-signals-providers)
- [7 Steps to Verify Forex Signals with MyFxBook (JP Trading Capital)](https://www.jptradingcapital.com/blog/en/verified-forex-signals)
- [Win Rate vs Expectancy (CrossTrade)](https://crosstrade.io/learn/performance-metrics/win-rate-vs-expectancy)
- [Top 5 Metrics for Evaluating Trading Strategies (LuxAlgo)](https://www.luxalgo.com/blog/top-5-metrics-for-evaluating-trading-strategies/)
- [Win Rate vs Risk-Reward: The Math That Matters, 2026 (Trader's Second Brain)](https://traderssecondbrain.com/guides/win-rate-vs-risk-reward)
- [Post-Trade Analysis: How to Conduct It (Earn2Trade)](https://www.earn2trade.com/blog/conducting-a-post-trade-analysis/)
- [Post Trade Analysis: Turning Data into Discipline (TradePath)](https://www.tradepath.ai/blogs/post-trade-analysis)
- [Post-Session Reviews That Actually Work (Tradechainly)](https://tradechainly.com/blog/post-session-reviews-that-actually-work)
