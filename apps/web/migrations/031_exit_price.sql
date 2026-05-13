-- Add exit_price column to executions for Phase 1 realized-PnL backfill.
-- realized_pnl already exists (migration 018); this companion column lets
-- callers reconstruct the exact fill price without re-querying Binance.

ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
