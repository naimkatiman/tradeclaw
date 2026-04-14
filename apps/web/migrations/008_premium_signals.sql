-- Premium signals — populated by TradingView webhook ingest.
-- Merged into the read path for callers whose license grants the strategy_id.

CREATE TABLE IF NOT EXISTS premium_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     VARCHAR(128) UNIQUE,
  strategy_id   VARCHAR(64)  NOT NULL,
  symbol        VARCHAR(32)  NOT NULL,
  timeframe     VARCHAR(8)   NOT NULL,
  direction     VARCHAR(8)   NOT NULL CHECK (direction IN ('BUY','SELL')),
  confidence    NUMERIC(5,2) NOT NULL DEFAULT 90,
  entry         NUMERIC(18,8) NOT NULL,
  stop_loss     NUMERIC(18,8),
  take_profit_1 NUMERIC(18,8),
  take_profit_2 NUMERIC(18,8),
  raw_payload   JSONB NOT NULL,
  signal_ts     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_signals_strategy_ts
  ON premium_signals(strategy_id, signal_ts DESC);
CREATE INDEX IF NOT EXISTS idx_premium_signals_symbol_ts
  ON premium_signals(symbol, signal_ts DESC);
