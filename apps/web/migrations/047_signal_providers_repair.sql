-- Repair: 045_signal_providers.sql is recorded as applied in prod (run-migrations.mjs
-- keys on filename) but the signal_providers table was never created — _migrations
-- drift — causing /api/marketplace/providers to 500 with
-- 'relation "signal_providers" does not exist'. Re-apply under a fresh filename so
-- the runner picks it up. Idempotent (IF NOT EXISTS): a no-op where the table exists.

CREATE TABLE IF NOT EXISTS signal_providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(64) UNIQUE NOT NULL,
  name        VARCHAR(128) NOT NULL,
  bio         TEXT,
  website     VARCHAR(256),
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_providers_verified
  ON signal_providers(verified, created_at DESC);
