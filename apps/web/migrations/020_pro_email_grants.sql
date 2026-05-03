-- DB-backed Pro tier grants for emails outside the Stripe billing path.
--
-- Background: previously the only out-of-band Pro grant mechanism was the
-- PRO_EMAILS env var on Railway, which required a redeploy to add a single
-- email. This table lets admins grant Pro from the admin dashboard without
-- a deploy. The env var still works for bootstrap/owner emails.
--
-- Resolution order in tier.ts:
--   1. Active Stripe subscription (canonical)
--   2. Email in PRO_EMAILS env (bootstrap, no redeploy needed for owner)
--   3. Active row in this table (admin-granted)
--   4. Otherwise: free
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/020_pro_email_grants.sql

CREATE TABLE IF NOT EXISTS pro_email_grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  granted_by  VARCHAR(255) NOT NULL,
  note        TEXT,
  expires_at  TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ NULL,
  revoked_by  VARCHAR(255) NULL
);

-- Active grants are looked up by lowercased email on every getUserTier()
-- call (cached 60s in process). Index only the active subset.
CREATE INDEX IF NOT EXISTS idx_pro_email_grants_active_email
  ON pro_email_grants (LOWER(email))
  WHERE revoked_at IS NULL;

-- Ordering for the admin list view.
CREATE INDEX IF NOT EXISTS idx_pro_email_grants_created_at
  ON pro_email_grants (created_at DESC);
