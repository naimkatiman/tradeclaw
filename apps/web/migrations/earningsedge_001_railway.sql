-- EarningsEdge: Railway PostgreSQL migration
-- Run via: psql $EE_DATABASE_URL -f earningsedge_001_railway.sql

-- Users table
CREATE TABLE IF NOT EXISTS ee_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  analyses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ee_users_email_idx ON ee_users(email);
CREATE INDEX IF NOT EXISTS ee_users_stripe_customer_idx ON ee_users(stripe_customer_id);

-- Analysis history
CREATE TABLE IF NOT EXISTS ee_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ee_users(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  transcript_hash TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ee_analyses_user_id_idx ON ee_analyses(user_id);
CREATE INDEX IF NOT EXISTS ee_analyses_symbol_idx ON ee_analyses(symbol);
CREATE INDEX IF NOT EXISTS ee_analyses_created_idx ON ee_analyses(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ee_users_updated_at ON ee_users;
CREATE TRIGGER ee_users_updated_at
  BEFORE UPDATE ON ee_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ee_users IS 'EarningsEdge user accounts with subscription tiers';
COMMENT ON TABLE ee_analyses IS 'Earnings call analysis history per user';
