-- Add exit_price to executions so the position manager can persist the
-- weighted-average fill price on close alongside realized_pnl.
-- realized_pnl already exists (migration 018); this column was deferred.
ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
