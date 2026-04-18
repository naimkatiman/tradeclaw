-- Persist real ATR telemetry on every signal so the per-symbol calibration
-- engine can grid-search against observed adverse excursion instead of
-- the stop-distance approximation used until now.
--
-- All columns nullable + additive. Old rows stay NULL; the calibration cache
-- shim falls back to the legacy approximation when these are absent.
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/012_atr_telemetry.sql

ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS entry_atr             NUMERIC,
  ADD COLUMN IF NOT EXISTS atr_multiplier        NUMERIC,
  ADD COLUMN IF NOT EXISTS max_adverse_excursion NUMERIC;

COMMENT ON COLUMN signal_history.entry_atr IS
  'ATR value in price units at the moment the signal was emitted. Lets calibration scale stops by symbol volatility without re-fetching candles.';
COMMENT ON COLUMN signal_history.atr_multiplier IS
  'ATR multiplier actually used to size the stop at signal time. May differ from the current cached value if calibration has since refreshed.';
COMMENT ON COLUMN signal_history.max_adverse_excursion IS
  'Maximum adverse price movement from entry up to and including the resolution candle (TP hit, SL hit, or window end). In price units, always >= 0.';
