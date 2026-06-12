/**
 * Backtest cost + geometry options (engine-makeover Phase 2).
 *
 * The backtester previously simulated zero-friction fills at fixed 2%/1%
 * TP/SL — it neither charged costs nor tested the shipped (ATR-stop)
 * geometry, so reported edge was structurally inflated and preset
 * comparisons did not predict live behavior. Both knobs default to the
 * legacy behavior so existing tests, the CI gate, and the /backtest page
 * are byte-identical until a caller opts in.
 */

export interface CostModel {
  /** Taker fee, % of notional per side (entry and exit each pay it). */
  feePctPerSide: number;
  /** Half-spread + impact, % per side — entry fills worse, exit fills worse. */
  slippagePctPerSide: number;
  /** Perp funding, % of notional per 8h held. Modeled as a pure cost (sign-agnostic upper bound). */
  fundingPctPer8h: number;
}

export const ZERO_COSTS: CostModel = {
  feePctPerSide: 0,
  slippagePctPerSide: 0,
  fundingPctPer8h: 0,
};

/**
 * Binance USDT-M retail taker: 0.05%/side fee; slippage matches the repo's
 * own crypto model (apps/web/lib/slippage.ts: 0.15%/side); funding baseline
 * 0.01%/8h.
 */
export const CRYPTO_PERP_COSTS: CostModel = {
  feePctPerSide: 0.05,
  slippagePctPerSide: 0.15,
  fundingPctPer8h: 0.01,
};

/** Retail FX spread-only model (repo slippage.ts: 0.02%/side), no funding. */
export const FX_COSTS: CostModel = {
  feePctPerSide: 0,
  slippagePctPerSide: 0.02,
  fundingPctPer8h: 0,
};

/** Metals CFD model (repo slippage.ts: 0.05%/side). */
export const METALS_COSTS: CostModel = {
  feePctPerSide: 0,
  slippagePctPerSide: 0.05,
  fundingPctPer8h: 0,
};

export type Geometry =
  | { mode: 'fixed'; tpPct: number; slPct: number }
  | { mode: 'atr'; period: number; slMult: number; tpRMultiple: number };

/** Legacy backtester geometry — fixed 2% TP / 1% SL on every symbol. */
export const FIXED_LEGACY_GEOMETRY: Geometry = { mode: 'fixed', tpPct: 0.02, slPct: 0.01 };

/**
 * The shipped engine's geometry: 2.5×ATR(14) stops (DEFAULT_ATR_MULTIPLIER
 * in @tradeclaw/signals atr-calibration), TP1 at 2.0R (signal-generator
 * target ladder). A backtest under this geometry tests the strategy that is
 * actually deployed.
 */
export const LIVE_GEOMETRY: Geometry = { mode: 'atr', period: 14, slMult: 2.5, tpRMultiple: 2.0 };

export interface BacktestOptions {
  costs?: CostModel;
  geometry?: Geometry;
  /** Bar duration in hours, for funding accrual. Default 1 (H1). */
  barHours?: number;
  /**
   * Entry context passed to the strategy's signal generator. Regime-aware
   * presets resolve their HMM model BY SYMBOL — the legacy hardcoded
   * 'BACKTEST' placeholder falls through to the forex model, silently
   * classifying crypto series with the wrong regime model. Always pass the
   * real symbol/timeframe for research runs.
   */
  context?: { symbol: string; timeframe: string };
  /**
   * Exit policy (Phase 4.5).
   *
   * - `'geometry'` (default): exit on the ATR/fixed TP or SL, whichever the
   *   price hits first — the legacy behavior, byte-identical when this option
   *   is absent.
   * - `'signal-flip'`: ride the trend. The position is held until an
   *   OPPOSITE-direction entry signal fires at a later bar (exit at that bar's
   *   close), UNLESS the stop-loss is hit first. Precedence per forward bar:
   *   SL → opposite-signal flip → EOD. The take-profit is NOT used in this
   *   mode — the whole point is to hold past any fixed target so a multi-week
   *   trend is captured, not truncated to its first ATR leg. After a flip exit
   *   the normal signal loop may immediately open the opposite position (the
   *   overlap guard releases on close), yielding continuous long↔short
   *   momentum. This is the research's "long while momentum positive, exit on
   *   flip" behavior.
   */
  exitMode?: 'geometry' | 'signal-flip';
  /**
   * Selectivity filter (Phase 4.5). When set, signals with
   * `confidence < minConfidence` are dropped before the trade loop — "only
   * the strongest setups". Default undefined = no filter (byte-identical).
   */
  minConfidence?: number;
}

export function costModelFor(symbol: string): CostModel {
  const upper = symbol.toUpperCase();
  if (/USDT$|BTC|ETH|SOL|BNB|XRP|ADA|DOGE|DOT|LINK|AVAX/.test(upper)) return CRYPTO_PERP_COSTS;
  if (/XAU|XAG/.test(upper)) return METALS_COSTS;
  return FX_COSTS;
}
