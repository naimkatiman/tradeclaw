-- Per-strategy Telegram channels. Admin populates one row per strategy_id
-- with the public invite URL. /unlock renders one join button per channel
-- the caller's license grants.

CREATE TABLE IF NOT EXISTS telegram_strategy_channels (
  strategy_id VARCHAR(64) PRIMARY KEY,
  chat_id     VARCHAR(64),
  invite_url  TEXT NOT NULL,
  label       VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
