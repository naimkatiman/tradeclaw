/**
 * Pure metric-assembly helpers for the deep-daily daily-momentum validation CLI
 * (Phase 4.5 — D4, the make-or-break experiment).
 *
 * Kept OUT of the CLI's IIFE so the assembly logic is unit-testable without
 * reading the gitignored candle dumps from disk. The CLI
 * (daily-momentum-validation.ts) is the thin I/O shell: arg parsing, dump
 * loading, file output, REGISTRY append, console summary. Everything
 * deterministic about the report — the config set, the fold slicing, the
 * per-config / per-symbol metric rows, the cross-symbol aggregate, the
 * deployable verdict — lives here and is exercised by
 * daily-momentum-validation.test.ts on a small synthetic daily series.
 *
 * Determinism contract: every function here is a pure function of its inputs
 * (candles + the daily-momentum entry module + cost/geometry options). The
 * daily-momentum entry and runBacktest are deterministic for fixed candles +
 * code, so the same candles + code produce byte-identical metrics. No Date.now()
 * here — only the CLI's meta.runAt varies between identical runs.
 *
 * Honest-numbers discipline: cost-adjusted return/expectancy is reported AS-IS,
 * after modeled crypto perp costs. Thin cells (< THIN_CELL_MIN_TRADES) and
 * single-symbol flukes are flagged, never hidden. No parameter tuning to
 * manufacture a positive — the 28-day default lookback is run as specced and the
 * numbers stand on their own.
 */

import type { OHLCV } from '@tradeclaw/core';
import {
  runBacktest,
  dailyMomentumEntry,
  LIVE_GEOMETRY,
  ZERO_COSTS,
  type Strategy,
  type BacktestOptions,
  type BacktestResult,
  type Geometry,
  type CostModel,
} from '../../packages/strategies/src';

/**
 * Minimum per-cell trade count below which a result is NOT trustworthy enough
 * to read as evidence — the cell is flagged THIN. Same CLT/SE floor of 30 the
 * Phase 4 D6 harness uses: per-trade expectancy is a sample mean of pnlPct, and
 * below ~30 trades the standard error σ/√n dominates the signal.
 */
export const THIN_CELL_MIN_TRADES = 30;

/**
 * The daily-momentum strategy under test (Phase 4.5 D2/D4). Flat allocation,
 * no risk gating — we isolate the ENTRY edge, not a sizing or streak overlay.
 * Built once; runBacktest never mutates it.
 *
 * The StrategyId union has no 'daily-momentum' member, so the result envelope's
 * `id` field carries the inert label 'classic'. That label is cosmetic only —
 * the ENTRY actually run is dailyMomentumEntry (id 'daily-momentum'), which is
 * what the validation tests. The signal source is the entry module, not the id.
 */
export const DAILY_MOMENTUM_STRATEGY: Strategy = {
  id: 'classic',
  name: 'daily-momentum',
  description: 'Daily time-series momentum (28-day TS momentum, entry-on-cross). Phase 4.5 D4 validation.',
  entry: dailyMomentumEntry,
  allocation: { kind: 'flat' },
  risk: { kind: 'none' },
};

/** The three exit/geometry configs the validation sweeps. */
export type ConfigId = 'signal-flip' | 'geometry-2R' | 'geometry-4R';

/** A config's exit policy + geometry, before costs are attached. */
interface ConfigShape {
  id: ConfigId;
  label: string;
  exitMode: 'geometry' | 'signal-flip';
  geometry: Geometry;
}

/**
 * The config set, in report order:
 *  - signal-flip: the FAITHFUL momentum test — ride to the opposite cross, SL
 *    floor only, no TP (LIVE_GEOMETRY supplies the ATR SL multiplier; tpRMultiple
 *    is ignored in signal-flip mode).
 *  - geometry-2R: the shipped LIVE_GEOMETRY (ATR14 2.5×SL, TP at 2R) — comparison.
 *  - geometry-4R: LIVE_GEOMETRY with the wide 4R target the empirical map flagged.
 */
/**
 * The wide-4R geometry: LIVE_GEOMETRY (ATR14 2.5×SL) with the TP pushed to 4R.
 * LIVE_GEOMETRY is the ATR branch of the Geometry union; narrow to that branch
 * so the spread keeps the ATR shape (the fixed branch has no tpRMultiple field).
 *
 * If LIVE_GEOMETRY is ever changed to a fixed-mode geometry, FAIL LOUD: silently
 * falling back to LIVE_GEOMETRY here would make the 4R config identical to the 2R
 * config (4R == 2R) with no visible signal — the wide-target comparison would
 * vanish into a duplicate cell. A throw at module load surfaces that immediately.
 */
function build4RGeometry(): Geometry {
  if (LIVE_GEOMETRY.mode !== 'atr') {
    throw new Error(
      `GEOMETRY_4R: expected LIVE_GEOMETRY to be ATR-mode to push a 4R take-profit, got ` +
      `mode='${LIVE_GEOMETRY.mode}'. A fixed-mode LIVE_GEOMETRY has no tpRMultiple, so the 4R ` +
      `config would silently collapse to the 2R config — fix the geometry rather than hide it.`,
    );
  }
  return { ...LIVE_GEOMETRY, tpRMultiple: 4 };
}

const GEOMETRY_4R: Geometry = build4RGeometry();

export const CONFIGS: ReadonlyArray<ConfigShape> = [
  { id: 'signal-flip', label: 'signal-flip (ride to opposite cross, SL floor)', exitMode: 'signal-flip', geometry: LIVE_GEOMETRY },
  { id: 'geometry-2R', label: 'geometry exit @ 2R (LIVE_GEOMETRY)', exitMode: 'geometry', geometry: LIVE_GEOMETRY },
  { id: 'geometry-4R', label: 'geometry exit @ 4R (wide target)', exitMode: 'geometry', geometry: GEOMETRY_4R },
] as const;

/**
 * Rounded, JSON-stable metric view of one backtest run. Fixed precision so two
 * identical runs serialize byte-identically (the determinism contract).
 * profitFactor: null = no trades, 'Infinity' = all winners (JSON can't hold it),
 * else a finite number. `expectancy` is mean pnlPct (per-trade fractional, AFTER
 * the run's costs — zero when run at zero cost). `totalReturn` is the compounded
 * fractional return.
 */
export interface RunMetrics {
  totalTrades: number;
  winRate: number;
  /** Compounded fractional return over the window (0.045 = +4.5%). */
  totalReturn: number;
  /** Mean per-trade pnlPct (fraction), after this run's costs. */
  expectancy: number;
  profitFactor: number | 'Infinity' | null;
  maxDrawdown: number;
  sharpeRatio: number;
  /** Mean modeled friction charged per trade, % of notional (0 on a zero-cost run). */
  avgCostPct: number;
  reason: BacktestResult['reason'] | null;
}

function meanExpectancy(r: BacktestResult): number {
  if (r.trades.length === 0) return 0;
  return r.trades.reduce((s, t) => s + t.pnlPct, 0) / r.trades.length;
}

function avgCost(r: BacktestResult): number {
  if (r.trades.length === 0) return 0;
  return r.trades.reduce((s, t) => s + (t.costPct ?? 0), 0) / r.trades.length;
}

export function toMetrics(r: BacktestResult): RunMetrics {
  let pf: number | 'Infinity' | null;
  if (r.totalTrades === 0) pf = null;
  else if (!Number.isFinite(r.profitFactor)) pf = 'Infinity';
  else pf = +r.profitFactor.toFixed(3);
  return {
    totalTrades: r.totalTrades,
    winRate: +r.winRate.toFixed(4),
    totalReturn: +r.totalReturn.toFixed(6),
    expectancy: +meanExpectancy(r).toFixed(6),
    profitFactor: pf,
    maxDrawdown: +r.maxDrawdown.toFixed(4),
    sharpeRatio: +r.sharpeRatio.toFixed(3),
    avgCostPct: +avgCost(r).toFixed(4),
    reason: r.reason ?? null,
  };
}

/**
 * One config run over one candle window under BOTH the supplied cost model and
 * zero costs, so raw edge (zero-cost) and friction drag (costed minus zero) are
 * separable.
 */
export interface CostedCell {
  costed: RunMetrics;
  zeroCost: RunMetrics;
  /** zeroCost.totalReturn − costed.totalReturn — the friction the costs cost you. */
  frictionDrag: number;
}

export function runConfigCell(
  candles: OHLCV[],
  config: ConfigShape,
  costs: CostModel,
  barHours: number,
  context: { symbol: string; timeframe: string },
): CostedCell {
  const base: Omit<BacktestOptions, 'costs'> = {
    geometry: config.geometry,
    barHours,
    context,
    ...(config.exitMode === 'signal-flip' ? { exitMode: 'signal-flip' as const } : {}),
  };
  const costed = toMetrics(runBacktest(candles, DAILY_MOMENTUM_STRATEGY, { ...base, costs }));
  const zeroCost = toMetrics(runBacktest(candles, DAILY_MOMENTUM_STRATEGY, { ...base, costs: ZERO_COSTS }));
  return {
    costed,
    zeroCost,
    frictionDrag: +(zeroCost.totalReturn - costed.totalReturn).toFixed(6),
  };
}

/** One fold (full range or a contiguous sub-period), with its date bounds + per-config cells. */
export interface FoldResult {
  label: string;
  from: string;
  to: string;
  candleCount: number;
  byConfig: Record<ConfigId, CostedCell>;
}

/** All configs over one candle window. */
export function windowCells(
  candles: OHLCV[],
  costs: CostModel,
  barHours: number,
  context: { symbol: string; timeframe: string },
): Record<ConfigId, CostedCell> {
  const out = {} as Record<ConfigId, CostedCell>;
  for (const c of CONFIGS) out[c.id] = runConfigCell(candles, c, costs, barHours, context);
  return out;
}

/** Everything computed for one symbol: full-range + contiguous folds, all configs. */
export interface SymbolResult {
  symbol: string;
  candleCount: number;
  firstBar: string;
  lastBar: string;
  full: Record<ConfigId, CostedCell>;
  folds: FoldResult[];
}

/**
 * Compute one symbol's full-range result plus `folds` contiguous sub-period
 * folds. Fold semantics mirror the Phase 4 harness: contiguous sub-periods for
 * stability inspection (NOT walk-forward optimization — daily-momentum has no
 * fitted parameters), per-fold indicator warmup restarts at the boundary, and a
 * position open at fold end force-closes at the last bar.
 */
export function computeSymbol(
  symbol: string,
  candles: OHLCV[],
  folds: number,
  costs: CostModel,
  barHours: number,
  timeframe: string,
): SymbolResult {
  const context = { symbol, timeframe };
  const full = windowCells(candles, costs, barHours, context);

  const foldSize = Math.floor(candles.length / folds);
  const foldResults: FoldResult[] = [];
  for (let f = 0; f < folds; f++) {
    const start = f * foldSize;
    const end = f === folds - 1 ? candles.length : (f + 1) * foldSize;
    const slice = candles.slice(start, end);
    foldResults.push({
      label: `fold${f + 1}`,
      from: new Date(slice[0].timestamp).toISOString().slice(0, 10),
      to: new Date(slice[slice.length - 1].timestamp).toISOString().slice(0, 10),
      candleCount: slice.length,
      byConfig: windowCells(slice, costs, barHours, context),
    });
  }

  return {
    symbol,
    candleCount: candles.length,
    firstBar: new Date(candles[0].timestamp).toISOString(),
    lastBar: new Date(candles[candles.length - 1].timestamp).toISOString(),
    full,
    folds: foldResults,
  };
}

/**
 * A symbol whose full-range costed return is an extreme positive outlier that
 * inflates the cross-symbol mean — a single-symbol fluke, not a robust edge. A
 * C6 reader of the JSON alone sees WHY a positive mean is still MARGINAL.
 */
export interface FlukeSymbol {
  symbol: string;
  /** The symbol's full-range costed return (fraction; 1.89 = +189%). */
  costedReturn: number;
  /** Why it was flagged: a multiple of the cross-symbol median, or an absolute extreme. */
  reason: string;
}

/**
 * Cross-symbol aggregate for one config — the robustness gate. A symbol COUNTS
 * as a deployable positive only when its full-range costed return > 0 AND it has
 * an adequate sample (≥ THIN_CELL_MIN_TRADES trades). The mean cost-adjusted
 * return and mean expectancy are simple means across the symbols (equal weight,
 * not notional). `foldStability` = the fraction of (symbol × fold) cells whose
 * costed return is positive — the across-time robustness read.
 */
export interface ConfigAggregate {
  config: ConfigId;
  symbolsTotal: number;
  /** Symbols with full-range costed return > 0 AND ≥ THIN_CELL_MIN_TRADES trades. */
  symbolsPositiveAndAdequate: number;
  /** Symbols with full-range costed return > 0 regardless of sample size (looser read). */
  symbolsPositiveRaw: number;
  /** Symbols with a thin full-range sample (< THIN_CELL_MIN_TRADES trades). */
  symbolsThin: number;
  meanCostedReturn: number;
  meanZeroCostReturn: number;
  meanExpectancy: number;
  meanFrictionDrag: number;
  meanTrades: number;
  /** Fraction of all (symbol × fold) sub-period cells with positive costed return. */
  foldStability: number;
  /**
   * How many of the (symbol × fold) sub-period cells behind foldStability had a
   * THIN sample (< THIN_CELL_MIN_TRADES trades). foldStability does NOT discount
   * these — a positive-but-underpowered fold cell counts toward stability — so a
   * high thin count means the stability number is weaker than it looks. Exposed,
   * not gated, per the review: read foldStability alongside this.
   */
  foldCellsThin: number;
  /** Total (symbol × fold) sub-period cells behind foldStability (the denominator). */
  foldCellsTotal: number;
  /**
   * Symbols whose extreme positive costed return inflates meanCostedReturn — the
   * reason a positive mean can still be MARGINAL (e.g. signal-flip's +24.92% mean
   * driven by SOL/AVAX). Empty when no symbol is an outlier. Deterministic.
   */
  flukeSymbols: FlukeSymbol[];
  /** meanCostedReturn recomputed with flukeSymbols excluded — the mean the typical symbol sees. */
  meanCostedReturnExFlukes: number;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Median of a numeric list (sorted copy; mean of the two middles on even length). */
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * A symbol's costed return is an inflating fluke if it is positive AND either:
 *  - an absolute extreme (≥ FLUKE_ABS_THRESHOLD, i.e. ≥ +100%), OR
 *  - ≥ FLUKE_MEDIAN_MULTIPLE × the cross-symbol median (when the median is
 *    positive — a symbol returning many times the typical symbol dominates the
 *    mean). The median guard avoids flagging everything when the median is ~0.
 * Both thresholds are fixed constants — deterministic, no tuning per run.
 */
const FLUKE_ABS_THRESHOLD = 1.0; // +100% costed return
const FLUKE_MEDIAN_MULTIPLE = 5;

export function aggregateConfig(config: ConfigId, symbols: SymbolResult[]): ConfigAggregate {
  const fullCells = symbols.map((s) => s.full[config]);
  const positiveRaw = fullCells.filter((c) => c.costed.totalReturn > 0);
  const positiveAndAdequate = fullCells.filter(
    (c) => c.costed.totalReturn > 0 && c.costed.totalTrades >= THIN_CELL_MIN_TRADES,
  );
  const thin = fullCells.filter((c) => c.costed.totalTrades < THIN_CELL_MIN_TRADES);

  let foldCellsTotal = 0;
  let foldCellsPositive = 0;
  let foldCellsThin = 0;
  for (const s of symbols) {
    for (const f of s.folds) {
      foldCellsTotal++;
      const cell = f.byConfig[config];
      if (cell.costed.totalReturn > 0) foldCellsPositive++;
      if (cell.costed.totalTrades < THIN_CELL_MIN_TRADES) foldCellsThin++;
    }
  }

  // ── Fluke detection: extreme positive single-symbol returns that inflate the
  // mean. Deterministic — same inputs → same flukes (no Date, no RNG).
  const returns = symbols.map((s) => s.full[config].costed.totalReturn);
  const med = median(returns);
  const flukeSymbols: FlukeSymbol[] = [];
  for (const s of symbols) {
    const ret = s.full[config].costed.totalReturn;
    if (ret <= 0) continue; // only positive returns inflate a (positive) mean
    const isAbsExtreme = ret >= FLUKE_ABS_THRESHOLD;
    const isMedianExtreme = med > 0 && ret >= FLUKE_MEDIAN_MULTIPLE * med;
    if (isAbsExtreme || isMedianExtreme) {
      const why: string[] = [];
      if (isAbsExtreme) why.push(`≥ +${(FLUKE_ABS_THRESHOLD * 100).toFixed(0)}% absolute`);
      if (isMedianExtreme) why.push(`≥ ${FLUKE_MEDIAN_MULTIPLE}× the cross-symbol median (${(med * 100).toFixed(1)}%)`);
      flukeSymbols.push({ symbol: s.symbol, costedReturn: +ret.toFixed(6), reason: why.join(' and ') });
    }
  }
  const flukeSet = new Set(flukeSymbols.map((f) => f.symbol));
  const exFluke = symbols.filter((s) => !flukeSet.has(s.symbol)).map((s) => s.full[config].costed.totalReturn);

  return {
    config,
    symbolsTotal: symbols.length,
    symbolsPositiveAndAdequate: positiveAndAdequate.length,
    symbolsPositiveRaw: positiveRaw.length,
    symbolsThin: thin.length,
    meanCostedReturn: +mean(fullCells.map((c) => c.costed.totalReturn)).toFixed(6),
    meanZeroCostReturn: +mean(fullCells.map((c) => c.zeroCost.totalReturn)).toFixed(6),
    meanExpectancy: +mean(fullCells.map((c) => c.costed.expectancy)).toFixed(6),
    meanFrictionDrag: +mean(fullCells.map((c) => c.frictionDrag)).toFixed(6),
    meanTrades: +mean(fullCells.map((c) => c.costed.totalTrades)).toFixed(1),
    foldStability: foldCellsTotal > 0 ? +(foldCellsPositive / foldCellsTotal).toFixed(4) : 0,
    foldCellsThin,
    foldCellsTotal,
    flukeSymbols,
    meanCostedReturnExFlukes: +mean(exFluke).toFixed(6),
  };
}

/**
 * The deployable verdict for one config. DEPLOYABLE requires ALL of:
 *  - mean cost-adjusted return > 0 AND mean expectancy > 0,
 *  - a MAJORITY of symbols positive-and-adequate (> half),
 *  - mean trade count ≥ THIN_CELL_MIN_TRADES (not a thin overall sample),
 *  - fold stability > 0.5 (positive on a majority of sub-period cells — not one lucky fold).
 * Anything positive that misses one of these is MARGINAL; non-positive mean is NEGATIVE.
 */
export type Verdict = 'DEPLOYABLE' | 'MARGINAL' | 'NEGATIVE';

export function verdictFor(agg: ConfigAggregate): { verdict: Verdict; reasons: string[] } {
  const majority = Math.floor(agg.symbolsTotal / 2) + 1;

  const meanPositive = agg.meanCostedReturn > 0 && agg.meanExpectancy > 0;
  const majorityPositive = agg.symbolsPositiveAndAdequate >= majority;
  const adequateSample = agg.meanTrades >= THIN_CELL_MIN_TRADES;
  const foldRobust = agg.foldStability > 0.5;

  // Collect EVERY failed gate, not just the first. The reasons array flows to
  // REGISTRY + console, so a NEGATIVE config that ALSO fails majority/sample/fold
  // must report all of them — a NEGATIVE that happens to fail every gate should
  // read as such, not be truncated to "mean not positive".
  const reasons: string[] = [];
  if (!meanPositive) reasons.push(`mean cost-adjusted return ${(agg.meanCostedReturn * 100).toFixed(2)}% / expectancy ${(agg.meanExpectancy * 100).toFixed(3)}% not both > 0`);
  if (!majorityPositive) reasons.push(`only ${agg.symbolsPositiveAndAdequate}/${agg.symbolsTotal} symbols positive-and-adequate (need ≥${majority})`);
  if (!adequateSample) reasons.push(`mean ${agg.meanTrades} trades/symbol below the ${THIN_CELL_MIN_TRADES}-trade floor`);
  if (!foldRobust) reasons.push(`fold stability ${(agg.foldStability * 100).toFixed(0)}% ≤ 50% (not robust across time)`);

  // NEGATIVE: the mean cost-adjusted return/expectancy is not positive — the
  // config loses money on average, so it cannot be deployable regardless of the
  // other gates. The reasons array now still carries the co-occurring failures.
  if (!meanPositive) return { verdict: 'NEGATIVE', reasons };

  if (majorityPositive && adequateSample && foldRobust) {
    return { verdict: 'DEPLOYABLE', reasons: ['mean positive, majority of symbols positive-and-adequate, adequate sample, robust across folds'] };
  }
  return { verdict: 'MARGINAL', reasons };
}
