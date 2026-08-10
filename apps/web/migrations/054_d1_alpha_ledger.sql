-- 054: Prospective D1 alpha evidence ledger.
--
-- This is a research ledger, not the observed signal archive and not a broker
-- account. It begins at the first post-deployment snapshot, refuses historical
-- insertion, and is immutable at the database layer. Application writes are
-- serialized and hash-chained by apps/web/lib/d1-alpha-ledger.ts.

CREATE TABLE IF NOT EXISTS d1_alpha_ledger (
  strategy_version              TEXT             NOT NULL,
  bar_ts                        BIGINT           NOT NULL,
  rule_sha256                   TEXT             NOT NULL,
  artifact_sha256               TEXT             NOT NULL,

  btc_source                    VARCHAR(24)      NOT NULL,
  btc_close                     DOUBLE PRECISION NOT NULL,
  btc_transition_action         VARCHAR(16),
  btc_transition_price          DOUBLE PRECISION,
  btc_engine_exposure           SMALLINT         NOT NULL,
  btc_position                  VARCHAR(4)       NOT NULL,
  btc_synchronized              BOOLEAN          NOT NULL,
  btc_strategy_nav              DOUBLE PRECISION NOT NULL,
  btc_benchmark_nav             DOUBLE PRECISION NOT NULL,

  eth_source                    VARCHAR(24)      NOT NULL,
  eth_close                     DOUBLE PRECISION NOT NULL,
  eth_transition_action         VARCHAR(16),
  eth_transition_price          DOUBLE PRECISION,
  eth_engine_exposure           SMALLINT         NOT NULL,
  eth_position                  VARCHAR(4)       NOT NULL,
  eth_synchronized              BOOLEAN          NOT NULL,
  eth_strategy_nav              DOUBLE PRECISION NOT NULL,
  eth_benchmark_nav             DOUBLE PRECISION NOT NULL,

  strategy_nav                  DOUBLE PRECISION NOT NULL,
  benchmark_nav                 DOUBLE PRECISION NOT NULL,
  strategy_liquidation_nav      DOUBLE PRECISION NOT NULL,
  benchmark_liquidation_nav     DOUBLE PRECISION NOT NULL,
  strategy_cost_increment       DOUBLE PRECISION NOT NULL,
  strategy_funding_increment    DOUBLE PRECISION NOT NULL,
  benchmark_cost_increment      DOUBLE PRECISION NOT NULL,
  benchmark_funding_increment   DOUBLE PRECISION NOT NULL,
  closed_trades_increment       SMALLINT         NOT NULL,

  previous_hash                 TEXT,
  row_hash                      TEXT             NOT NULL,
  canonical_payload             JSONB            NOT NULL,
  committed_at                  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  PRIMARY KEY (strategy_version, bar_ts),
  UNIQUE (strategy_version, row_hash),

  CONSTRAINT d1_alpha_strategy_version_check
    CHECK (strategy_version = 'd1-slow-gate-v1-2026-08-09'),
  CONSTRAINT d1_alpha_rule_hash_check
    CHECK (rule_sha256 = 'a9c222a33f3e1e0c70e8fb5f0bfa930dc6433297d9dcb27ef2b825f08da3b171'),
  CONSTRAINT d1_alpha_artifact_hash_check
    CHECK (artifact_sha256 = '1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90'),
  CONSTRAINT d1_alpha_bar_alignment_check
    CHECK (bar_ts > 0 AND MOD(bar_ts, 86400000) = 0),
  CONSTRAINT d1_alpha_hash_shape_check
    CHECK (
      row_hash ~ '^[0-9a-f]{64}$'
      AND (previous_hash IS NULL OR previous_hash ~ '^[0-9a-f]{64}$')
    ),
  CONSTRAINT d1_alpha_btc_source_check
    CHECK (btc_source = 'binance'),
  CONSTRAINT d1_alpha_eth_source_check
    CHECK (eth_source = 'binance'),
  CONSTRAINT d1_alpha_btc_transition_check
    CHECK (
      (btc_transition_action IS NULL AND btc_transition_price IS NULL)
      OR (
        btc_transition_action IN ('ENTER_LONG', 'EXIT_GATE', 'EXIT_STOP')
        AND btc_transition_price > 0
        AND btc_transition_price < 'Infinity'::DOUBLE PRECISION
      )
    ),
  CONSTRAINT d1_alpha_eth_transition_check
    CHECK (
      (eth_transition_action IS NULL AND eth_transition_price IS NULL)
      OR (
        eth_transition_action IN ('ENTER_LONG', 'EXIT_GATE', 'EXIT_STOP')
        AND eth_transition_price > 0
        AND eth_transition_price < 'Infinity'::DOUBLE PRECISION
      )
    ),
  CONSTRAINT d1_alpha_position_check
    CHECK (btc_position IN ('FLAT', 'LONG') AND eth_position IN ('FLAT', 'LONG')),
  CONSTRAINT d1_alpha_exposure_check
    CHECK (btc_engine_exposure IN (0, 1) AND eth_engine_exposure IN (0, 1)),
  CONSTRAINT d1_alpha_positive_values_check
    CHECK (
      btc_close > 0 AND btc_close < 'Infinity'::DOUBLE PRECISION
      AND eth_close > 0 AND eth_close < 'Infinity'::DOUBLE PRECISION
      AND btc_strategy_nav > 0 AND btc_strategy_nav < 'Infinity'::DOUBLE PRECISION
      AND btc_benchmark_nav > 0 AND btc_benchmark_nav < 'Infinity'::DOUBLE PRECISION
      AND eth_strategy_nav > 0 AND eth_strategy_nav < 'Infinity'::DOUBLE PRECISION
      AND eth_benchmark_nav > 0 AND eth_benchmark_nav < 'Infinity'::DOUBLE PRECISION
      AND strategy_nav > 0 AND strategy_nav < 'Infinity'::DOUBLE PRECISION
      AND benchmark_nav > 0 AND benchmark_nav < 'Infinity'::DOUBLE PRECISION
      AND strategy_liquidation_nav > 0 AND strategy_liquidation_nav < 'Infinity'::DOUBLE PRECISION
      AND benchmark_liquidation_nav > 0 AND benchmark_liquidation_nav < 'Infinity'::DOUBLE PRECISION
    ),
  CONSTRAINT d1_alpha_increment_check
    CHECK (
      strategy_cost_increment >= 0 AND strategy_cost_increment < 'Infinity'::DOUBLE PRECISION
      AND strategy_funding_increment >= 0 AND strategy_funding_increment < 'Infinity'::DOUBLE PRECISION
      AND benchmark_cost_increment >= 0 AND benchmark_cost_increment < 'Infinity'::DOUBLE PRECISION
      AND benchmark_funding_increment >= 0 AND benchmark_funding_increment < 'Infinity'::DOUBLE PRECISION
      AND closed_trades_increment BETWEEN 0 AND 2
    ),
  CONSTRAINT d1_alpha_payload_identity_check
    CHECK (
      jsonb_typeof(canonical_payload) = 'object'
      AND canonical_payload ?& ARRAY[
        'schemaVersion', 'strategyVersion', 'ruleSha256', 'artifactSha256',
        'barTimestamp', 'btc', 'eth', 'strategyPortfolioNav',
        'benchmarkPortfolioNav', 'strategyLiquidationNav',
        'benchmarkLiquidationNav', 'strategyCostIncrement',
        'strategyFundingIncrement', 'benchmarkCostIncrement',
        'benchmarkFundingIncrement', 'closedTradesIncrement'
      ]::TEXT[]
      AND canonical_payload->>'schemaVersion' = '1'
      AND canonical_payload->>'strategyVersion' = strategy_version
      AND canonical_payload->>'ruleSha256' = rule_sha256
      AND canonical_payload->>'artifactSha256' = artifact_sha256
      AND (canonical_payload->>'barTimestamp')::BIGINT = bar_ts
    )
);

CREATE INDEX IF NOT EXISTS idx_d1_alpha_ledger_latest
  ON d1_alpha_ledger (strategy_version, bar_ts DESC);

CREATE OR REPLACE FUNCTION reject_d1_alpha_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'd1_alpha_ledger is append-only; % is forbidden', TG_OP
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS d1_alpha_ledger_reject_mutation ON d1_alpha_ledger;
CREATE TRIGGER d1_alpha_ledger_reject_mutation
  BEFORE UPDATE OR DELETE ON d1_alpha_ledger
  FOR EACH ROW EXECUTE FUNCTION reject_d1_alpha_ledger_mutation();

COMMENT ON TABLE d1_alpha_ledger IS
  'Append-only prospective modeled-cost D1 strategy/benchmark snapshots; not broker returns.';
