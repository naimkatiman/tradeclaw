/**
 * Phase 4 — D5: Regime-conditioned backtest mode + per-regime metrics.
 *
 * This module lets a backtest evaluate an entry strategy's edge CONDITIONED ON
 * the market regime at each entry bar, producing per-regime cost-adjusted
 * metrics. It is the machinery C6 runs to generate the per-regime gate evidence.
 *
 * Why not just backtest the presets: the runner window-caps `hmm-top3` and
 * `full-risk` (top-3-by-window → ~3 trades / 2y), so those presets measure
 * nothing over a long run. Per-regime evaluation therefore drives ENTRY MODULES
 * directly (classic, vwap-ema-bb), conditioned on regime, never the capped
 * presets.
 *
 * Reuse, not reimplementation:
 *   - `classifyRegime` (@tradeclaw/signals) — the SAME structural HMM classifier
 *     regime-aware.ts uses; called with the SAME `(symbol, window)` signature.
 *   - `passesTrendFilter` (./router, Phase 4 C2/D2) — the single shared trend
 *     predicate, fed a bounded trailing slice per the C2 performance note.
 *   - `runBacktest` + its cost/geometry options (./run-backtest) — UNCHANGED.
 *
 * Conditioning vs. regime-aware FILTERING — the deliberate divergence:
 *   regime-aware.ts is PERMISSIVE: a too-short window or a classifier throw
 *   FAILS OPEN (the signal passes). Here, conditioning is EXCLUSIVE: a signal is
 *   kept ONLY when its entry-bar regime is provably === the target. A too-short
 *   window or a classifier throw means "cannot confirm regime == target", so the
 *   signal is DROPPED (conservative), NOT passed. This is the correct semantics
 *   for bucketing evidence: an unverifiable bar must not leak into a regime
 *   bucket it may not belong to.
 */

import type { OHLCV } from '@tradeclaw/core';
import type { MarketRegime, RegimeClassification } from '@tradeclaw/signals';
import { classifyRegime } from '@tradeclaw/signals';
import type { EntryModule, EntrySignal, EntryContext, StrategyId, AllocationConfig, RiskConfig } from './types';
import { passesTrendFilter, type TrendFilterOptions } from './router';
import { runBacktest, type BacktestResult, type BacktestTrade } from './run-backtest';
import { type BacktestOptions } from './backtest-options';

/**
 * Trailing-window size handed to the classifier and trend filter at each signal
 * bar — NOT the full growing history (that would make a C6 run O(n²)).
 *
 * Why 329, derived from the BINDING constraint (atrPercentile saturation):
 *   The classifier decodes over the LAST DEFAULT_SEQUENCE_LENGTH = 64 feature
 *   vectors. The FIRST of those vectors sits at bar W−64 of a W-bar window. Its
 *   atrPercentile feature ranks ATR(14)/close samples accumulated up to that
 *   bar: there are (W−64) − atrPeriod + 1 = W − 64 − 14 + 1 = W − 77 such
 *   samples. atrPercentile ranks over atrPercentileWindow = 252 samples, so for
 *   that earliest Viterbi bar to see a FULLY SATURATED percentile (matching the
 *   live writer, RECENT_BARS = 400, which is saturated) we need:
 *
 *       W − 77 ≥ 252   →   W ≥ 329.
 *
 *   At W = 160 the earliest Viterbi bar ranks over only 160 − 77 = 83 samples,
 *   so its atrPercentile diverges from the live writer at percentile boundaries
 *   — which would corrupt C6's per-regime bucketing. 329 closes that gap.
 *
 * The other two needs are already satisfied (329 ≫ both):
 *   - Feature warmup floor: atrPeriod 14 + MIN_ATR_PERCENTILE_SAMPLES 30 − 1 = 43
 *     bars before the first non-null vector, plus 64 vectors = 107-bar floor to
 *     fill the Viterbi window at all. 329 > 107.
 *   - passesTrendFilter needs max(emaPeriod 50 + slopeLookback 3, adxPeriod 14 + 1)
 *     = 53 bars. 329 > 53.
 *
 * Perf is irrelevant: each per-signal classify/filter call is O(329), a bounded
 * slice — never O(history), so a C6 run stays far below O(bars²).
 *
 * The window is the trailing 329 bars ENDING AT the signal bar (inclusive), so
 * classification/filtering see exactly the data available up to entry — no
 * lookahead.
 */
export const REGIME_CONDITION_WINDOW = 329;

/** The three canonical regimes, in a stable order for reporting. */
export const REGIMES: readonly MarketRegime[] = ['trend', 'volatile', 'range'] as const;

/**
 * Classifier seam. Defaults to the real `classifyRegime`. Exposed ONLY so unit
 * tests can force a known regime or a thrown error WITHOUT mocking away the
 * wrapper's own conditioning logic (the thing under test). Production callers
 * never pass this.
 */
export type ClassifyFn = (symbol: string, window: OHLCV[]) => RegimeClassification;

export interface ConditionEntryOptions {
  /** Apply the C2 trend-route filter (EMA-50 slope agrees + ADX≥20) on top of
   *  the regime match. Used for the trend route. Default: false. */
  applyTrendFilter?: boolean;
  /** Overrides forwarded to `passesTrendFilter`. Defaults match the pilot plan. */
  trendFilterOptions?: TrendFilterOptions;
  /** Trailing-window size for classification + trend filter. Default REGIME_CONDITION_WINDOW. */
  windowSize?: number;
  /** Injectable classifier (tests only). Defaults to the real classifyRegime. */
  classify?: ClassifyFn;
}

/**
 * Bounded trailing slice ending AT `barIndex` (inclusive), at most `size` bars.
 * Index 0 of the result is the oldest bar in the window; the last is the signal
 * bar. This is what we hand to the classifier and trend filter — never the full
 * candles array — to keep per-signal cost O(size), not O(history).
 */
function trailingWindow(candles: OHLCV[], barIndex: number, size: number): OHLCV[] {
  const end = barIndex + 1; // inclusive of the signal bar
  const start = Math.max(0, end - size);
  return candles.slice(start, end);
}

/**
 * Wrap an entry module so it emits ONLY the signals whose entry-bar regime
 * equals `targetRegime` (and, if `applyTrendFilter`, also pass the trend
 * predicate). Conditioning is exclusive: unverifiable bars (window too short,
 * classifier throw) are DROPPED.
 *
 * The wrapper is itself an EntryModule, so it plugs straight into a Strategy and
 * runs through the UNCHANGED `runBacktest`.
 */
export function conditionEntryOnRegime(
  baseEntry: EntryModule,
  targetRegime: MarketRegime,
  opts: ConditionEntryOptions = {},
): EntryModule {
  const windowSize = opts.windowSize ?? REGIME_CONDITION_WINDOW;
  const classify = opts.classify ?? classifyRegime;
  const applyTrendFilter = opts.applyTrendFilter ?? false;

  return {
    id: `${baseEntry.id}@${targetRegime}${applyTrendFilter ? '+trend' : ''}`,

    generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
      const raw = baseEntry.generateSignals(candles, ctx);
      if (raw.length === 0) return [];

      const kept: EntrySignal[] = [];
      for (const sig of raw) {
        const window = trailingWindow(candles, sig.barIndex, windowSize);

        let regime: MarketRegime;
        try {
          regime = classify(ctx.symbol, window).regime;
        } catch {
          // EXCLUSIVE conditioning: a classification failure means we cannot
          // confirm regime == target, so the signal is DROPPED (the divergence
          // from regime-aware.ts's permissive fail-open, documented at the top).
          continue;
        }

        if (regime !== targetRegime) continue;

        if (applyTrendFilter && !passesTrendFilter(window, sig.direction, opts.trendFilterOptions)) {
          continue;
        }

        kept.push(sig);
      }
      return kept;
    },
  };
}

// ---------------------------------------------------------------------------
// Per-regime metrics
// ---------------------------------------------------------------------------

export interface RegimeMetrics {
  regime: MarketRegime;
  /** Trades whose entry bar was classified as this regime (after any trend filter). */
  trades: number;
  /** Wins / trades. 0 when no trades. */
  winRate: number;
  /**
   * Expectancy = mean realized pnlPct per trade, AFTER modeled costs. Because
   * `runBacktest` already subtracts `costPct/100` from each trade's `pnlPct`
   * when a cost model is supplied, this mean is net-of-cost by construction.
   * Per-trade FRACTIONAL and position-size-NEUTRAL (uses pnlPct, not notional
   * pnl) — so it isolates the entry edge regardless of allocation. Expressed as
   * a fraction (e.g. 0.004 = +0.4%). 0 when no trades.
   */
  expectancy: number;
  /**
   * Sum of winning pnlPct / abs sum of losing pnlPct. Per-trade FRACTIONAL and
   * position-size-NEUTRAL — the SAME basis as `expectancy`, so the two cannot
   * diverge under non-flat allocation (a notional-pnl basis would). Infinity
   * when only winners; null when no trades (distinct from "all losers" → 0).
   */
  profitFactor: number | null;
  /**
   * Within-regime drawdown: max drawdown over the running equity of THIS
   * regime's trades in entry order (a per-regime sub-curve seeded at the
   * backtest start balance). Well-defined because the trades are entry-ordered,
   * but it IGNORES interleaved other-regime trades — it is NOT the portfolio
   * drawdown. For portfolio DD use `resultByRegime[r].maxDrawdown`. 0 when
   * fewer than 1 trade. Fraction of peak (e.g. 0.12 = 12%).
   */
  withinRegimeDrawdown: number;
}

export interface PerRegimeMetricsResult {
  /** Per-regime metrics derived from the conditioned backtests. */
  byRegime: Record<MarketRegime, RegimeMetrics>;
  /** The underlying BacktestResult per regime (for callers that want raw trades). */
  resultByRegime: Record<MarketRegime, BacktestResult>;
}

export interface PerRegimeMetricsOptions {
  /** Backtest cost/geometry/context options, forwarded UNCHANGED to runBacktest. */
  backtest?: BacktestOptions;
  /** Apply the trend filter on the trend route only. Default true (trend gets the C2 filter). */
  applyTrendFilterToTrend?: boolean;
  /** Trend-filter overrides forwarded to passesTrendFilter. */
  trendFilterOptions?: TrendFilterOptions;
  /** Trailing-window size for conditioning. Default REGIME_CONDITION_WINDOW. */
  windowSize?: number;
  /** Injectable classifier (tests only). Defaults to the real classifyRegime. */
  classify?: ClassifyFn;
  /**
   * Allocation/risk config for the per-regime Strategy wrappers. Defaults to
   * flat allocation + no risk gating so the metrics reflect the ENTRY edge, not
   * an allocation/risk overlay. Override to study a full pipeline.
   */
  allocation?: AllocationConfig;
  risk?: RiskConfig;
}

/** Max drawdown of an equity curve (fraction of running peak). Mirrors run-backtest's private helper. */
function maxDrawdownOf(curve: number[]): number {
  if (curve.length === 0) return 0;
  let peak = curve[0];
  let maxDd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * Profit factor on the SIZE-NEUTRAL fractional basis: sum of positive pnlPct
 * over abs sum of negative pnlPct (NOT notional pnl, which is position-size
 * weighted and would diverge from the pnlPct-based expectancy under non-flat
 * allocation). null for an empty set; Infinity when there are gains but no
 * losses; 0 when there are losses but no gains.
 */
function profitFactorOf(trades: BacktestTrade[]): number | null {
  if (trades.length === 0) return null;
  const gains = trades.filter((t) => t.pnlPct > 0).reduce((s, t) => s + t.pnlPct, 0);
  const losses = trades.filter((t) => t.pnlPct < 0).reduce((s, t) => s - t.pnlPct, 0);
  if (losses === 0) return gains > 0 ? Infinity : 0;
  return gains / losses;
}

/**
 * Compute per-regime metrics for a base entry module over `candles`.
 *
 * Runs ONE conditioned backtest PER regime (three runs total): the entry is
 * wrapped so it only fires on bars of that regime, then `runBacktest` (unchanged)
 * produces the trades, whose `pnlPct` is already net of modeled costs. Metrics
 * are derived per regime from those trades.
 *
 * Three runs (not one) is the honest shape here: a single backtest cannot
 * attribute its overlap-suppressed trades to regimes cleanly (the overlap guard
 * would drop a later-regime trade because an earlier-regime trade was still
 * open), so each regime is evaluated on its own conditioned signal stream. The
 * cost is 3× the classifier work, still classified at SIGNAL bars only and over
 * a bounded window, so it stays far below O(bars²).
 *
 * The trend route (regime === 'trend') additionally applies the C2 trend filter
 * when `applyTrendFilterToTrend` (default true); volatile/range routes do not.
 */
export function perRegimeMetrics(
  candles: OHLCV[],
  baseEntry: EntryModule,
  options: PerRegimeMetricsOptions = {},
): PerRegimeMetricsResult {
  const applyTrendToTrend = options.applyTrendFilterToTrend ?? true;
  const allocation: AllocationConfig = options.allocation ?? { kind: 'flat' };
  const risk: RiskConfig = options.risk ?? { kind: 'none' };

  const byRegime = {} as Record<MarketRegime, RegimeMetrics>;
  const resultByRegime = {} as Record<MarketRegime, BacktestResult>;

  for (const regime of REGIMES) {
    const conditioned = conditionEntryOnRegime(baseEntry, regime, {
      applyTrendFilter: regime === 'trend' && applyTrendToTrend,
      trendFilterOptions: options.trendFilterOptions,
      windowSize: options.windowSize,
      classify: options.classify,
    });

    const result = runBacktest(
      candles,
      {
        // strategyId on the result must be a valid StrategyId; reuse the base
        // entry's own id (classic / vwap-ema-bb are valid). The conditioned
        // wrapper's descriptive id is not a StrategyId and is not used here.
        id: baseEntry.id as StrategyId,
        name: `conditioned-${regime}`,
        description: `${baseEntry.id} conditioned on ${regime}`,
        entry: conditioned,
        allocation,
        risk,
      },
      options.backtest,
    );

    resultByRegime[regime] = result;

    const trades = result.trades;
    if (trades.length === 0) {
      byRegime[regime] = {
        regime,
        trades: 0,
        winRate: 0,
        expectancy: 0,
        profitFactor: null,
        withinRegimeDrawdown: 0,
      };
      continue;
    }

    // Per-regime equity sub-curve in entry order, seeded at the backtest start
    // balance, so the within-regime drawdown is well-defined (see RegimeMetrics).
    const start = result.startBalance;
    const subCurve: number[] = [start];
    let bal = start;
    for (const t of trades) {
      bal += t.pnl;
      subCurve.push(bal);
    }

    const wins = trades.filter((t) => t.win).length;
    const expectancy = trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length;

    byRegime[regime] = {
      regime,
      trades: trades.length,
      winRate: wins / trades.length,
      expectancy,
      profitFactor: profitFactorOf(trades),
      withinRegimeDrawdown: maxDrawdownOf(subCurve),
    };
  }

  return { byRegime, resultByRegime };
}
