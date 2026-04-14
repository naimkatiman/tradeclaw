-- Adds mode column to signal_history to distinguish scalp vs swing signals.
-- Mode is derived from timeframe at write time: M5/M15 → 'scalp', else → 'swing'.
-- Existing rows get NULL, which readers treat as 'swing' for back-compat.
ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS mode TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_history_mode
  ON signal_history (mode)
  WHERE mode IS NOT NULL;

-- Backfill deterministic labels so analytics queries don't need to re-derive
-- from timeframe. Idempotent — only touches rows that are still NULL.
UPDATE signal_history
   SET mode = CASE
     WHEN timeframe IN ('M5', 'M15') THEN 'scalp'
     ELSE 'swing'
   END
 WHERE mode IS NULL;
