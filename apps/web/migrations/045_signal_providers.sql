-- Multi-provider signal marketplace — trader profiles who can publish signals.
-- Providers can be verified ( TradeClaw team-reviewed ) or community-driven.

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
