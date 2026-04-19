-- Telegram subscribers persisted to Postgres. Replaces data/telegram-subscribers.json,
-- which is lost on every Railway deploy (ephemeral filesystem).
--
-- Note: no user_id column. Subscribers come in via @tradeclawbot /start before
-- they have a web account. The table is deliberately Telegram-first. When
-- web↔Telegram linking becomes a feature, add a nullable user_id here.
--
-- Apply on Railway with:
--   railway connect Postgres
--   \i apps/web/migrations/016_telegram_subscribers.sql

CREATE TABLE IF NOT EXISTS telegram_subscribers (
  chat_id           TEXT PRIMARY KEY,
  username          TEXT,
  first_name        TEXT,
  subscribed_pairs  JSONB NOT NULL DEFAULT '"all"'::jsonb,
  min_confidence    SMALLINT NOT NULL DEFAULT 70
                      CHECK (min_confidence BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN telegram_subscribers.subscribed_pairs IS
  'Either the JSON string "all" or a JSON array of symbol strings.';
