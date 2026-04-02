-- ============================================================================
-- TradeClaw — Seed Data for Supabase
-- Run after schema.sql to populate demo data.
-- All INSERTs use ON CONFLICT DO NOTHING for idempotency.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- API Keys (3 demo keys — revoked so they cannot be used in production)
-- ---------------------------------------------------------------------------
INSERT INTO api_keys (id, key, name, email, description, scopes, created_at, last_used_at, request_count, rate_limit, status, active, tier)
VALUES
  ('demo-1', 'tc_live_demo1_00000000000000000000', 'Demo Key 1', 'demo@tradeclaw.win', 'Demo API key for documentation', ARRAY['signals', 'leaderboard', 'screener'], 1700000000000, NULL, 0, 100, 'revoked', false, 'free'),
  ('demo-2', 'tc_live_demo2_00000000000000000000', 'Demo Key 2', 'demo@tradeclaw.win', 'Demo API key for testing', ARRAY['signals'], 1700000000000, NULL, 0, 100, 'revoked', false, 'free'),
  ('demo-3', 'tc_live_demo3_00000000000000000000', 'Pro Demo Key', 'pro@tradeclaw.win', 'Demo pro-tier API key', ARRAY['signals', 'leaderboard', 'screener'], 1700000000000, NULL, 0, 1000, 'revoked', false, 'pro')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Email Subscribers (8 seed subscribers)
-- ---------------------------------------------------------------------------
INSERT INTO email_subscribers (id, email, pairs, min_confidence, frequency, created_at, active, token)
VALUES
  ('es-1', 'alice@example.com', ARRAY['BTCUSD', 'ETHUSD'], 70, 'daily', now(), true, 'tok_alice'),
  ('es-2', 'bob@trader.io', ARRAY['XAUUSD', 'EURUSD'], 75, 'daily', now(), true, 'tok_bob'),
  ('es-3', 'carol@signals.dev', ARRAY['BTCUSD', 'XAUUSD', 'GBPUSD'], 60, 'weekly', now(), true, 'tok_carol'),
  ('es-4', 'diana@forexlab.com', ARRAY['EURUSD', 'USDJPY', 'GBPUSD'], 80, 'daily', now(), true, 'tok_diana'),
  ('es-5', 'evan@cryptoalerts.net', ARRAY['BTCUSD', 'ETHUSD', 'XRPUSD'], 65, 'daily', now(), true, 'tok_evan'),
  ('es-6', 'fatima@goldtrader.com', ARRAY['XAUUSD', 'XAGUSD'], 70, 'weekly', now(), true, 'tok_fatima'),
  ('es-7', 'george@swingfx.io', ARRAY['EURUSD', 'GBPUSD', 'AUDUSD'], 75, 'daily', now(), true, 'tok_george'),
  ('es-8', 'hana@defiwatch.xyz', ARRAY['BTCUSD', 'ETHUSD'], 60, 'daily', now(), true, 'tok_hana')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SMS Subscribers (3 seed subscribers)
-- ---------------------------------------------------------------------------
INSERT INTO sms_subscribers (id, phone, pairs, min_confidence, created_at, active)
VALUES
  ('sms-1', '+14155551234', ARRAY['BTCUSD', 'XAUUSD'], 75, now(), true),
  ('sms-2', '+447700900123', ARRAY['EURUSD', 'GBPUSD'], 70, now(), true),
  ('sms-3', '+61412345678', ARRAY['XAUUSD', 'AUDUSD'], 80, now(), true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Pledges (8 seed pledges matching lib/pledges.ts)
-- ---------------------------------------------------------------------------
INSERT INTO pledges (id, name, email, milestone_stars, created_at)
VALUES
  ('p-1', 'Alex Chen', 'alex@example.com', 100, now()),
  ('p-2', 'Sarah Kim', 'sarah@example.com', 250, now()),
  ('p-3', 'Marcus Rivera', 'marcus@example.com', 500, now()),
  ('p-4', 'Yuki Tanaka', 'yuki@example.com', 100, now()),
  ('p-5', 'Priya Sharma', 'priya@example.com', 1000, now()),
  ('p-6', 'David Mueller', 'david@example.com', 250, now()),
  ('p-7', 'Fatima Al-Rashid', 'fatima@example.com', 500, now()),
  ('p-8', 'Joao Santos', 'joao@example.com', 100, now())
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- User Wall (5 demo users)
-- ---------------------------------------------------------------------------
INSERT INTO users (id, name, use_case, country, created_at)
VALUES
  ('u-1', 'CryptoTrader99', 'Swing trading BTC and ETH', 'US', now()),
  ('u-2', 'GoldBugSara', 'Gold and silver alerts', 'UK', now()),
  ('u-3', 'ForexPilot', 'Forex day trading signals', 'SG', now()),
  ('u-4', 'AlgoBuilder', 'Building automated strategies', 'DE', now()),
  ('u-5', 'RetailInvestor', 'Learning technical analysis', 'MY', now())
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Votes (initial pair votes for current week)
-- ---------------------------------------------------------------------------
INSERT INTO votes (pair, direction, week_start, count)
VALUES
  ('BTCUSD', 'BUY', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 12),
  ('BTCUSD', 'SELL', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 5),
  ('BTCUSD', 'HOLD', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 3),
  ('ETHUSD', 'BUY', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 8),
  ('ETHUSD', 'SELL', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 6),
  ('ETHUSD', 'HOLD', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 4),
  ('XAUUSD', 'BUY', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 15),
  ('XAUUSD', 'SELL', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 3),
  ('XAUUSD', 'HOLD', to_char(date_trunc('week', now()), 'YYYY-MM-DD'), 2)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Paper Trading Portfolio Meta (starting balance)
-- ---------------------------------------------------------------------------
INSERT INTO paper_portfolio_meta (balance, starting_balance) VALUES (10000, 10000)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Broadcast State (initial state)
-- ---------------------------------------------------------------------------
INSERT INTO broadcast_state (last_broadcast_time, last_message_id, last_error, broadcast_count)
VALUES (NULL, NULL, NULL, 0)
ON CONFLICT DO NOTHING;
