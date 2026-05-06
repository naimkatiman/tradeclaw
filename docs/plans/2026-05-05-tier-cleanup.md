# Plan — Tier Cleanup (F-014, F-015, F-017)

**Date:** 2026-05-05
**Owner:** engineering
**Source audit:** `docs/audits/2026-05-05-free-vs-pro.md` §7
**Coverage audit:** `docs/audits/2026-05-05-plans-free-vs-pro-coverage.md` Recommendation 6

Picks up the Phase D **Deferred** items from
`docs/plans/2026-05-01-monetization-consolidation.md` that were not converted
into action when authored.

## Tasks

### Task 1 — F-014: stale JSDoc on `PRO_STRATEGIES`

**File:** `apps/web/lib/tier.ts`

The block above `const PRO_STRATEGIES` references the deleted `./licenses`
module and a "cross-check test in `tier.test.ts`" that does not exist. Trim
it to the truth: `PRO_STRATEGIES` is the single source of truth.

**Acceptance:**
```bash
grep -n "licenses\|cross-check" apps/web/lib/tier.ts
```
Should return zero matches in the JSDoc block above `PRO_STRATEGIES`.

### Task 2 — F-017: `PRO_STRATEGIES` regression test

**File:** `apps/web/lib/__tests__/tier.test.ts`

Add a test that pins the membership of `PRO_STRATEGIES` (via
`getStrategiesForTier('pro')`) so accidental edits to the set are caught.
Also assert that `getStrategiesForTier('free')` returns exactly `{classic}`.

**Acceptance:**
```bash
grep -c "getStrategiesForTier\|PRO_STRATEGIES" apps/web/lib/__tests__/tier.test.ts
```
Should be ≥ 2 (was 0 at audit time).

### Task 3 — F-015: apply `021_drop_live_signals.sql` to prod

**File:** existing `apps/web/migrations/021_drop_live_signals.sql`

The migration file exists; per workspace `CLAUDE.md` it was never applied to
Railway prod Postgres. This is a one-shot DB action gated on user sign-off.

**Acceptance:**
```sql
-- Run on Railway prod:
SELECT to_regclass('public.live_signals');
-- Should return NULL after migration is applied.
```

**Gate:** explicit `proceed live_signals drop` confirmation from Zaky before
running. Migration body is idempotent (`DROP TABLE IF EXISTS`).

## Out of scope (covered elsewhere)

- F-001..F-005 → `docs/plans/2026-05-05-fix-now-free-vs-pro.md`.
- Phase E license tables → `docs/plans/2026-05-01-monetization-consolidation.md`
  Phase E status footer + `apps/web/migrations/025_drop_license_tables.sql`.
- F-009, F-016 reconcile → `docs/plans/2026-05-02-pro-paywall-hardening.md`
  (Task 1 amended).
- F-010..F-013 `?from=` attribution → tracked as a one-line item; no plan.

## Verification (single batch)

```bash
grep -n "licenses\|cross-check" apps/web/lib/tier.ts
grep -c "getStrategiesForTier\|PRO_STRATEGIES" apps/web/lib/__tests__/tier.test.ts
test -f apps/web/migrations/021_drop_live_signals.sql && echo "migration present"
```
