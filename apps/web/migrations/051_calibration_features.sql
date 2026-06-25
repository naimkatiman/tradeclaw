-- 051: Calibration features at emission (engine-makeover Phase 4, plan D4).
--
-- Phase 4's confidence calibrator needs the signal-creation-time features that
-- shaped the published confidence — but signal_history only stored the FINAL
-- post-boost confidence, so "shrink the confluence bonus to its measured
-- incremental value" was not measurable (docs/plans/2026-06-11-strategy-dispatch
-- "Calibration's headline feature is not yet measurable"). This persists them
-- going forward so the data accrues; it is NOT retroactive.
--
-- All columns nullable, no backfill — same pattern as 048_broadcast_scope.sql.
-- NULL = "not recorded at emission": legacy/pre-051 rows, and forward-accrual
-- rows whose generator does not carry the feature (per Phase 3 D11, the same
-- legacy-vocabulary policy as regime). In particular the MTF triple
-- (pre_boost_confidence / mtf_agreement / confluence_bonus) is only computed on
-- the TA-fallback path; the prod-primary Python scanner rows record NULL for
-- them, which is honest and expected. cost_estimate_pct is universal — the cron
-- populates it for EVERY recorded row.
--
-- Unlike 048's published_at, NONE of these take a column DEFAULT: there is no
-- meaningful emission-time value to stamp onto existing rows, so they correctly
-- stay NULL on legacy rows and are populated only by future inserts.

-- TA-engine confidence BEFORE the MTF confluence bonus was applied (0-100).
-- The published `confidence` = this + confluence_bonus (clamped 0..95). Lets the
-- calibrator measure the bonus's true incremental value vs. the pre-boost base.
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS pre_boost_confidence REAL;

-- Multi-timeframe agreement count (0-4): how many of the 4 surveyed timeframes
-- agreed on the dominant direction at emission.
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS mtf_agreement SMALLINT;

-- The confluence bonus actually added to pre_boost_confidence at emission
-- (e.g. +15 for 4/4, +10 for 3/4, +5 for 2/4, -20 when conflicted, 0 otherwise).
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS confluence_bonus REAL;

-- Modeled round-trip transaction cost for this signal, as a PERCENT OF NOTIONAL.
-- Formula: 2 * (feePctPerSide + slippagePctPerSide) from the canonical
-- @tradeclaw/strategies cost model (costModelFor(symbol) → CostModel). The
-- factor of 2 covers entry + exit; e.g. crypto perp = 2 * (0.05 + 0.15) = 0.40%.
-- Funding is intentionally EXCLUDED from this emission-time estimate (hold
-- duration is unknown at emission) — it is modeled separately in backtests.
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS cost_estimate_pct REAL;
