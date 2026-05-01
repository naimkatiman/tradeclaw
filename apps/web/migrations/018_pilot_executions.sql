-- TradeClaw Pilot — execution audit + symbol universe.
-- Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
--
-- Tables:
--   executions          — one row per order placed by the executor
--   execution_errors    — one row per rejection / network failure / sizing skip
--   universe_snapshots  — daily output of the symbol screen
--
-- Phase 1 runs single-tenant (house testnet account); user_id is nullable.
-- Phase 2 enforces user_id NOT NULL for new rows via app-layer guard.

CREATE TABLE IF NOT EXISTS executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id         UUID NOT NULL REFERENCES signal_history(id),
  user_id           UUID,
  broker            VARCHAR(32)  NOT NULL,
  mode              VARCHAR(16)  NOT NULL CHECK (mode IN ('testnet','live')),
  symbol            VARCHAR(32)  NOT NULL,
  side              VARCHAR(8)   NOT NULL CHECK (side IN ('BUY','SELL')),
  qty               NUMERIC(24,12) NOT NULL,
  entry_price       NUMERIC(24,12),
  stop_price        NUMERIC(24,12),
  tp1_price         NUMERIC(24,12),
  leverage          SMALLINT     NOT NULL,
  notional_usd      NUMERIC(18,4),
  risk_usd          NUMERIC(18,4),
  client_order_id   VARCHAR(64)  NOT NULL UNIQUE,
  exchange_order_id VARCHAR(64),
  status            VARCHAR(16)  NOT NULL
                    CHECK (status IN ('pending','filled','partially_filled','rejected','closed','cancelled')),
  filled_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  realized_pnl      NUMERIC(18,4),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_signal       ON executions(signal_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_status  ON executions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_executions_symbol_open  ON executions(symbol)
  WHERE status IN ('pending','filled','partially_filled');
CREATE INDEX IF NOT EXISTS idx_executions_created      ON executions(created_at DESC);

CREATE TABLE IF NOT EXISTS execution_errors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id    UUID,
  execution_id UUID,
  user_id      UUID,
  broker       VARCHAR(32) NOT NULL,
  stage        VARCHAR(32) NOT NULL
               CHECK (stage IN ('size','filter','place_entry','place_sl','place_tp','manage','cancel','handshake')),
  error_code   VARCHAR(64),
  error_msg    TEXT NOT NULL,
  payload      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_errors_created  ON execution_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_errors_user     ON execution_errors(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_errors_stage    ON execution_errors(stage, created_at DESC);

CREATE TABLE IF NOT EXISTS universe_snapshots (
  snapshot_date    DATE         NOT NULL,
  symbol           VARCHAR(32)  NOT NULL,
  ef_ratio         NUMERIC(8,4) NOT NULL,
  vol_24h_usd      NUMERIC(20,2) NOT NULL,
  included         BOOLEAN      NOT NULL,
  excluded_reason  VARCHAR(64),
  PRIMARY KEY (snapshot_date, symbol)
);

CREATE INDEX IF NOT EXISTS idx_universe_included
  ON universe_snapshots(snapshot_date, symbol)
  WHERE included = TRUE;
