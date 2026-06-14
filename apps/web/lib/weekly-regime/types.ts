/**
 * Weekly Regime Card — Layer 1 directional-bias engine.
 *
 * SINGLE SOURCE OF TRUTH for the regime model. Do not improvise variants of
 * these enums elsewhere — import from here.
 *
 * Every Monday an admin sets a directional bias per asset class. The system
 * derives a TRENDING / NEUTRAL classification per class and persists a
 * machine-readable card the Telegram bot and Layer-2 consume for the week.
 *
 * DISTINCT from the algorithmic per-symbol `market_regimes` table and
 * `regime-filter.ts` (trend/volatile/range). That system is computed from
 * price action per symbol. THIS system is human-set, per-asset-class, weekly.
 * The only sanctioned bridge is `lib/regime-resolution.ts`.
 *
 * This file is intentionally free of `server-only` and DB imports so the
 * admin client component can import {@link classifyRegime} for live preview.
 */

/** Fixed, ordered list of asset classes the card covers. */
export const ASSET_CLASSES = ['crypto', 'commodities', 'stocks', 'forex', 'indices'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

/** Directional bias the admin sets per class. NONE => no directional edge. */
export type Bias = 'LONG' | 'SHORT' | 'NONE';

/** Conviction 0-3. 0 => no conviction (forces NEUTRAL). */
export type Conviction = 0 | 1 | 2 | 3;

/**
 * The two-state regime model — the whole point of Layer 1.
 *
 * - TRENDING: directional bias set (LONG|SHORT) with conviction >= 1.
 *   "Catch the move before it runs." Satellite-aggressive setups eligible.
 * - NEUTRAL: no clear edge / slow week. Mean-reversion + range + income
 *   setups only; aggressive directional pyramiding disabled.
 *
 * Rule (encoded in {@link classifyRegime}): bias === 'NONE' || conviction === 0
 * => NEUTRAL, otherwise TRENDING. `regime` is ALWAYS derived, never hand-set.
 */
export type Regime = 'TRENDING' | 'NEUTRAL';

/** Admin's raw per-class input, before classification. */
export interface ClassInput {
  bias: Bias;
  conviction: Conviction;
  /** One-line thesis. Free text, trimmed. */
  thesis: string;
}

/** Full admin input across every asset class. */
export type RegimeInput = Record<AssetClass, ClassInput>;

/** A single class entry on the persisted card (input + derived regime + attribution). */
export interface ClassRegime {
  bias: Bias;
  conviction: Conviction;
  /** Derived from bias+conviction via {@link classifyRegime}. Never hand-set. */
  regime: Regime;
  thesis: string;
  set_by: string;
  /** ISO-8601 timestamp. */
  set_at: string;
}

/**
 * The machine-readable Weekly Regime Card. One row per week, keyed by
 * `week_start` (the Monday of the week in Asia/Kuala_Lumpur, `YYYY-MM-DD`).
 */
export interface WeeklyRegimeCard {
  /** Monday of the week, `YYYY-MM-DD`, Asia/Kuala_Lumpur. Primary key. */
  week_start: string;
  /** Per-class entries. Always all five `ASSET_CLASSES`. */
  classes: Record<AssetClass, ClassRegime>;
  /** True once the card was written at/after the Monday-noon lock cutoff. */
  locked: boolean;
  /** True if the most recent write used the post-cutoff override. */
  override_used: boolean;
  /** Reason supplied with an override write, else null. */
  override_reason: string | null;
  set_by: string;
  /** ISO-8601 timestamp of the most recent write. */
  set_at: string;
}
