# Weekly research — 2026-07-03

- Date: 2026-07-03 (Friday weekly improvement loop)
- Mode: propose-only. No product code, migrations, deploys, Stripe/Postgres mutations, or production PRs in this run.
- Ground truth at run time: local branch `loop/standup-2026-06-26` @ `fb6d4011`, 0 ahead / 28 behind `origin/loop/standup-2026-06-26` (remote merged `main` into the loop branch at `2aa098ee`). Working tree carries another lane's drift (`README.md`, `STATE.yaml`, `docs/ai-improvement/*`, untracked `scripts/research/recost-segment.ts`) — untouched by this run.
- Research inputs: read-only repo survey (file:line refs below), plus external web sources cited inline. Repo numbers are labeled LOCAL where they come from scanner/dev samples rather than the production verified record.
- Grill status: this file is the raw weekly output. Grilling happens in the compiled cross-project digest (`/grill-me`); verdicts (`Grill verdict: SURVIVED|KILLED`) are recorded there, not here.

---

## Context: what changed on main since last weekly cycle

The merge window (`HEAD..origin/loop/standup-2026-06-26`, 28 commits) already landed the hardest honesty work, and these proposals build on it rather than re-propose it:

- `df8adeb4` (#136) charges real per-row execution cost (`cost_estimate_pct`, migration 051) on the public equity curve — the flat 0.02% charge was ~22.3x understated (0.446% / 0.02% = 22.3) per the commit's own measurement.
- `237be745` (#139) headlines net expectancy (gross − cost) so the summary card stops contradicting the curve.
- `c03660e5` (#144) reframes the landing page to lead with the honest no-edge finding and demotes signals to a transparency exhibit.
- `1fe4cc38` (#140) repositions the project off raw P&L toward education + open-source parallel tracks.
- `fddc9d01` (#124) preserves checkout intent through magic-link sign-in; `78d484d8` (#125) adds server-side PostHog for the Stripe lifecycle events.
- `bf4a863d` (#122) kills PRNG-fabricated stats on /wrapped, /api/report, and the weekly pulse.

The recost probe tracked by recent standups was answered by #136/#139. The open question for this cycle is no longer "what is the honest number" — it is "which promised transparency mechanisms are still unwired."

---

## Proposal 1 — Wire the decay monitor end-to-end: scheduled evaluation, enforced auto-demotion, public retirement ledger

**Problem (measured, repo).** The brand promises auto-demotion of strategies that lose edge, but the pipeline stops at a JSON flag. `scripts/compute-strategy-decay.py:8-50` computes rolling 30d/90d win rate against the 50.8% baseline and sets `auto_demote` when rolling 90d < 25.4% (50.8% * 0.5) with n ≥ 20 — and nothing enforces it: `handlers/cron.ts` has no scheduled entry for the script (health checks and weekly eval only), and no public surface consumes the flag. `apps/web/app/api/signals/equity/route.ts` filters by `isCountedResolved` only; `/api/leaderboard`, `/api/signals/history`, and the screener have no decay awareness. A strategy marked `DECAYED` renders a red badge on `apps/web/app/admin/strategy-library/page.tsx:83-86` and keeps emitting to every public surface. Decay inputs are currently LOCAL scanner/dev samples (`compute-strategy-decay.py:46` provenance note); the production rolling writer was never wired.

**Proposed change (for grilling, not implemented here).** (a) Schedule decay evaluation in `handlers/cron.ts` against the production `signal_history` rows, replacing the LOCAL-sample basis. (b) Make `auto_demote` load-bearing: suppress new-signal broadcast for demoted strategy×pair combos and label (not silently delete) their existing rows. (c) Add a public "retired / demoted strategies" section to the track-record page showing what was demoted, when, and on what measured basis — the demotion itself becomes proof material, consistent with #137 publicly killing the BTC daily-momentum sleeve.

**Evidence.** Post-publication strategy returns decay ~58% on average across 72 published strategies (McLean & Pontiff 2016, summarized at https://www.forbes.com/sites/quora/2024/02/02/understanding-alpha-decay-past-returns-and-future-predictability/; mechanism survey: https://arxiv.org/pdf/2105.01380) — edge erosion is the expected case, so a signals product without enforced demotion overstates by default. Repo refs above.

**Effort/impact.** Medium effort (one cron entry, decay-flag checks in 3 API routes, one track-record section). High impact: converts a brand claim that is currently admin-cosmetic into enforced, publicly auditable behavior.

Brand-alignment: "Auto-demote strategies that lose edge" is a stated brand pillar; today it is an unenforced admin badge, and wiring it end-to-end with a public retirement ledger is radical transparency applied to losses.

---

## Proposal 2 — Proof-chain provenance: broadcast-scope curve, cost-coverage labels, and resolver attribution on the public track record

**Problem (measured, repo).** Three provenance gaps keep the track record short of third-party auditability. First, `broadcastBlocked` (migration 048) is recorded on every row but no surface filters by it — the equity route and track-record page render all counted-resolved signals, so a reader cannot distinguish "what subscribers were actually sent" from internal filtered rows; the promised "Pro broadcast scope" curve (`docs/plans/2026-06-10-engine-makeover.md:39`) was never built. Second, `cost_estimate_pct` is forward-accruing with no backfill (`apps/web/lib/signal-history.ts:106`), so pre-051 rows sit uncosted next to costed rows with no visible label distinguishing raw from net P&L. Third, resolver provenance (`resolvedAt`, OHLCV `source` at `apps/web/lib/signal-history.ts:56-111`) is stored but never surfaced — an auditor cannot see which provider resolved which outcome.

**Proposed change (for grilling).** (a) Dual-scope equity rendering: all-counted vs broadcast-approved, from the existing `broadcastBlocked` field. (b) A cost-coverage label on the curve and per-row ("costed" vs "raw, pre-cost-model") instead of silently mixing regimes. (c) Resolver source + resolution timestamp surfaced in the track-record table and CSV export (`apps/web/app/api/signals/history/route.ts` already exports id/gate fields; add provenance columns).

**Evidence.** The competitive bar for "verified" is set by regulated or instrumented third parties: Darwinex certifies track records from direct trade-data access under FCA oversight (https://www.darwinex.com/), and Myfxbook's "Track Record Verified / Trading Privileges Verified" badges are the de-facto trust signal in the signal-provider market (https://www.myfxbook.com/reviews/signal-providers/13,1). TradeClaw cannot be its own regulator; its open-source analog is publishing the full provenance chain so anyone can re-verify. Repo refs above.

**Effort/impact.** Medium effort (scope filter + labels + two UI columns; fields all exist already). High impact: this is the difference between "we say every trade is verified" and "you can check the verification yourself."

Brand-alignment: "Every trade verified" only holds if a third party can trace signal → broadcast scope → cost basis → resolver; surfacing the already-recorded provenance fields is measurable proof over marketing spin.

---

## Proposal 3 — Public confidence calibration report: per-band reliability with explicit sample gates

**Problem (measured, repo).** Signals ship with a confidence number, but nothing public shows whether that number means anything. `apps/web/lib/confidence-calibration.ts` (isotonic + Platt, time-ordered holdout, Brier/ECE at lines 343-385) is reporting-only — its own header (line 19) notes published confidence is unchanged — and `/api/calibration` has no consuming UI. There is no per-strategy calibration split (v1 fits a single feature across all history, lines 33-36), and no surface states when calibration becomes credible (MIN_CALIBRATION_SAMPLES = 20 at line 118; feature columns NULL on pre-2026-06 rows per migration 051's forward-accrual).

**Proposed change (for grilling).** A calibration panel on the track-record page: predicted-vs-realized win rate per confidence band, Brier score and ECE, per-strategy split once a band×strategy cell reaches the sample minimum, and an explicit "pending real data — n=X of 20" state below threshold rather than a hidden or extrapolated value. No change to published signal confidence; report-only surface first.

**Evidence.** Metaculus made public calibration its core credibility mechanism — a published platform Brier score (~0.107-0.111 on resolved questions) and per-user calibration curves (https://www.metaculus.com/faq/, review of the public track record: https://forum.effectivealtruism.org/posts/e9htD7txe8RDdcehm/exploring-metaculus-s-ai-track-record). The precedent: showing calibration, including where it is weak, is itself the trust product. Repo refs above; module and API route already exist, so this is mostly a consuming surface.

**Effort/impact.** Low-medium effort (UI panel over an existing route + per-strategy grouping in the fit). High differentiation impact: no mainstream signal product publishes band-level reliability with sample-size honesty.

Brand-alignment: ties the confidence bands users see to measured outcomes per strategy, with sub-threshold cells labeled "pending real data" instead of invented — the literal implementation of measurable proof and no cherry-picking.

---

## Proposal 4 — Close the funnel instrumentation gap and measure whether the checkout-resume fix actually recovers conversions

**Problem (measured, repo).** #125 instruments the Stripe lifecycle (`trial_started`, `subscription_started`, `subscription_paid`, `subscription_churned` via `apps/web/lib/analytics-server.ts`), but the funnel is empty between surfaces: no `pricing_viewed`, no `upgrade_cta_clicked` on locked-stub CTAs (`apps/web/lib/tier.ts:102-126` delays free signals 30min and locks Pro strategies, yet nothing measures who hits the wall), no `checkout_initiated`/`checkout_error`, and the #124 magic-link intent-resume path (`apps/web/lib/magic-link-redirect.ts`, 87 lines) has zero analytics — so whether that fix recovered any conversions is unmeasurable today.

**Proposed change (for grilling).** Add the missing PostHog events (pricing_viewed, upgrade_cta_clicked, checkout_initiated, checkout_error, magic_link_intent_resumed), assemble the funnel view, and report the resume-recovery rate only after real events accrue — no synthesized baseline. This is instrumentation-only; no pricing, copy, or checkout-flow changes proposed until the funnel shows where the friction is.

**Evidence.** Baymard's 49-study aggregate puts checkout/cart abandonment at ~70.19% (https://baymard.com/lists/cart-abandonment-rate), typical resume/recovery captures 3-5% with leaders at 10-14% (https://mailmend.io/blogs/cart-abandonment-recovery-statistics), and the field's consistent finding is to fix measured friction before optimizing recovery — which requires the funnel to be measured first. Repo refs above.

**Effort/impact.** Low effort (event calls at existing touchpoints + one PostHog funnel definition). Medium impact now, compounding later: every future conversion proposal becomes testable instead of speculative.

Brand-alignment: the project just repositioned around honest measurement (#140, #144); extending that discipline to its own revenue funnel — measure first, claim nothing until the events exist — is the same "measurable proof over marketing spin" standard applied internally.

---

## Deferred / explicitly not proposed

- No week-over-week performance claims: production rolling decay metrics are not wired yet (Proposal 1 is the prerequisite), and this doc cites no performance number that is not already measured in-repo or labeled LOCAL.
- No conflict resolution for the loop branch divergence (0 ahead / 28 behind with another lane's dirty tree) — operational, owned by the daily loop / human, recorded in the loop state file.
- No changes to published signal confidence values (Proposal 3 is report-only by design; the engine-makeover gate result "FAILED on paper" at `docs/plans/2026-06-10-engine-makeover.md:84-86` blocks live activation paths).

## Sources

1. Forbes/Quora — Understanding "Alpha Decay" (McLean & Pontiff 58% post-publication decline): https://www.forbes.com/sites/quora/2024/02/02/understanding-alpha-decay-past-returns-and-future-predictability/
2. arXiv 2105.01380 — Why and how systematic strategies decay: https://arxiv.org/pdf/2105.01380
3. Metaculus FAQ (public Brier + calibration curves): https://www.metaculus.com/faq/
4. EA Forum — Exploring Metaculus's AI track record: https://forum.effectivealtruism.org/posts/e9htD7txe8RDdcehm/exploring-metaculus-s-ai-track-record
5. Baymard Institute — cart abandonment rate statistics: https://baymard.com/lists/cart-abandonment-rate
6. Mailmend — cart abandonment recovery statistics (3-5% typical, 10-14% leaders): https://mailmend.io/blogs/cart-abandonment-recovery-statistics
7. Darwinex — regulated track-record certification: https://www.darwinex.com/
8. Myfxbook — verified signal-provider listings: https://www.myfxbook.com/reviews/signal-providers/13,1
9. Freqtrade — open-source bot transparency baseline (FreqUI, per-trade breakdown): https://www.freqtrade.io/en/stable/
