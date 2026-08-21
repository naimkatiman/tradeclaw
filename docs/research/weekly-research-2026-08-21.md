# Weekly Research — 2026-08-21

Mode: WEEKLY (propose only — no implementation). Read-only on product code.
Branch: `feat/premium-ui-overhaul` (in sync with its own remote, 0/0). vs `origin/main`: 45 ahead / 74 behind. No in-progress merge/rebase. Recovery stashes `stash@{0}` (tc254) and `stash@{1}` (tc253) preserved.
Contract: `project-loops` weekly. Ground truth established via `continuous-improvement:reconcile` + `safety-guard` before any write.

## Method

- Internal friction/drift (`/continuous-improvement`): read-only `Explore` map of the four feature-seed surfaces, plus direct reads of `compute-strategy-decay.py`, `confidence-calibration.ts`, `outcome-provenance.ts`.
- External, cited (`/deep-research` via web search): alpha-decay measurement, probability calibration (reliability / Brier / ECE).
- Competitive (`/market-research`): 2026 AI-signal transparency landscape.

Every repo claim below is anchored to a file. Every external number is attributed. TradeClaw's own metrics are read from code, never synthesized.

## Standing internal-drift finding (escalated, not a proposal)

This branch is 74 commits behind `origin/main` and does **not** contain the shipped TC-254 D1 alpha ledger: `apps/web/migrations/054_d1_alpha_ledger.sql` and `apps/web/app/track-record/alpha/` are absent here; migrations stop at `053`. They exist on `main` via PR #211 (`25c30665`). Any proposal that touches track-record must be branched from and reconciled against `origin/main`, not this working tree. Recorded in the state file under Escalations.

---

## Proposal 1 — Make "auto-demote" real: gate user-visible signals on measured edge decay

Problem. The brand promises "disciplined risk management (auto-demote strategies that lose edge)," but the code only *reports* decay to an operator. `scripts/compute-strategy-decay.py` computes a rolling-90d win rate and flags `DECAYED` when it drops below `0.5 × 50.8% baseline = 25.4%`, auto-demoting only when the flag fires and n≥20 (`compute-strategy-decay.py:8-11,34-43`). Its output is a static artifact (`apps/web/data/strategy-decay-metrics.json`) whose only consumer is the admin page (`apps/web/app/admin/strategy-library/page.tsx`). The live signal generator (`apps/web/app/lib/signal-generator.ts`) has no decay/demote/suppress path. The one runtime pre-delivery suppressor is a drawdown/consecutive-loss/correlation circuit breaker (`packages/signals/src/risk/circuit-breaker.ts:19-52`), not per-strategy edge erosion. Net: a decayed strategy can still surface signals to users.

Proposed change (future PR, propose-only here). Promote decay from an offline report to a delivery gate: compute rolling edge on the production Postgres source (not the LOCAL sample the script currently reads), and suppress or demote a strategy's user-visible signals when it is `DECAYED` with adequate sample. Keep it transparent — a demoted strategy is shown *as demoted* with its decay evidence, never silently hidden. Require the decision to run on production data, honor the existing n≥20 floor, and add a re-promotion path when edge recovers.

Evidence. Repo: report-only wiring at `compute-strategy-decay.py:34-46`, `apps/web/lib/strategy-library.ts:40-41,125-134`; no generator hook (`signal-generator.ts`). External: alpha decay is real and continuous — rolling information-coefficient decline is the standard decay signal, and more frequent re-evaluation (3-month rolling beats no-rolling) slows it ([microalphas.com](https://microalphas.com/signal-decay-patterns/), [Foxholm](https://foxholm.com/q/concepts/signal-decay/)); estimated annual alpha-decay cost ~5.6% US / ~9.9% EU ([wallstreetmojo](https://www.wallstreetmojo.com/alpha-decay/)).

Effort/impact. Effort: medium (new production rolling-metric source + one gate in the delivery path + admin toggle). Impact: high — converts a headline brand claim from aspirational to enforced, and protects users from strategies that have lost edge before they act on them.

Brand-alignment: Directly delivers "auto-demote strategies that lose edge" and "disciplined risk management" — today the claim is made in copy but not enforced in the signal path.

Grill verdict: SURVIVED — the obvious objection ("suppression hides losses, violates radical transparency") is answered by keeping demoted strategies visible-as-demoted with their evidence; the real risk (acting on LOCAL samples) is designed out by requiring the production source and the n≥20 floor.

## Proposal 2 — Put the LOCAL-vs-production provenance line into the track-record UI

Problem. A hard brand constraint is "distinguish LOCAL scanner/dev samples from production verified record." Today that distinction is written down in exactly one place — an offline script comment: `"LOCAL scanner/dev samples — NOT production Railway Postgres"` (`compute-strategy-decay.py:46`). The track-record surface itself resolves outcomes over a seeded JSON archive (`apps/web/app/api/proof/route.ts:57-95` reading `signal-history.json`) and labels each row verified vs `unverified` by an observed-OHLCV source allowlist (`apps/web/lib/outcome-provenance.ts:1-17`, applied at `TrackRecordClient.tsx:1256-1257,1320-1321`). That answers "was the outcome observed from a price feed," but it does not answer "is this the production verified record or a local dev sample." A visitor cannot tell.

Proposed change (future PR). Add an explicit, machine-set provenance badge to the track-record surfaces — one of `production-verified` vs `local-sample` — sourced from the data origin, not hand-typed. Reuse the existing observed/unverified row logic; this adds the dataset-level origin label the brand constraint requires.

Evidence. Repo: label present only in the offline script (`compute-strategy-decay.py:46`); UI provenance is observed-vs-unverified only (`outcome-provenance.ts`, `TrackRecordClient.tsx:1256-1321`); page framing says "modeled, not broker fills" but not local-vs-production (`apps/web/app/track-record/page.tsx:25,29,35`). External/market: 2026 buyer guidance is explicit — "verify accuracy claims independently, demand live results" ([TradeAlgo honest review](https://www.tradealgo.com/trading-guides/ai-trading/ai-trading-signals-review)); the differentiated players win on transparent, live-labeled records ([Danelfin review](https://alphagaindaily.com/en/blog/danelfin-ai-stock-review)).

Effort/impact. Effort: low (one badge component + a data-origin field threaded from the API). Impact: medium-high — closes a stated brand constraint that the UI currently violates, and removes an honest-transparency gap a skeptic would flag first.

Brand-alignment: The constraint is verbatim project policy ("distinguish LOCAL scanner/dev samples from production verified record"); the UI does not yet honor it.

Grill verdict: SURVIVED — "the row-level verified/unverified label already covers it" is false: observed-source ≠ production-origin; a LOCAL sample row can still be observed-OHLCV and read as verified.

## Proposal 3 — Surface confidence calibration so a band means what it says

Problem. A signal's `confidence` is a static heuristic — a mechanical rule/confluence score scaled to 0-100 (`apps/web/app/lib/signal-generator.ts:156-168`), explicitly "not a probability or edge estimate" (`apps/web/app/api/proof/route.ts:143`). The machinery to check whether confidence tracks reality already exists: `apps/web/lib/confidence-calibration.ts` fits isotonic + Platt maps of raw confidence to realized P(win) on a time-ordered holdout and reports Brier + ECE — but by design it "is NOT changed by anything in this module" and only surfaces through `/api/calibration` (`confidence-calibration.ts:14-19`). Users never see whether "confidence 80" historically won near 80%.

Proposed change (future PR). Publish the existing calibration report on the public transparency surface: a reliability view (predicted confidence band vs realized win rate) plus the Brier/ECE headline, labeled as historical reliability, with an honest "pending real data" state below the sample floor (`MIN_CALIBRATION_SAMPLES=20`). Do not alter published confidence — only expose the gap between claimed and realized. Keep it single-feature (v1) since multi-feature columns remain forward-only NULL (`confidence-calibration.ts:26-36`).

Evidence. Repo: static confidence (`signal-generator.ts:156-168`), calibration report exists but is user-invisible (`confidence-calibration.ts:1-37`, `apps/web/app/api/calibration/route.ts`). External: reliability diagrams, ECE, and the Brier decomposition into calibration/resolution/uncertainty are the standard, well-understood way to show "when it says p, it happens about p of the time" ([Brier score](https://www.emergentmind.com/topics/brier-score), [boldness-recalibration, arXiv 2305.03780](https://arxiv.org/pdf/2305.03780)). Market: competitors are pushed toward expectancy-over-win-rate and factor-level transparency ([TradeAlgo 2026 guide](https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide)).

Effort/impact. Effort: medium (a public reliability view over an existing API; no model change). Impact: high — turns "confidence" from an unfalsifiable label into a measurable, published claim, which is the core brand thesis.

Brand-alignment: "Measurable proof over marketing spin" and "confidence bands tied to actual outcomes" — this exposes exactly that, using infrastructure already built.

Grill verdict: SURVIVED — "thin data makes it misleading" is handled by the n≥20 floor and an explicit "pending real data" state; framing is historical reliability, not a forward guarantee.

---

## Killed seed — Pro conversion funnel hardening

The featureSeed "Pro conversion funnel hardening (checkout resume, locked-Pro friction, pricing/subscription)" is dead against current code. Migration `053_drop_monetization.sql:12-33` drops subscriptions, tiers, and `stripe_customer_id`; `/pricing` now redirects to `/track-record` (`apps/web/app/pricing/page.tsx:3-7`); the only remaining Stripe path is the separate EarningsEdge product, hard-disabled at 503 (`apps/web/app/api/earningsedge/checkout/route.ts:4-8`). There is no live paid funnel to harden. Proposing this would contradict the shipped OSS/radical-transparency pivot.

Grill verdict: KILLED — no paid funnel exists; the seed is stale relative to the OSS pivot (migration 053).

## Sources

- Alpha/signal decay: https://microalphas.com/signal-decay-patterns/ , https://foxholm.com/q/concepts/signal-decay/ , https://www.wallstreetmojo.com/alpha-decay/
- Calibration: https://www.emergentmind.com/topics/brier-score , https://arxiv.org/pdf/2305.03780
- Market/competitive: https://www.tradealgo.com/trading-guides/ai-trading/ai-trading-signals-review , https://www.tradealgo.com/trading-guides/tools/ai-trading-signals-platform-comparison-2026-buyers-guide , https://alphagaindaily.com/en/blog/danelfin-ai-stock-review

## Status

3 proposals proposed (P1 delivery-gate decay, P2 provenance badge, P3 calibration surface), 1 seed killed (Pro funnel), 1 escalation (branch 74 behind main, missing D1 ledger). Propose-only: no product code edited, no migration, no domain/claim/secret change, no production PR. Next weekly should re-run from a branch reconciled against `origin/main`.
