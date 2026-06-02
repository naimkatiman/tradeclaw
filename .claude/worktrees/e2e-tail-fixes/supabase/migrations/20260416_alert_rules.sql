-- supabase/migrations/20260416_alert_rules.sql

-- Channel credentials per user (one row per channel type)
CREATE TABLE IF NOT EXISTS user_channel_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('telegram', 'discord', 'email', 'webhook')),
  config      JSONB NOT NULL DEFAULT '{}',
  -- telegram: { botToken, chatId }
  -- discord:  { webhookUrl }
  -- email:    { address }
  -- webhook:  { url }
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

-- Alert rules: what to match, which channels to notify
CREATE TABLE IF NOT EXISTS user_alert_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL,
  symbol          TEXT,            -- NULL = all symbols
  timeframe       TEXT,            -- NULL = all timeframes
  direction       TEXT CHECK (direction IN ('BUY', 'SELL', NULL)),
  min_confidence  INTEGER NOT NULL DEFAULT 70,
  channels        TEXT[] NOT NULL DEFAULT '{}',
  -- array of channel names: 'telegram', 'discord', 'email', 'webhook'
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON user_alert_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_channel_configs_user ON user_channel_configs (user_id);
