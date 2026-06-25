-- 046_weekly_regime.sql
-- Layer-1 Weekly Regime Engine: one human-set directional-bias card per week,
-- keyed by the Monday (Asia/Kuala_Lumpur) of the week. The Telegram bot and
-- Layer 2 read this card for the rest of the week.
--
-- DISTINCT from the algorithmic per-symbol `market_regimes` table. This is a
-- weekly, per-asset-class, admin-set card. `classes` holds the full
-- Record<AssetClass, ClassRegime> JSON (bias, conviction, derived regime,
-- thesis, attribution).

CREATE TABLE IF NOT EXISTS weekly_regime (
  week_start      DATE PRIMARY KEY,
  classes         JSONB NOT NULL,
  locked          BOOLEAN NOT NULL DEFAULT false,
  override_used   BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  set_by          TEXT NOT NULL,
  set_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
