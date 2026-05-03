-- Trial reminder support for the subscriptions table.
--
-- Background: a 7-day Stripe trial converts silently to a paid charge. To send
-- a "trial ends tomorrow" email, the cron needs to know which subscriptions
-- are inside the T-1d window — and an idempotency flag so a daily-overlap or
-- replay doesn't double-email the customer.
--
-- - trial_end:                Mirror of subscription.trial_end from Stripe.
--                             Populated on checkout.session.completed and
--                             customer.subscription.updated. Null when the
--                             subscription has no trial (e.g. canceled or
--                             post-conversion).
-- - trial_reminder_sent_at:   Set by /api/cron/trial-reminders when the T-1d
--                             email is sent. Cron predicates on this being
--                             null so retries within the window are no-ops.
--
-- Both columns are nullable. No backfill — the cron does on-the-fly
-- backfill for existing trialing rows by hitting the Stripe API.
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/023_subscription_trial_columns.sql

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_end              TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMP WITH TIME ZONE NULL;

-- Cron query path: status + trial_end window. Partial index keeps the
-- index small (only trialing rows that haven't been emailed yet).
CREATE INDEX IF NOT EXISTS idx_subscriptions_trialing_due
  ON subscriptions (trial_end)
  WHERE status = 'trialing' AND trial_reminder_sent_at IS NULL;
