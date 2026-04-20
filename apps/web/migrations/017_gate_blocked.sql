-- Persist gate decisions on signal_history so the engine can keep recording
-- every emitted signal even while TRADECLAW_GATE_MODE=active is dropping
-- trades. Separates "recorded" (track-record accuracy metric) from
-- "tradable" (what we actually paper-trade + show on /api/signals).
--
-- Additive + default FALSE → existing rows keep their current semantics.
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/017_gate_blocked.sql

ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS gate_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gate_reason  TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_history_gate_blocked
  ON signal_history(gate_blocked)
  WHERE gate_blocked = TRUE;

COMMENT ON COLUMN signal_history.gate_blocked IS
  'TRUE when the full-risk gate blocked this signal at emission. Blocked rows are excluded from the paper-trade equity curve and from the gate lookback, but count toward engine hit-rate stats.';
COMMENT ON COLUMN signal_history.gate_reason IS
  'Human-readable reason copied from GateState.reason (e.g. "streak_blocked: 3/3 consecutive losses (regime=neutral)"). NULL when gate_blocked is FALSE.';
