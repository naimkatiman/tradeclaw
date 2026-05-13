-- Add exit_price to executions for realized-PnL backfill.
-- Phase 1: position-manager.ts populates this alongside realized_pnl
-- when it detects a position has closed on Binance (liveQty == 0).
ALTER TABLE executions ADD COLUMN IF NOT EXISTS exit_price NUMERIC(24, 12);
