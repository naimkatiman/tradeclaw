-- Live signals table: stores signals from both Python and TypeScript engines
CREATE TABLE IF NOT EXISTS live_signals (
  id              TEXT PRIMARY KEY,
  symbol          TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  confidence      NUMERIC NOT NULL,
  timeframe       TEXT NOT NULL,
  entry           NUMERIC NOT NULL,
  stop_loss       NUMERIC NOT NULL,
  tp1             NUMERIC NOT NULL,
  tp2             NUMERIC,
  tp3             NUMERIC,
  reasons         TEXT[] NOT NULL DEFAULT '{}',
  agreeing_timeframes TEXT[],
  confluence_score NUMERIC,
  indicators      JSONB NOT NULL DEFAULT '{}',
  source          TEXT NOT NULL DEFAULT 'real',
  data_quality    TEXT NOT NULL DEFAULT 'real',
  win_rate        JSONB,
  cross_validation JSONB,
  candle_status   TEXT,
  engine_version  TEXT,
  skill           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_live_signals_symbol ON live_signals (symbol);
CREATE INDEX IF NOT EXISTS idx_live_signals_created ON live_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_signals_active ON live_signals (symbol, timeframe, direction, created_at DESC);

-- Prevent exact duplicates from concurrent engine runs
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_signals_dedup
  ON live_signals (symbol, timeframe, direction, created_at);
