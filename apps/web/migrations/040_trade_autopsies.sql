CREATE TABLE IF NOT EXISTS trade_autopsies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade_journal(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(trade_id)
);
CREATE INDEX IF NOT EXISTS idx_trade_autopsies_user ON trade_autopsies (user_id, created_at DESC);
