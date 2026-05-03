-- Drop the unused live_signals table.
--
-- Status as of 2026-05-02:
--  * Table has been empty in production since /api/cron/signals was rewired
--    to bypass it and call getSignals() directly.
--  * All TS callers were removed in the preceding commit
--    (refactor(signals): remove live_signals dependencies in TS layer).
--  * No Pilot, telegram, or external service writes to it.
--
-- Verify before running on a fresh DB by grep-ing the working tree:
--    rg "live_signals" apps/ packages/ scripts/
-- Should return only this migration file and the original 002_live_signals.sql.
--
-- Apply on Railway with:
--    psql "$DATABASE_URL" -f apps/web/migrations/021_drop_live_signals.sql
-- (or via the run-migrations.mjs runner on the next next-start cycle).

DROP INDEX IF EXISTS idx_live_signals_dedup;
DROP INDEX IF EXISTS idx_live_signals_active;
DROP INDEX IF EXISTS idx_live_signals_created;
DROP INDEX IF EXISTS idx_live_signals_symbol;
DROP TABLE IF EXISTS live_signals;
