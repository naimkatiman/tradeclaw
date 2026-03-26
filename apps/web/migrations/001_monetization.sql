-- TradeClaw Monetization Schema
-- Migration: 001_monetization
-- Run against your PostgreSQL database.

-- ---------------------------------------------------------------------------
-- Extend existing users table
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_user_id);

-- ---------------------------------------------------------------------------
-- Subscriptions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id     VARCHAR(255) NOT NULL,
  tier                   VARCHAR(10) NOT NULL CHECK (tier IN ('pro', 'elite')),
  status                 VARCHAR(20) NOT NULL
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start   TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end     TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- API keys table (Elite tier only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash     VARCHAR(255) NOT NULL,        -- SHA-256 of the actual key
  key_prefix   VARCHAR(12)  NOT NULL,        -- e.g. "tc_live_abc1" for display
  name         VARCHAR(100),
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  rate_limit   INT NOT NULL DEFAULT 100,     -- req/min
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ---------------------------------------------------------------------------
-- Telegram invites table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telegram_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier             VARCHAR(10) NOT NULL CHECK (tier IN ('pro', 'elite')),
  invite_link      VARCHAR(255) NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_invites_user ON telegram_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_invites_active ON telegram_invites(user_id, is_active);
