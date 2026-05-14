-- Add exit_price column to executions for realized-PnL backfill.
-- Applied as part of Phase 1.1 — position manager now fetches the closing
-- fill price from Binance userTrades and stores it here alongside realized_pnl.
-- Idempotent — safe to re-run on an already-migrated DB.
--
-- Apply on Railway:
--   psql "$DATABASE_URL" -f apps/web/migrations/031_executions_exit_price.sql

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
