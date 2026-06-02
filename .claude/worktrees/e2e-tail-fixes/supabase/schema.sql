-- ============================================================================
-- TradeClaw — Supabase (PostgreSQL) Schema
-- Run this in your Supabase SQL Editor to create all tables.
-- Source interfaces: apps/web/lib/*.ts
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. API Keys  (lib/api-keys.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  created_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  last_used_at  BIGINT,
  request_count INTEGER NOT NULL DEFAULT 0,
  rate_limit    INTEGER NOT NULL DEFAULT 100,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  active        BOOLEAN NOT NULL DEFAULT true,
  tier          TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro'))
);

CREATE TABLE IF NOT EXISTS api_key_usage (
  key           TEXT NOT NULL REFERENCES api_keys(key) ON DELETE CASCADE,
  count         INTEGER NOT NULL DEFAULT 0,
  window_start  BIGINT NOT NULL,
  PRIMARY KEY (key, window_start)
);

-- ---------------------------------------------------------------------------
-- 2. User Wall  (lib/user-wall.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  use_case    TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Signal History  (lib/signal-history.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signal_history (
  id              TEXT PRIMARY KEY,
  pair            TEXT NOT NULL,
  timeframe       TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  confidence      NUMERIC NOT NULL,
  entry_price     NUMERIC NOT NULL,
  timestamp       BIGINT NOT NULL,
  tp1             NUMERIC,
  sl              NUMERIC,
  is_simulated    BOOLEAN DEFAULT false,
  last_verified   BIGINT,
  outcomes        JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_signal_history_pair ON signal_history(pair);
CREATE INDEX IF NOT EXISTS idx_signal_history_timestamp ON signal_history(timestamp DESC);

-- ---------------------------------------------------------------------------
-- 4. Paper Trading  (lib/paper-trading.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_portfolio_meta (
  id                SERIAL PRIMARY KEY,
  balance           NUMERIC NOT NULL DEFAULT 10000,
  starting_balance  NUMERIC NOT NULL DEFAULT 10000
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id          TEXT PRIMARY KEY,
  symbol      TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  quantity    NUMERIC NOT NULL,
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  signal_id   TEXT,
  stop_loss   NUMERIC,
  take_profit NUMERIC
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id          TEXT PRIMARY KEY,
  symbol      TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  exit_price  NUMERIC NOT NULL,
  quantity    NUMERIC NOT NULL,
  pnl         NUMERIC NOT NULL DEFAULT 0,
  pnl_percent NUMERIC NOT NULL DEFAULT 0,
  opened_at   TIMESTAMPTZ NOT NULL,
  closed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  signal_id   TEXT,
  exit_reason TEXT NOT NULL DEFAULT 'manual' CHECK (exit_reason IN ('manual', 'stopLoss', 'takeProfit', 'reset'))
);

CREATE TABLE IF NOT EXISTS paper_equity (
  id        SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  equity    NUMERIC NOT NULL,
  balance   NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_equity_ts ON paper_equity(timestamp DESC);

-- ---------------------------------------------------------------------------
-- 5. Webhooks  (lib/webhooks.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhooks (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  secret          TEXT,
  pairs           JSONB NOT NULL DEFAULT '"all"'::JSONB,
  min_confidence  INTEGER NOT NULL DEFAULT 0,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_delivery   TIMESTAMPTZ,
  delivery_count  INTEGER NOT NULL DEFAULT 0,
  fail_count      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            SERIAL PRIMARY KEY,
  webhook_id    TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code   INTEGER,
  success       BOOLEAN NOT NULL DEFAULT false,
  attempt       INTEGER NOT NULL DEFAULT 1,
  response_time INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_wh ON webhook_deliveries(webhook_id);

-- ---------------------------------------------------------------------------
-- 6. Plugin System  (lib/plugin-system.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plugins (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version     TEXT NOT NULL DEFAULT '1.0.0',
  author      TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('trend', 'momentum', 'volatility', 'volume', 'custom')),
  code        TEXT NOT NULL DEFAULT '',
  params      JSONB NOT NULL DEFAULT '[]'::JSONB,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  updated_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
);

-- ---------------------------------------------------------------------------
-- 7. Price Alerts  (lib/price-alerts.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alerts (
  id            TEXT PRIMARY KEY,
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  target_price  NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 0,
  percent_move  NUMERIC,
  time_window   TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'expired')),
  triggered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_status ON price_alerts(status);

-- ---------------------------------------------------------------------------
-- 8. Waitlist  (lib/waitlist.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist (
  email         TEXT PRIMARY KEY,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by   TEXT,
  referral_count INTEGER NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. Email Subscribers  (lib/email-subscribers.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_subscribers (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  pairs           TEXT[] NOT NULL DEFAULT '{}',
  min_confidence  INTEGER NOT NULL DEFAULT 70,
  frequency       TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  active          BOOLEAN NOT NULL DEFAULT true,
  token           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);

-- ---------------------------------------------------------------------------
-- 10. Telegram Subscribers  (lib/telegram-subscribers.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telegram_subscribers (
  chat_id          TEXT PRIMARY KEY,
  username         TEXT,
  first_name       TEXT,
  subscribed_pairs JSONB NOT NULL DEFAULT '"all"'::JSONB,
  min_confidence   INTEGER NOT NULL DEFAULT 70,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. SMS Subscribers  (lib/sms-subscribers.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_subscribers (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE NOT NULL,
  pairs           TEXT[] NOT NULL DEFAULT '{}',
  min_confidence  INTEGER NOT NULL DEFAULT 70,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  active          BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- 12. Community Votes  (lib/votes.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  pair        TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL', 'HOLD')),
  week_start  TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pair, direction, week_start)
);

CREATE INDEX IF NOT EXISTS idx_votes_week ON votes(week_start);

-- ---------------------------------------------------------------------------
-- 13. Pledges  (lib/pledges.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pledges (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  milestone_stars INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 14. Performance Metrics  (lib/performance-metrics.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_metrics (
  id          SERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data        JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_performance_ts ON performance_metrics(recorded_at DESC);

-- ---------------------------------------------------------------------------
-- 15. TradingView Alerts  (lib/tradingview-alerts.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tradingview_alerts (
  id                TEXT PRIMARY KEY,
  symbol            TEXT NOT NULL,
  exchange          TEXT,
  interval          TEXT,
  action            TEXT NOT NULL,
  close             NUMERIC,
  volume            NUMERIC,
  message           TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  normalized_pair   TEXT NOT NULL,
  normalized_action TEXT NOT NULL CHECK (normalized_action IN ('BUY', 'SELL'))
);

CREATE INDEX IF NOT EXISTS idx_tv_alerts_pair ON tradingview_alerts(normalized_pair);

-- ---------------------------------------------------------------------------
-- 16. Push Subscriptions  (lib/push-subscriptions.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        TEXT PRIMARY KEY,
  endpoint  TEXT UNIQUE NOT NULL,
  keys      JSONB NOT NULL DEFAULT '{}'::JSONB,
  prefs     JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 17. Slack Integrations  (lib/slack-integration.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slack_integrations (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  webhook_url     TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT '#trading-signals',
  pairs           JSONB NOT NULL DEFAULT '"all"'::JSONB,
  min_confidence  INTEGER NOT NULL DEFAULT 70,
  direction       TEXT NOT NULL DEFAULT 'ALL' CHECK (direction IN ('ALL', 'BUY', 'SELL')),
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_delivery   TIMESTAMPTZ,
  delivery_count  INTEGER NOT NULL DEFAULT 0,
  fail_count      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS slack_deliveries (
  id              SERIAL PRIMARY KEY,
  integration_id  TEXT NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code     INTEGER,
  success         BOOLEAN NOT NULL DEFAULT false,
  attempt         INTEGER NOT NULL DEFAULT 1,
  response_time   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

-- ---------------------------------------------------------------------------
-- 18. Telegram Broadcast State  (lib/telegram-broadcast.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS broadcast_state (
  id                  SERIAL PRIMARY KEY,
  last_broadcast_time TIMESTAMPTZ,
  last_message_id     INTEGER,
  last_error          TEXT,
  broadcast_count     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 19. App Users & Subscriptions  (lib/db.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email               TEXT UNIQUE NOT NULL,
  stripe_customer_id  TEXT,
  tier                TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  tier_expires_at     TIMESTAMPTZ,
  telegram_user_id    BIGINT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id                 TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT NOT NULL,
  tier                    TEXT NOT NULL CHECK (tier IN ('pro', 'elite')),
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_invites (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id           TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tier              TEXT NOT NULL CHECK (tier IN ('pro', 'elite')),
  invite_link       TEXT NOT NULL,
  telegram_chat_id  BIGINT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_invites_user ON telegram_invites(user_id);

-- ============================================================================
-- Row Level Security (RLS)
-- Uncomment and customize these policies for multi-tenant deployments.
-- ============================================================================
-- ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read" ON signal_history FOR SELECT USING (true);
-- CREATE POLICY "Service insert" ON signal_history FOR INSERT WITH CHECK (auth.role() = 'service_role');
