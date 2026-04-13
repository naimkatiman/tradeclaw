-- Premium strategy licenses (v1: admin-issued, no billing)
-- See docs/superpowers/specs/2026-04-14-premium-strategy-licenses-design.md

CREATE TABLE IF NOT EXISTS strategy_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash     VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 hex of plaintext key
  key_prefix   VARCHAR(16) NOT NULL,          -- first 12 chars of plaintext, for display
  issued_to    VARCHAR(255),                  -- free-text label (customer, note)
  status       VARCHAR(16) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'revoked')),
  expires_at   TIMESTAMPTZ,                   -- NULL = lifetime
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_strategy_licenses_created_at
  ON strategy_licenses(created_at DESC);

CREATE TABLE IF NOT EXISTS strategy_license_grants (
  license_id   UUID NOT NULL REFERENCES strategy_licenses(id) ON DELETE CASCADE,
  strategy_id  VARCHAR(64) NOT NULL,          -- matches signal_history.strategy_id
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (license_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_license_grants_strategy
  ON strategy_license_grants(strategy_id);
