-- 049: Historical candle store (engine-makeover Phase 2).
--
-- Point-in-time OHLCV history so research runs are reproducible: every
-- provider path today caps at ~300 bars and re-fetches live, which made
-- backtests non-reproducible day to day and calibration/regime fitting
-- impossible. Append-only by convention — writers use ON CONFLICT DO NOTHING
-- so a bar, once recorded, is never silently rewritten; a corrected bar from
-- a different provider lands as a separate (symbol, timeframe, ts, source)…
-- which the PK forbids — corrections therefore require an explicit, audited
-- migration, never a background overwrite.
--
-- ts is the bar-OPEN time in epoch milliseconds, matching the OHLCV shape
-- used across the codebase.

CREATE TABLE IF NOT EXISTS candles (
  symbol      VARCHAR(20)      NOT NULL,
  timeframe   VARCHAR(8)       NOT NULL,
  ts          BIGINT           NOT NULL,
  open        DOUBLE PRECISION NOT NULL,
  high        DOUBLE PRECISION NOT NULL,
  low         DOUBLE PRECISION NOT NULL,
  close       DOUBLE PRECISION NOT NULL,
  volume      DOUBLE PRECISION NOT NULL DEFAULT 0,
  source      VARCHAR(24)      NOT NULL,
  inserted_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, timeframe, ts)
);

-- NOTE: redundant with the PRIMARY KEY btree (which serves range scans in
-- both directions) — kept because this migration was applied to prod as-is
-- on 2026-06-10; dropping it is not worth a follow-up migration. Do not
-- copy this pattern into future tables.
CREATE INDEX IF NOT EXISTS idx_candles_lookup
  ON candles (symbol, timeframe, ts DESC);
