-- Pro-tier reply threading.
--
-- The free public channel already has reply threading: signal_history.
-- telegram_message_id stores the Telegram message_id of the original
-- signal post, and the position-monitor cron replies to it on TP/SL hits.
--
-- The Pro group post needs its own message_id column — using the same
-- field would collide with the free-channel push (different chat_ids,
-- different message_id namespaces), and the cron's outcome reply would
-- fire against the wrong chat.

ALTER TABLE signal_history
  ADD COLUMN IF NOT EXISTS telegram_pro_message_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_signal_history_pro_msg
  ON signal_history(telegram_pro_message_id)
  WHERE telegram_pro_message_id IS NOT NULL;
