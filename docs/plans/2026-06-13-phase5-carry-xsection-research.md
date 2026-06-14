# Phase 5 — Carry + cross-sectional research: where does edge survive costs?

Date: 2026-06-13
Status: CODE COMPLETE 2026-06-13 — verdict: neither carry nor cross-sectional momentum clears its frozen gates after costs; carry is real but compressed below deployability (recent-24mo 2.35%/yr on 2× capital). Recommendation: Phase 4.5 option 3 (regime-context repositioning). Decision memo: `docs/research/2026-06-13-phase5-verdict-carry-xsection.md`. Awaiting final branch review + PR.
Parent: `docs/plans/2026-06-10-engine-makeover.md` (umbrella). Direct predecessor: `docs/research/2026-06-12-phase4.5-verdict-single-asset-timing.md` — single-asset OHLCV timing has no deployable edge after costs; ranked options 1 (carry) and 2 (cross-sectional) are this phase's two tracks.
Branch: `worktree-phase5-carry-xsection` (base `56ea01c` = Phase 4.5 head; stacked on PR #117 → retargets main as the stack lands).

## Why this phase exists

Phase 4.5 closed the single-asset timing question: nothing clears ~0.4% round-trip crypto costs (ex-fluke daily-momentum mean −5.25%; the only positive cell +0.03–0.05%/trade, marginal). Its verdict ranked the surviving candidates: (1) carry/funding-rate harvesting — the strongest documented crypto edge, structural not timing, blocked only on funding-rate data we do not have; (2) cross-sectional momentum — buildable from OHLCV today, documented as fragile out-of-sample. The owner's call (2026-06-13): run BOTH tracks in parallel and reconcile them into one ranked verdict.

This phase is research, not product. Its deliverable is a true answer about where edge exists after costs, produced under the same pre-registered-gate discipline as Phases 2–4.5. "Neither clears" is a valid, business-critical outcome; it routes the product to the verdict memo's option 3 (sell regime context, not winning signals). No gate may be adjusted after a validation run has been seen.

## Evidence base

- **Carry**: in-sample Sharpe 6+ documented, decaying hard into 2025 (Phase 4.5 study 1). NOT a timing signal — delta-neutral perp-basis harvesting, a structural yield. The decay is exactly what the recent-window gate below tests.
- **Cross-sectional momentum**: Han/Kang/Ryu 2023 — "TS momentum strong, cross-sectional weak" after costs. Tested anyway because it is cheap (existing OHLCV machinery), the owner asked, and a registered negative kills it permanently instead of letting it haunt future planning.
- **Costs**: the Phase 2 crypto cost model (0.2%/side: taker 0.05% + slippage 0.15%) stays the single source of friction for OHLCV legs, for comparability with every prior registered number. Carry adds a spot leg: 0.10% taker + 0.05% slippage per side.

## Design decisions

**D1 — Funding-rate store.** New append-only `funding_rates` table, migration `apps/web/migrations/052_funding_rates.sql`: `(symbol, ts, funding_rate, mark_price NULL, source)`, PK `(symbol, ts)`, upsert `ON CONFLICT DO NOTHING` — same contract as `candles` (049). Accessor `scripts/research/funding-db.ts` mirroring `candle-db.ts` (DATABASE_PUBLIC_URL via `railway run`, plus `--out-dir` JSON dump mode so runs work without a DB). Backfill CLI `scripts/research/backfill-funding.ts`: primary source `GET https://fapi.binance.com/fapi/v1/fundingRate` (public, no key, 1000/page); fallback `data.binance.vision` monthly fundingRate dump zips if fapi is edge-blocked. Universe: the existing 10 majors, full available history (BTC/ETH funding since 2019-09). Funding income is summed from events as they occurred — no fixed 8h-interval assumption (Binance moved some alts to 4h funding in 2023+). First implementation step is a single-page connectivity smoke test before any plumbing.

**D2 — Carry validation (Track A).** Assembly module `scripts/research/carry-assembly.ts` (pure functions, unit-tested) + CLI `scripts/research/carry-validation.ts` (registered experiment). Three pre-registered variants, NO tuning:

- **A1 — always-on BTC carry** (baseline): continuously short perp / long spot from first stored funding event; collects positive funding, PAYS negative funding; one entry + one exit of costs over the whole window. Measures the raw structural yield.
- **A2 — threshold-gated single-asset**: per symbol, enter when trailing 7-day annualized funding > 5%, exit when < 0% — where annualized funding = (sum of funding events over the trailing 7 days) × 365/7, the same definition everywhere in this phase; each round trip charged full two-leg costs (spot 0.10% taker + 0.05% slippage per side; perp 0.05% taker + 0.15% slippage per side ≈ 0.70% per round trip across both legs, all four executions).
- **A3 — cross-sectional carry rotation**: hold top-3 of the 10-major universe by trailing 7-day funding, weekly rebalance, turnover-charged costs.

Capital model: delta-neutral, unlevered — 1 unit spot + 1 unit perp margin per unit of carry notional; all yields reported on **2× deployed capital**. No leverage flattery anywhere.

**Pre-registered gates (Track A):** net annualized yield on deployed capital > 8% over the full window AND > 5% over the most recent 24 months (the decay test); max drawdown of the funding-equity curve (negative-funding periods and round-trip costs included) < 10%; positive net yield in ≥ 3 of 4 contiguous folds. Rationale for 8%: must beat ~4–5% passive stablecoin/treasury yield by enough to justify two-leg operational complexity and exchange risk.

**Disclosed v1 limitations (Track A):** basis mark-to-market between entry and exit is not modeled (≈ 0 when both legs close together; nonzero path risk in between); short-perp-leg squeeze/liquidation risk during negative-funding spikes is not modeled. If gates pass, Phase 5.5 measures basis from perp klines BEFORE any go-live decision. These are stated in the verdict memo regardless of outcome.

**D3 — Universe expansion for Track B.** Extend `BINANCE_MAP` in `scripts/research/backfill-candles.ts` to ~30 liquid USDT-perp majors (config-map edit; exact list fixed in the implementation commit BEFORE any validation run and never edited after). Backfill D1, ~6 years (~66k rows). Universe membership is listing-date-aware: a symbol is rankable at decision time only once it has ≥ lookback+1 stored bars. Survivorship bias of "today's top 30" is real and disclosed; partially mitigated by also reporting the 2024-06→2026-06 subwindow in which all 30 traded.

**D4 — Cross-sectional validation (Track B).** Assembly module `scripts/research/xsection-assembly.ts` (rank/turnover/rebalance math, unit-tested) + CLI `scripts/research/xsection-validation.ts` (registered experiment). Spec fixed up front: 14-day lookback trailing return, weekly rebalance (every 7 D1 bars), rank the eligible universe.

- **B1 — long-only top-5** (product-realistic).
- **B2 — long-short top5 − bottom5** (academic read; short-leg funding flows noted as unmodeled in v1 — quantified by Track A's data if anyone asks).

Costs: the Phase 2 crypto model (0.2%/side) charged on actual turnover fraction at each rebalance. Benchmarks computed on the identical window: equal-weight basket buy-and-hold and BTC buy-and-hold.

**Pre-registered gates (Track B):** net-of-cost total return AND daily Sharpe (sample stddev, ÷N−1, per PR #110 convention) must both beat the equal-weight basket buy-and-hold; positive excess return over the basket in ≥ 3 of 4 contiguous folds. Matching the basket = NEGATIVE verdict (rotation that only matches passive holding is churn, not alpha). BTC-hold reported as reference, not a gate.

**D5 — Reconciled verdict.** One memo `docs/research/<run-date>-phase5-carry-xsection-verdict.md` (dated the day it is written): head-to-head gate table for both tracks, fold-level detail, disclosed limitations, and a ranked Phase 6 recommendation — build the carry engine / build the rotation product / neither (reposition per Phase 4.5 option 3). Experiment JSONs under `docs/research/experiments/` + REGISTRY.md entries for every run. Umbrella plan updated. Honest framing is the contract: gates were registered here, in this document, before any run.

**D6 — Out of scope (logged, refused).** Live execution or product/UI changes; flipping `TRADECLAW_STRATEGY_ROUTER_MODE` out of shadow; any entry-parameter tuning; multi-exchange funding data (Bybit/OKX = Phase 5.5, only if Binance-only carry passes); basis MTM measurement (Phase 5.5); position sizing; Phase 5 webhook go-live (still gated on edge that does not yet exist).

## Determinism + discipline

Fixed windows passed via CLI args; byte-identical re-runs required before registering; raw funding/candle dumps stay gitignored under `data/`; experiment JSONs + REGISTRY entries are the only citable numbers. TDD on assembly modules (RED-GREEN; pure math tested, IO thin) following the `daily-momentum-assembly.ts` pattern. Jest runs use `--modulePathIgnorePatterns="standalone"` per the known worktree footgun.

## Commit sequence (one concern per commit)

1. `docs(plan): Phase 5 carry + cross-sectional research design` — this doc.
2. `feat(research): funding_rates store — migration 052, accessor, Binance backfill CLI` (+tests; includes the connectivity smoke result in the commit body).
3. `feat(research): carry assembly — funding equity, threshold state machine, rotation math` (+RED-GREEN tests).
4. `feat(research): carry-validation CLI + registered experiments (A1/A2/A3)`.
5. `feat(research): 30-major D1 universe — map expansion + listing-date eligibility` (+tests).
6. `feat(research): cross-sectional assembly — rank, turnover, rebalance accounting` (+RED-GREEN tests).
7. `feat(research): xsection-validation CLI + registered experiments (B1/B2)`.
8. `docs(research): Phase 5 verdict — carry vs cross-sectional, reconciled + ranked` (memo, REGISTRY, umbrella update).

## Verification

- Unit tests green on both assembly modules; full suite green before PR.
- Each validation CLI re-run produces byte-identical experiment JSON (determinism check, as Phases 2–4.5).
- Backfill coverage printed and sanity-checked (funding event counts vs exchange-documented intervals; D1 bar counts vs listing dates).
- Gates evaluated exactly as written here; any deviation is called out as a protocol break in the memo.

## Risks

1. `fapi.binance.com` edge-blocked from the dev machine → fallback to `data.binance.vision` dumps (step 1 smoke test decides).
2. DB writes need `railway run --service Postgres` (operator-adjacent); `--out-dir` JSON mode keeps research unblocked offline.
3. Survivorship bias in the Track B universe — disclosed, subwindow-mitigated, not eliminable.
4. Carry v1 ignores basis path risk — gates are conservative and the limitation ships in the memo verbatim.
5. Gateguard per-project clearance cap recurs each phase — operator archives the state file before implementation starts.
