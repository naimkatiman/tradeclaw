CREATE TABLE IF NOT EXISTS daily_signal_metrics (
  date DATE NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'H1',
  total_signals INT NOT NULL DEFAULT 0,
  wins_4h INT NOT NULL DEFAULT 0,
  losses_4h INT NOT NULL DEFAULT 0,
  wins_24h INT NOT NULL DEFAULT 0,
  losses_24h INT NOT NULL DEFAULT 0,
  avg_confidence NUMERIC(5,2) DEFAULT 0,
  PRIMARY KEY (date, symbol, timeframe)
);

CREATE INDEX IF NOT EXISTS idx_daily_signal_metrics_date
  ON daily_signal_metrics (date DESC);
