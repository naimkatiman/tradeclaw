# Phase 6 — Honest, regime-aware repositioning (design)

Date: 2026-06-13
Status: design / spec — awaiting owner review before implementation plan
Author: session continuation after Phase 5 (PR #118 merged to main @ `b0a344b`)
Supersedes the "Phase 5 (execution) — webhook go-live" block in `docs/plans/2026-06-10-engine-makeover.md` as the next active phase. Execution go-live stays gated; see Out of scope.

## Why this phase exists

Phases 4, 4.5, and 5 ran three independent edge-hunts under pre-registered frozen gates. All three failed at a retail cost structure:

- **Timing (Phase 4 / 4.5):** single-asset OHLCV timing has no deployable edge after costs.
- **Funding carry (Phase 5):** raw yield is real (+39.50% on 2x unlevered capital over 6.75y, all folds positive) but compresses to +2.35%/yr recently — below passive once cost bites.
- **Cross-sectional momentum (Phase 5):** B1 is a survivorship mirage; B2's single subwindow PASS is a benchmark artifact.

Full reasoning: `docs/research/2026-06-13-phase5-verdict-carry-xsection.md`.

The load-bearing conclusion: there is no directional signal to sell. The durable asset is the validated edge-vs-noise bench (it killed three candidates before any customer saw them) and the Phase 3 regime engine (`docs/operators/regime-engine.md`). The owner's verbatim intent from the umbrella plan stands: **"The track record is the selling point; the engine is the moat."**

So the product repositions from "follow these profitable signals" to **"here is the market regime, here is what we have honestly measured to work and not work, decide for yourself."** Honesty is the moat — which means the public surface must be *true* before it can lead with regime context.

## Decisions (locked with owner, 2026-06-13)

1. **Positioning:** reposition to a regime-context + honest-measurement product (not another edge-hunt, not carry re-test, not hold).
2. **Audience / win condition:** the public honest-track-record surface. Win = GitHub stars + Alpha Screener (SaaS) signups. Not the narrow paid-SaaS-only play; not the B2B/IB layer (that is the separate TradingRail business and is not folded in here).
3. **Sequence:** honesty sweep first (audit + fix every public measurement surface), regime presentation second. The most rigorous option — chosen because a product whose moat is honest measurement cannot half-ship the honesty.
4. **"Verified" claim default:** if the audit finds the recorded data cannot back `/track-record`'s live "Verified — no hiding losses" claim, **soften the wording to exactly what the data supports** (e.g. "tracked signals, recorded outcomes, sample N") rather than ship an unbacked claim. Upgrade the claim later only if measurement improves. Never ship a claim the data can't back.

## Current state verified on `main` (not assumed)

- `apps/web/app/results/page.tsx` — **already partially remediated.** Title is "Strategy Profiles (Illustrative)"; description states "Hand-authored example metrics — not engine output. See /track-record for live, tracked performance." Still renders attractive win rates / Sharpe under that banner (`VALIDATION_SUMMARY`, `result.metrics.winRate`). Audit must judge whether the "Illustrative" framing is loud enough at a skim.
- `apps/web/app/track-record/page.tsx` — **highest liability.** Metadata claims "Verified Signal Track Record", "Real performance data", "No cherry-picking, no hiding losses." Truth depends on `TrackRecordClient` data source and whether measurement is honest (the firehose / Pro-gate recording gap noted in prior audits: the Pro broadcast-gate decision was never recorded, so the displayed record may measure the wrong population).
- `apps/web/app/backtest/page.tsx` — **fine.** Live interactive tool computing RSI/MACD/EMA on real candles via `@tradeclaw/strategies`; user-driven, not fabricated.
- **Regime is not on any public page.** It exists only at `apps/web/app/admin/weekly-regime/` (operator) and `apps/web/app/api/v1/regime/route.ts` (API), persisted to `market_regimes`, resolved through `fetchResolvedRegimeMap()` (`apps/web/lib/regime-resolution.ts`) with the weekly-card override. Promoting it to the public hero is net-new presentation of data that already exists.

## Phase 6a — Honesty sweep

### 6a.1 Audit
Inventory every public measurement surface and classify each displayed number, with `file:line` evidence and its data source, into one of:
- `live-measured` — from a recorded source, with a stated sample size and date range
- `synthetic-fallback` — generated when an upstream API fails (must be labeled)
- `illustrative` — hand-authored example (must be labeled, e.g. current `/results`)
- `over-optimistic-framing` — real data presented in a misleading way (cherry-picked window, hidden denominator, win-rate without sample size)
- `unverifiable` — cannot trace to a source

Surfaces in scope (public, measurement-bearing): `track-record`, `results`, `accuracy`, `benchmark`, `calibration`, `confidence`, `consensus`, `allocation`, `ab-stats`, plus the feeding APIs `/api/signals/equity`, `/api/signals/history`, `/api/signals/accuracy-context`, `/api/og/track-record`, `/embed/track-record`. The audit explicitly credits already-honest surfaces rather than re-flagging them.

Output: a remediation table (surface → metric → classification → evidence → required fix). This step is read-only and fans out across ~10 surfaces — suited to parallel audit subagents.

### 6a.2 Honesty contract
One page, the rule every measurement surface must satisfy:
- Every metric declares provenance: `live-measured` / `synthetic` / `illustrative`.
- Every performance number shows sample size (N) and date range.
- No fabricated or simulated equity curve is presented as real.
- The headline "verified" claim is backed by a named recorded source that **includes losses and no-edge periods**, or the wording is softened to what the data supports (per decision 4).
- Synthetic-fallback data is visibly labeled, never silently shown as real.

### 6a.3 Remediate
Fix each flagged item to the contract: relabel, add provenance + sample size, correct the measurement, or remove. Priority order: `/track-record` (the live "verified" claim) → any `over-optimistic-framing` → `unverifiable` → labeling polish on already-illustrative surfaces. Default action on the "verified" claim is soften-to-provable (decision 4); fixing the recording gap to *earn* "verified" is logged as a possible follow-up, not assumed into this phase.

## Phase 6b — Regime + credibility surface (on the now-honest base)

### 6b.1 Public regime view
Surface current regime per asset from `/api/v1/regime` + `market_regimes`. Show the regime label (trend / volatile / range), how it is classified (the feature basis, in plain language), and its stability (recent flips). Net-new read-only presentation; no new data pipeline.

### 6b.2 "What we tested and killed" panel
For timing / carry / cross-sectional: the one-line honest verdict, each linking its registered research doc. This is the bench's credibility made visible — the differentiator. Pull verdicts verbatim from the Phase 4.5 and Phase 5 verdict docs; do not re-summarize loosely.

### 6b.3 Lead the narrative
Reframe the landing/hero so the public-facing story leads with regime context + honest measurement, with clear CTAs to the GitHub repo (stars) and Alpha Screener (signups).

## Out of scope (logged, not creeping in)

- Execution / webhook go-live — stays gated; no edge exists to execute on.
- Flipping `TRADECLAW_STRATEGY_ROUTER_MODE` to active — it records only; do not activate.
- The ~50 non-measurement public routes — untouched this phase.
- The B2B / IB embeddable regime layer — that is the separate TradingRail business.
- Earning the "verified" claim by fixing the Pro-gate recording gap — logged as a follow-up; default is soften-to-provable.

## Build approach

- 6a.1 audit: parallel read-only subagents, one per surface group; results merged into one remediation table.
- 6a.3 remediation + 6b UI: TDD where measurement logic is involved (a metric's correctness gets a test); presentation-only changes get a documented manual check.
- Each phase ships as its own PR. Branch isolation per repo discipline; the repo root is shared with concurrent jobs, so a feature branch based on current `origin/main` (`b0a344b`), not the stale local `main`.
- Archive `gateguard-session.json` at phase start (the 50-clear cap recurs every phase; only the owner archives the state file).

## Verification

- Every remediated surface gets a test or a documented manual check.
- The final "verified"/"tracked" wording maps to a specific named recorded data source (or is softened until it does).
- Type-check passes; the 5 required CI checks (Lint & Type Check, Build, Unit Tests, Strategy Backtests, Docker Build) green per PR. Playwright E2E is non-required and chronically red on main — not a gate.

## Risks

- The audit may find the track record is mostly unbackable, forcing a large softening that weakens the marketing claim. Accepted: an honest weak claim beats a strong false one (decision 4).
- Regime presentation invites "so what do I do with it?" — mitigated by the honest framing (context, not instruction) and the tested-and-killed panel setting expectations.
- Concurrent writers on the shared repo root. Mitigated by feature-branch isolation off current `origin/main` and explicit-filename staging.

## References

- `docs/plans/2026-06-10-engine-makeover.md` — umbrella roadmap (owner intent, phase history).
- `docs/research/2026-06-13-phase5-verdict-carry-xsection.md` — Phase 5 verdict.
- `docs/plans/2026-06-12-phase4.5-entry-strategy-rethink.md` — Phase 4.5 timing verdict.
- `docs/operators/regime-engine.md` — the regime engine (the moat).
