-- User-scoped price alerts. Replaces file-backed data/price-alerts.json so
-- collectServerData(userId) returns the caller's own alerts instead of [].
--
-- Apply on Railway with:
--   railway connect Postgres
--   \i apps/web/migrations/014_user_scoped_price_alerts.sql

CREATE TABLE IF NOT EXISTS price_alerts (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol         TEXT NOT NULL,
  direction      TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  target_price   NUMERIC NOT NULL,
  current_price  NUMERIC NOT NULL,
  percent_move   NUMERIC,
  time_window    TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'triggered', 'expired')),
  triggered_at   TIMESTAMPTZ,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user   ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);

COMMENT ON TABLE price_alerts IS
  'Legacy single-price notifier (above/below a threshold). Distinct from alert_rules, which is the tier-gated dispatch engine.';
