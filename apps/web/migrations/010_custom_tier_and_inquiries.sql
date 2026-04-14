-- Custom tier + contact-sales inquiries.
-- Relaxes users.tier check to include 'custom' (no-op if users table is absent)
-- and creates contact_sales_inquiries for custom-tier leads.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
    ALTER TABLE users
      ADD CONSTRAINT users_tier_check
      CHECK (tier IN ('free', 'pro', 'elite', 'custom'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contact_sales_inquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  telegram    VARCHAR(64)  NULL,
  company     VARCHAR(255) NULL,
  use_case    TEXT NOT NULL,
  budget      VARCHAR(64)  NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the FK to users only if the users table exists. The column stays nullable
-- either way so unauthenticated contact-sales submissions still work.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE table_schema='public'
         AND table_name='contact_sales_inquiries'
         AND constraint_name='contact_sales_inquiries_user_id_fkey'
     ) THEN
    ALTER TABLE contact_sales_inquiries
      ADD CONSTRAINT contact_sales_inquiries_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_sales_status_created
  ON contact_sales_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_sales_email
  ON contact_sales_inquiries(email);
