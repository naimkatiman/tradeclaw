-- Signal history: persistent record of every published signal + outcomes.
-- Replaces file-based data/signal-history.json which was lost on every deploy.

CREATE TABLE IF NOT EXISTS signal_history (
  id              TEXT PRIMARY KEY,
  pair            TEXT NOT NULL,
  timeframe       TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  confidence      NUMERIC NOT NULL,
  entry_price     NUMERIC NOT NULL,
  tp1             NUMERIC,
  sl              NUMERIC,
  is_simulated    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Outcome tracking (TP/SL hit within 4h and 24h windows)
  outcome_4h      JSONB,   -- { "price": number, "pnlPct": number, "hit": boolean } | null
  outcome_24h     JSONB,   -- same shape

  -- Telegram sync: when the signal was actually posted to the channel
  telegram_posted_at  TIMESTAMPTZ,
  telegram_message_id BIGINT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- when signal was generated
  last_verified   TIMESTAMPTZ                          -- when outcomes were last resolved
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_signal_history_pair      ON signal_history (pair);
CREATE INDEX IF NOT EXISTS idx_signal_history_created   ON signal_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_history_pending   ON signal_history (pair, direction)
  WHERE outcome_24h IS NULL AND is_simulated = FALSE;

-- Dedup: same symbol + direction within a short window
CREATE INDEX IF NOT EXISTS idx_signal_history_dedup
  ON signal_history (pair, direction, created_at DESC);
