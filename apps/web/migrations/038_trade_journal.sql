CREATE TABLE IF NOT EXISTS trade_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  position_size NUMERIC,
  pnl NUMERIC,
  pnl_percent NUMERIC,
  setup_type TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  screenshot_url TEXT,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user ON trade_journal (user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON trade_journal (user_id, symbol);
