-- 045_discord_posted_at.sql
-- Discord broadcast ledger for TradeClaw's own signals (issue #38).
-- Mirrors telegram_posted_at (003) so the env-keyed Discord broadcaster can
-- dedupe one post per (pair, direction) per 2h window across cron runs,
-- independently of the Telegram channel.

ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS discord_posted_at TIMESTAMPTZ;

-- Speeds up the "not yet posted to Discord" pending scan.
CREATE INDEX IF NOT EXISTS idx_signal_history_discord_pending
  ON signal_history (created_at)
  WHERE discord_posted_at IS NULL;
