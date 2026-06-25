CREATE TABLE IF NOT EXISTS tool_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'indicator', 'signal_engine', 'connector'
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO tool_registry (id, name, category, description) VALUES
  ('rsi', 'RSI', 'indicator', 'Relative Strength Index'),
  ('macd', 'MACD', 'indicator', 'Moving Average Convergence Divergence'),
  ('ema', 'EMA Crossover', 'indicator', 'Exponential Moving Average Crossover'),
  ('bb', 'Bollinger Bands', 'indicator', 'Bollinger Bands squeeze/breakout'),
  ('stoch', 'Stochastic', 'indicator', 'Stochastic Oscillator'),
  ('adx', 'ADX', 'indicator', 'Average Directional Index'),
  ('hmm-top3', 'HMM Top 3', 'signal_engine', 'Default production signal engine preset'),
  ('market-data-hub', 'Market Data Hub', 'connector', 'Redis-cached Twelve Data proxy')
ON CONFLICT (id) DO NOTHING;
