-- Per-strategy Telegram channels. Admin populates one row per strategy_id
-- with the bot's chat id. /unlock auto-invites premium users to each channel
-- their license grants.

CREATE TABLE IF NOT EXISTS telegram_strategy_channels (
  strategy_id VARCHAR(64) PRIMARY KEY,
  chat_id     VARCHAR(64) NOT NULL,
  label       VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- telegram_invites already exists from migration 001; add strategy_id so
-- invites can be scoped per strategy instead of per tier.
ALTER TABLE telegram_invites
  ADD COLUMN IF NOT EXISTS strategy_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_telegram_invites_strategy
  ON telegram_invites(strategy_id) WHERE strategy_id IS NOT NULL;
