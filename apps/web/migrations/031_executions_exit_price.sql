-- Add exit_price column to executions for closed-position PnL reconciliation.
-- realized_pnl was already present in 018; this companion column lets the
-- 30-day reconciliation query compute realized_R without re-fetching Binance
-- trade history.
ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
