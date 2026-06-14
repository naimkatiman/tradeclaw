-- 052: Funding-rate store (engine-makeover Phase 5, Track A).
--
-- Historical perp funding events so carry research is reproducible. One row
-- per (symbol, funding event). Append-only by convention — writers use
-- ON CONFLICT DO NOTHING (same contract as candles/049); corrections require
-- an explicit audited migration, never a background overwrite.
--
-- ts is the exchange fundingTime in epoch milliseconds. rate is the funding
-- rate for that interval as a fraction (0.0001 = 1bp). mark_price is the
-- exchange-reported mark at funding time when available, else NULL.
-- No extra index: the PK btree serves the (symbol, ts) range scans
-- (049's redundant index is explicitly NOT copied, per its own NOTE).

CREATE TABLE IF NOT EXISTS funding_rates (
  symbol      VARCHAR(20)      NOT NULL,
  ts          BIGINT           NOT NULL,
  rate        DOUBLE PRECISION NOT NULL,
  mark_price  DOUBLE PRECISION,
  source      VARCHAR(32)      NOT NULL,
  inserted_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, ts)
);
