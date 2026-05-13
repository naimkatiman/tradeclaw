-- Add exit_price to executions so we can record the weighted-average fill
-- price when a position closes. realized_pnl already exists from 018.
--
-- Apply on Railway:
--   psql "$DATABASE_URL" -f apps/web/migrations/031_executions_exit_price.sql
ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
