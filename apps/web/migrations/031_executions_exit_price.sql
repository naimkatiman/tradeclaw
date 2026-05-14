-- Add exit_price to executions for realized-PnL backfill.
-- Populated by position-manager.ts when it detects liveQty = 0 and
-- fetches the closing fills from Binance /fapi/v1/userTrades.

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24,12);
