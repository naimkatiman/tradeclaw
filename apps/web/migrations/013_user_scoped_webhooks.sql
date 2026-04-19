-- User-scoped webhooks. Replaces the file-backed data/webhooks.json so
-- collectServerData(userId) can return the caller's own webhooks instead of [].
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/013_user_scoped_webhooks.sql

CREATE TABLE IF NOT EXISTS webhooks (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT '',
  url              TEXT NOT NULL,
  secret           TEXT,
  pairs            JSONB NOT NULL DEFAULT '"all"'::jsonb,
  min_confidence   SMALLINT NOT NULL DEFAULT 0
                     CHECK (min_confidence BETWEEN 0 AND 100),
  enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_count   INTEGER NOT NULL DEFAULT 0,
  fail_count       INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user    ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = TRUE;

COMMENT ON COLUMN webhooks.pairs IS
  'Either the JSON string "all" or a JSON array of symbol strings.';
COMMENT ON COLUMN webhooks.fail_count IS
  'Consecutive failures since last success. Reset to 0 on any successful delivery.';

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id               BIGSERIAL PRIMARY KEY,
  webhook_id       TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_code      INTEGER,
  success          BOOLEAN NOT NULL,
  attempt          INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  error            TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_whid_ts
  ON webhook_deliveries(webhook_id, timestamp DESC);
