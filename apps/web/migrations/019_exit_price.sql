-- Phase 1 PnL backfill — add exit_price to executions.
-- realized_pnl already exists (migration 018); this adds the companion
-- column so position-manager.ts can write both on close.
--
-- Safe to run on a live DB: ADD COLUMN IF NOT EXISTS is a metadata-only
-- operation on Postgres 9.6+ (no table rewrite, no lock beyond a brief
-- AccessExclusiveLock on the table header).

ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
