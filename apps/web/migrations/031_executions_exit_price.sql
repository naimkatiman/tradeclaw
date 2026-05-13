-- Add exit_price to executions for realized-PnL backfill.
-- Plan: continuation prompt §Phase 1 — Realized PnL backfill.
--
-- realized_pnl already exists (migration 018); exit_price was omitted.
-- Position manager uses this for R-multiple calculation in reconciliation.

ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
