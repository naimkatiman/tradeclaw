-- HMM regime engine: market regime tracking, circuit breakers, order execution, portfolio snapshots.
-- All DDL is idempotent (IF NOT EXISTS) so this migration is safe to re-run.
--
-- TimescaleDB note: hypertables require every UNIQUE / PRIMARY KEY index to include the
-- partition column. market_regimes and portfolio_snapshots therefore use composite PKs.

-- ============================================================
-- 1. Market regime history (TimescaleDB hypertable)
-- ============================================================
CREATE TABLE IF NOT EXISTS market_regimes (
  id SERIAL,
  symbol VARCHAR(20) NOT NULL,
  regime VARCHAR(20) NOT NULL CHECK (regime IN ('crash', 'bear', 'neutral', 'bull', 'euphoria')),
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  features JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, detected_at)
);

-- Heal databases where an earlier run created the table with a single-column PK on id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'market_regimes'
      AND c.contype = 'p'
      AND array_length(c.conkey, 1) = 1
  ) THEN
    ALTER TABLE market_regimes DROP CONSTRAINT market_regimes_pkey;
    ALTER TABLE market_regimes ADD PRIMARY KEY (id, detected_at);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_market_regimes_symbol ON market_regimes(symbol);
CREATE INDEX IF NOT EXISTS idx_market_regimes_detected_at ON market_regimes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_regimes_symbol_latest ON market_regimes(symbol, detected_at DESC);

-- ============================================================
-- 2. Circuit breaker events
-- ============================================================
CREATE TABLE IF NOT EXISTS circuit_breaker_events (
  id SERIAL PRIMARY KEY,
  breaker_type VARCHAR(50) NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  reason TEXT,
  portfolio_state JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_active ON circuit_breaker_events(breaker_type) WHERE resolved_at IS NULL;

-- ============================================================
-- 3. Order execution log
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  signal_id VARCHAR(100),
  broker VARCHAR(20) NOT NULL CHECK (broker IN ('alpaca', 'metaapi', 'paper')),
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'bracket')),
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  quantity DECIMAL(18,8) NOT NULL,
  entry_price DECIMAL(18,8),
  fill_price DECIMAL(18,8),
  stop_loss DECIMAL(18,8),
  take_profit DECIMAL(18,8),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'partial', 'filled', 'cancelled', 'rejected', 'expired')),
  broker_order_id VARCHAR(100),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_signal_id ON orders(signal_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- 4. Portfolio snapshots (TimescaleDB hypertable, drives equity curve)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL,
  total_equity DECIMAL(18,2) NOT NULL,
  cash DECIMAL(18,2) NOT NULL,
  positions_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  drawdown_pct DECIMAL(8,6) NOT NULL DEFAULT 0,
  high_water_mark DECIMAL(18,2) NOT NULL,
  regime VARCHAR(20),
  active_breakers TEXT[] NOT NULL DEFAULT '{}',
  allocation_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, snapshot_at)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'portfolio_snapshots'
      AND c.contype = 'p'
      AND array_length(c.conkey, 1) = 1
  ) THEN
    ALTER TABLE portfolio_snapshots DROP CONSTRAINT portfolio_snapshots_pkey;
    ALTER TABLE portfolio_snapshots ADD PRIMARY KEY (id, snapshot_at);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_at ON portfolio_snapshots(snapshot_at DESC);

-- ============================================================
-- 5. TimescaleDB hypertables (only if extension is available)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('market_regimes', 'detected_at', if_not_exists => TRUE);
    PERFORM create_hypertable('portfolio_snapshots', 'snapshot_at', if_not_exists => TRUE);
  END IF;
END
$$;
