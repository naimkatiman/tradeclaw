-- Drop the retired license-key tables.
--
-- Status as of 2026-05-05:
--   * Phase D (lib/licenses.ts removed, all callers migrated to plain fetch /
--     resolveAccessContext) is shipped and live in production.
--   * No code reads strategy_licenses or strategy_license_grants.
--   * No code writes either table.
--   * Stripe tier (resolveAccessContext) is the canonical access gate.
--
-- Verify before running on a fresh DB:
--   rg "strategy_license" apps/ packages/ scripts/
-- Should return only this file and the original 006_licenses.sql.
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/025_drop_license_tables.sql
-- (or via the run-migrations.mjs runner on the next next-start cycle).
--
-- *** DESTRUCTIVE — gated on explicit user sign-off ***
-- Do not auto-apply. See docs/plans/2026-05-01-monetization-consolidation.md
-- Task 7 (Phase E) for the three pre-flight gates.

DROP TABLE IF EXISTS strategy_license_grants;
DROP TABLE IF EXISTS strategy_licenses;
