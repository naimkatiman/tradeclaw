# Wire Live Volatility into the Allocator (2026-07-18)

## Defect

`computeAllocation` accepts a `currentVol` 4th parameter and
`computeVolatilityScaler` exists precisely to shrink size when volatility is
elevated — but no production call site ever passes it.
`apps/web/lib/risk-pipeline.ts:171` calls with three arguments, so the vol
scaler is permanently 1.0 and the allocator's "keep risk constant across
market conditions" contract is dead. Found during the 2026-07-18 allocation
audit; confirmed at source level (zero call sites of
`computeVolatilityScaler` outside the allocator and its tests).

## Fix (one concern: vol reaches the allocator; three layers, minimal)

1. `regime-writer.ts` — the hourly writer already holds up to 400 H1 bars per
   symbol at classification time. Compute a daily-equivalent realized vol
   (std of trailing hourly log returns over up to 480 bars, scaled by
   sqrt(24)) and store it as `vol20d` inside the `features` JSONB it already
   writes. At 400 stored bars the window is ~16.6 days — an approximation of
   the allocator's "approximate 20-day rolling vol" contract, noted in code.
2. `regime-filter.ts` — new `fetchRegimeVolMap()` reading
   `features->>'vol20d'` from the latest `market_regimes` row per symbol.
   Same fail-safe shape as `fetchRegimeMap`: empty map on any error.
3. `risk-pipeline.ts` — fetch the vol map once per run and pass
   `volMap.get(symbol)` as the 4th argument to `computeAllocation`.

Rollout is graceful: until the writer has produced one post-deploy row per
symbol, the map is empty, `currentVol` is undefined, and the scaler stays
1.0 — exactly today's behavior. No schema change (JSONB), no signature change
to any exported function, no new DB round trip in the writer.

## Out of scope (logged, not done)

- Confidence calibration, tier-map coverage, correlation buckets — separate
  audit findings, separate concerns.
- Backfilling vol20d for historical rows — unnecessary; only the latest row
  per symbol is read.

## Verification

- TDD: new failing tests first —
  `__tests__/regime-writer.test.ts` (vol20d stored, value matches an
  independently computed expectation), `__tests__/regime-vol-map.test.ts`
  (parse/skip/fail-safe), `__tests__/risk-pipeline-vol-scaler.test.ts`
  (end-to-end with the REAL computeAllocation: elevated vol shrinks
  positionSizePct 12 -> 3; empty map leaves it at 12).
- Existing `risk-account-fail-closed.test.ts` updated: its regime-filter
  mock gains `fetchRegimeVolMap`, its computeAllocation assertion gains the
  explicit `undefined` 4th argument.
- Full `apps/web/lib/__tests__` jest suite green + project typecheck clean.
