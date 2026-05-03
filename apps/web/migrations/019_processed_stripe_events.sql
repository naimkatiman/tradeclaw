-- Stripe webhook idempotency ledger.
--
-- Stripe will replay webhook events on retry, redelivery, and partner-tool
-- replays. Most of our handlers (DB upserts) are idempotent, but Telegram
-- side-effects in handleCheckoutCompleted (createChatInviteLink + sendMessage
-- + INSERT INTO telegram_invites) are NOT — duplicate deliveries would mint
-- multiple invite links and DM the user multiple times.
--
-- The route INSERTs into this table inside the handler. A unique-violation on
-- event_id short-circuits the handler with a 200 OK so Stripe stops retrying.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     VARCHAR(255) PRIMARY KEY,
  event_type   VARCHAR(64)  NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
  ON processed_stripe_events(processed_at DESC);
