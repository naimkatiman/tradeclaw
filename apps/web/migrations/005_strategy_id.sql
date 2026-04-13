-- Adds strategy_id tag to signal_history so we can query by strategy preset.
-- Backfill: existing rows get NULL (treated as 'hmm-top3' by readers).
ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS strategy_id TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_history_strategy
  ON signal_history (strategy_id)
  WHERE strategy_id IS NOT NULL;
