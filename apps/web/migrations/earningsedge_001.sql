-- EarningsEdge: users and analysis history
-- Run in Supabase SQL editor

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

-- RPC: increment analysis count
CREATE OR REPLACE FUNCTION increment_ee_analysis_count(user_id_arg UUID)
RETURNS void AS $$
BEGIN
  UPDATE ee_users
  SET analyses_count = analyses_count + 1,
      updated_at = now()
  WHERE id = user_id_arg;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (Supabase only — skip when auth schema is absent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    ALTER TABLE ee_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ee_analyses ENABLE ROW LEVEL SECURITY;

    EXECUTE $p$
      CREATE POLICY "service_role_all_ee_users" ON ee_users
        FOR ALL USING (auth.role() = 'service_role')
    $p$;
    EXECUTE $p$
      CREATE POLICY "service_role_all_ee_analyses" ON ee_analyses
        FOR ALL USING (auth.role() = 'service_role')
    $p$;
  END IF;
END
$$;
