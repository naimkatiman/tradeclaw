-- User-scoped paper trading. Splits the single data/paper-trading.json file
-- into three tables, each keyed by user_id. Fixes the multi-tenant leak where
-- every user's positions/balance appeared in every other user's view.
--
-- Apply on Railway with:
--   railway connect Postgres
--   \i apps/web/migrations/015_user_scoped_paper_trading.sql

-- Portfolio header: one row per user. balance + starting_balance + stats +
-- equity_curve. Auto-created on first getPortfolio(userId) call.
CREATE TABLE IF NOT EXISTS paper_portfolios (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance           NUMERIC NOT NULL DEFAULT 10000,
  starting_balance  NUMERIC NOT NULL DEFAULT 10000,
  equity_curve      JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Open positions awaiting close.
CREATE TABLE IF NOT EXISTS paper_positions (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price   NUMERIC NOT NULL,
  quantity      NUMERIC NOT NULL,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signal_id     TEXT,
  stop_loss     NUMERIC,
  take_profit   NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_paper_positions_user   ON paper_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_symbol ON paper_positions(symbol);

-- Closed positions, newest first. Feeds stats + equity curve.
CREATE TABLE IF NOT EXISTS paper_trades (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price   NUMERIC NOT NULL,
  exit_price    NUMERIC NOT NULL,
  quantity      NUMERIC NOT NULL,
  pnl           NUMERIC NOT NULL,
  pnl_percent   NUMERIC NOT NULL,
  opened_at     TIMESTAMPTZ NOT NULL,
  closed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signal_id     TEXT,
  exit_reason   TEXT NOT NULL CHECK (exit_reason IN ('manual', 'stopLoss', 'takeProfit', 'reset'))
);

CREATE INDEX IF NOT EXISTS idx_paper_trades_user_closed ON paper_trades(user_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_trades_signal     ON paper_trades(signal_id) WHERE signal_id IS NOT NULL;

COMMENT ON TABLE paper_portfolios IS
  'One row per user — balance, starting balance, stats snapshot, equity curve (JSONB array of {timestamp, equity, balance}).';
COMMENT ON TABLE paper_positions IS
  'Open paper-trading positions. Row is moved to paper_trades on close.';
