-- Phase 2 of docs/plans/2026-07-07-free-open-source-transparency-pivot.md:
-- drop all monetization tables/columns. Phase 0 data exports MUST exist
-- before running this in production — these drops are irreversible.
--
-- Forward-only and idempotent (IF EXISTS everywhere). Deliberately NOT
-- dropped: processed_stripe_events (the EarningsEdge webhook still writes
-- ee:-prefixed rows), premium_signals, ee_users, ee_analyses.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS referral_revenue;
DROP TABLE IF EXISTS referral_rewards;
DROP TABLE IF EXISTS telegram_invites;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS pro_email_grants;
DROP TABLE IF EXISTS contact_sales_inquiries;
DROP TABLE IF EXISTS elite_interest;
-- No live reader (verified 2026-07-08: only migration 009 references it).
DROP TABLE IF EXISTS telegram_strategy_channels;

-- ---------------------------------------------------------------------------
-- users — tier / billing / referral columns
-- (index names from migrations 001 and 043)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_users_stripe_customer;
DROP INDEX IF EXISTS idx_users_referral_code;

ALTER TABLE users DROP COLUMN IF EXISTS tier;
ALTER TABLE users DROP COLUMN IF EXISTS tier_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by;

-- ---------------------------------------------------------------------------
-- signal_history — Pro-group reply threading id (free-channel
-- telegram_message_id stays). Index name from migration 024.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_signal_history_pro_msg;

ALTER TABLE signal_history DROP COLUMN IF EXISTS telegram_pro_message_id;

-- ---------------------------------------------------------------------------
-- users.auth_provider — allow 'telegram'. Migration 027 created the CHECK
-- with ('google','github') only, but lib/db.ts upsertTelegramUser inserts
-- 'telegram'; fresh installs 500 on first Telegram sign-in without this.
-- Constraint name is the auto-generated users_auth_provider_check.
-- ---------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check
  CHECK (auth_provider IN ('google', 'github', 'telegram'));
