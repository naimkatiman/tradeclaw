-- Add exit_price to executions so position-manager can record the actual fill
-- price when a position closes (used for realized PnL reconciliation).
ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
