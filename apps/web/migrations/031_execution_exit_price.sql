-- Add exit_price to executions for realized-PnL backfill.
-- position-manager.ts fetches Binance userTrades on close and writes both
-- realized_pnl (already present from migration 018) and exit_price here.

ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
