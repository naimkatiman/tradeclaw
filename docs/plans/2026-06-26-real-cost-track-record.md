# Real per-row cost on the public track record

Date: 2026-06-26
Branch: worktree-real-cost-track-record (off origin/main)

## Goal

Make the public equity/track-record curve charge each trade's REAL recorded
round-trip cost instead of a flat 0.02%. The flat constant undercharged crypto
~20x and made the published curve materially more optimistic than a subscriber's
true result. This is a compliance/honesty fix, not an edge change.

## Evidence

`scripts/research/recost-segment.ts` run against production signal_history
(3,796 counted trades, 2026-06-26):

- Real average cost = 0.4466 R/trade = 22.3x the live curve's flat 0.02R charge.
- Net expectancy = -0.4317 R/trade (gross only +0.0149R). Published curve
  shows ~-42.5%; honest net is ~-100%.
- No asset-class x band cell clears its own cost at n>=100. Selectivity does
  not rescue net edge. (Edge-source pivot tracked separately — see Deferred.)

## Change (one concern: re-cost the public curve honestly)

`apps/web/app/api/signals/equity/route.ts`
- Replace the flat `ROUND_TRIP_COST_PCT = 0.02` with `roundTripCostNotionalPct(row)`:
  use `row.costEstimatePct` (migration 051, the real recorded cost), falling back
  to `costModelFor(pair)` round-trip (2×(fee+slippage)) for pre-051 rows.
- Per-trade: `tradeCostR = costNotionalPct / riskPct`;
  `tradeReturnPct = (rMultipleSized - tradeCostR) × RISK_PER_TRADE_PCT`.
- Summary: `roundTripCostPct` now = realized average notional cost %; add
  `avgCostR` = realized average per-trade cost in R (the honest impact number).

`apps/web/app/components/equity-curve.tsx`
- `EquitySummary` interface: add `avgCostR`.
- Caption: "after real per-symbol round-trip costs (avg X% ≈ Y R/trade)".

`apps/web/lib/stat-hints.ts`
- `totalReturnCompounded`: drop the false "0.02% round-trip costs (2bps blended)"
  claim; state the real per-symbol cost.

Out of scope (no drive-by): `TrackRecordClient.tsx` generic copy is being edited
on the active compliance-copy branch; leave it to avoid a merge conflict.

## Verification

- `npm run typecheck` (web) green.
- `npx jest apps/web/app/api/signals/equity/route.test.ts` green, including new
  per-row-cost tests (cheap FX 0.04% vs crypto 0.40% diverge; fallback by class).

## Deferred (separate workstream)

BTC-daily momentum + signal-flip sleeve — the one validated, cost-clearing
strategy. Needs its own plan doc + forward validation before any public claim.
Do NOT bundle with this commit.
