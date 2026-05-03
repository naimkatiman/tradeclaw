CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token_hash    TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_email   ON magic_link_tokens(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);

COMMENT ON TABLE magic_link_tokens IS 'One-time signin tokens. token_hash is sha256 hex; raw token is emailed but never stored.';
