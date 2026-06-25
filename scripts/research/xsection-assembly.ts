/**
 * Pure cross-sectional rotation assembly for the Phase 5 Track B validation
 * (xsection-validation.ts is the thin I/O shell). Spec + frozen gates:
 * docs/plans/2026-06-13-phase5-carry-xsection-research.md (D3/D4).
 *
 * Accounting model (tested in xsection-assembly.test.ts):
 *  - daily grid = sorted union of all symbols' bar-open timestamps; nulls
 *    where a symbol has no bar.
 *  - eligible at index i ⇔ non-null closes at every index in [i−lookback, i].
 *  - decision at rebalance index i uses closes ≤ i; weights take effect from
 *    index i+1's returns (no look-ahead). Weights fixed between rebalances
 *    (drift ignored — disclosed).
 *  - daily portfolio return = Σ w_s × (close_t/close_{t−1} − 1); a held
 *    symbol with a missing bar contributes 0 that day (counted).
 *  - turnover cost at a rebalance = Σ|Δw| × XS_SIDE_COST, multiplicative on
 *    equity. Long-only: top-K at 1/K (fewer eligible → all, equal-weight;
 *    none → cash). Long-short: +1/(2K) top, −1/(2K) bottom (gross 1.0).
 *  - Sharpe = mean(daily)/sd(daily, N−1) × √365 (PR #110 convention); 0 on
 *    zero variance.
 *
 * Determinism: pure functions, ties in ranking break by symbol name. No Date.now().
 */

/** Phase 2 crypto cost per side (taker 0.05% + slippage 0.15%). */
export const XS_SIDE_COST = 0.002;

export interface DailySeries {
  symbol: string;
  bars: Array<{ ts: number; close: number }>;
}

export interface DailyGrid {
  ts: number[];
  closes: Record<string, Array<number | null>>;
}

export function buildGrid(series: DailySeries[]): DailyGrid {
  const tsSet = new Set<number>();
  for (const s of series) for (const b of s.bars) tsSet.add(b.ts);
  const ts = [...tsSet].sort((a, b) => a - b);
  const index = new Map(ts.map((t, i) => [t, i]));
  const closes: Record<string, Array<number | null>> = {};
  for (const s of series) {
    const arr: Array<number | null> = new Array(ts.length).fill(null);
    for (const b of s.bars) {
      if (arr[index.get(b.ts)!] !== null) throw new Error(`buildGrid: duplicate bar ts ${b.ts} for ${s.symbol}`);
      arr[index.get(b.ts)!] = b.close;
    }
    closes[s.symbol] = arr;
  }
  return { ts, closes };
}

function eligibleAt(grid: DailyGrid, symbol: string, i: number, lookback: number): boolean {
  if (i < lookback) return false;
  const arr = grid.closes[symbol];
  for (let k = i - lookback; k <= i; k++) {
    if (arr[k] === null) return false;
  }
  return true;
}

function trailingReturn(grid: DailyGrid, symbol: string, i: number, lookback: number): number {
  const arr = grid.closes[symbol];
  return (arr[i] as number) / (arr[i - lookback] as number) - 1;
}

export interface XsectionOptions {
  mode: 'long-only' | 'long-short';
  topK: number;
  lookback: number;
  rebalanceEvery: number;
}

export interface RebalanceRecord {
  /** Grid index of the decision bar. */
  index: number;
  ts: number;
  weights: Record<string, number>;
  turnover: number;
  eligibleCount: number;
}

export interface XsectionResult {
  finalEquity: number;
  totalReturn: number;
  sharpe: number;
  maxDrawdown: number;
  /** Daily portfolio returns from grid index 1 to the end (0 before the first rebalance takes effect). */
  dailyReturns: number[];
  rebalances: RebalanceRecord[];
  totalTurnoverCost: number;
  /** Held-position slot-days with a missing/zero bar (one increment per held symbol per affected day, NOT distinct calendar days). */
  missingPositionDays: number;
  firstTs: number;
  lastTs: number;
}

/** Weights for one decision bar under the given mode. Ties break by symbol name. */
function decideWeights(grid: DailyGrid, i: number, opts: XsectionOptions): { weights: Record<string, number>; eligibleCount: number } {
  const eligible = Object.keys(grid.closes)
    .filter((s) => eligibleAt(grid, s, i, opts.lookback))
    .sort();
  const ranked = eligible
    .map((s) => ({ s, r: trailingReturn(grid, s, i, opts.lookback) }))
    .sort((a, b) => b.r - a.r || a.s.localeCompare(b.s));

  const weights: Record<string, number> = {};
  if (opts.mode === 'long-only') {
    const held = ranked.slice(0, opts.topK);
    for (const h of held) weights[h.s] = 1 / held.length;
  } else {
    // long-short needs at least 2K eligible to be meaningfully dollar-neutral;
    // with fewer, hold cash (weights empty) — disclosed via eligibleCount.
    if (ranked.length >= 2 * opts.topK) {
      for (const h of ranked.slice(0, opts.topK)) weights[h.s] = 1 / (2 * opts.topK);
      for (const h of ranked.slice(-opts.topK)) weights[h.s] = -1 / (2 * opts.topK);
    }
  }
  return { weights, eligibleCount: eligible.length };
}

function runPortfolio(
  grid: DailyGrid,
  opts: XsectionOptions,
  decide: (i: number) => { weights: Record<string, number>; eligibleCount: number },
): XsectionResult {
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let weights: Record<string, number> = {};
  let totalTurnoverCost = 0;
  let missingPositionDays = 0;
  const dailyReturns: number[] = [];
  const rebalances: RebalanceRecord[] = [];

  for (let i = 1; i < grid.ts.length; i++) {
    // 1) earn today's return on yesterday's weights
    let r = 0;
    for (const [s, w] of Object.entries(weights)) {
      const arr = grid.closes[s];
      const prev = arr[i - 1];
      const cur = arr[i];
      if (prev === null || cur === null || prev === 0) {
        missingPositionDays++;
        continue; // missing bar contributes 0 (counted)
      }
      r += w * (cur / prev - 1);
    }
    equity *= 1 + r;
    // Rounded for JSON-stable determinism; feeds dailySharpe (sd===0 guard makes the degenerate all-zero case safe).
    dailyReturns.push(+r.toFixed(12));

    // 2) rebalance AT this bar's close → new weights effective from i+1
    if ((i - opts.lookback) >= 0 && (i - opts.lookback) % opts.rebalanceEvery === 0) {
      const { weights: next, eligibleCount } = decide(i);
      const keys = new Set([...Object.keys(weights), ...Object.keys(next)]);
      let turnover = 0;
      for (const k of keys) turnover += Math.abs((next[k] ?? 0) - (weights[k] ?? 0));
      const cost = turnover * XS_SIDE_COST;
      equity *= 1 - cost;
      totalTurnoverCost += cost;
      weights = next;
      rebalances.push({ index: i, ts: grid.ts[i], weights: next, turnover: +turnover.toFixed(10), eligibleCount });
    }

    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    finalEquity: +equity.toFixed(10),
    totalReturn: +(equity - 1).toFixed(10),
    sharpe: +dailySharpe(dailyReturns).toFixed(6),
    maxDrawdown: +maxDrawdown.toFixed(10),
    dailyReturns,
    rebalances,
    totalTurnoverCost: +totalTurnoverCost.toFixed(10),
    missingPositionDays,
    firstTs: grid.ts[0],
    lastTs: grid.ts[grid.ts.length - 1],
  };
}

export function runXsection(grid: DailyGrid, opts: XsectionOptions): XsectionResult {
  return runPortfolio(grid, opts, (i) => decideWeights(grid, i, opts));
}

/** The apples-to-apples benchmark: equal-weight ALL eligible, same machinery + costs. */
export function runBasket(grid: DailyGrid, opts: { lookback: number; rebalanceEvery: number }): XsectionResult {
  const full: XsectionOptions = { ...opts, mode: 'long-only', topK: Number.MAX_SAFE_INTEGER };
  return runPortfolio(grid, full, (i) => {
    const eligible = Object.keys(grid.closes).filter((s) => eligibleAt(grid, s, i, opts.lookback)).sort();
    const weights: Record<string, number> = {};
    for (const s of eligible) weights[s] = eligible.length > 0 ? 1 / eligible.length : 0;
    return { weights, eligibleCount: eligible.length };
  });
}

/** BTC buy-and-hold reference through the same machinery (hold BTCUSD from the first rebalance). */
export function btcHold(grid: DailyGrid, opts: { lookback: number; rebalanceEvery: number }): XsectionResult {
  const full: XsectionOptions = { ...opts, mode: 'long-only', topK: 1 };
  return runPortfolio(grid, full, (i) => {
    const ok = eligibleAt(grid, 'BTCUSD', i, opts.lookback);
    return { weights: ok ? { BTCUSD: 1 } : {}, eligibleCount: ok ? 1 : 0 };
  });
}

/** mean/sd(N−1) × √365; 0 on zero variance or < 2 samples. */
export function dailySharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, x) => s + x, 0) / returns.length;
  const variance = returns.reduce((s, x) => s + (x - mean) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  return (mean / sd) * Math.sqrt(365);
}

export interface GridFold { label: string; from: number; to: number }

/** n contiguous index ranges over the grid (last takes the remainder). */
export function splitGridFolds(grid: DailyGrid, n: number): GridFold[] {
  if (n <= 0) throw new Error('splitGridFolds: n must be >= 1');
  const size = Math.floor(grid.ts.length / n);
  const out: GridFold[] = [];
  for (let f = 0; f < n; f++) {
    out.push({ label: `fold${f + 1}`, from: f * size, to: f === n - 1 ? grid.ts.length - 1 : (f + 1) * size - 1 });
  }
  return out;
}

/** Slice a grid to an index range (fold runs standalone — warmup restarts). */
export function sliceGrid(grid: DailyGrid, from: number, to: number): DailyGrid {
  return {
    ts: grid.ts.slice(from, to + 1),
    closes: Object.fromEntries(Object.entries(grid.closes).map(([s, arr]) => [s, arr.slice(from, to + 1)])),
  };
}

/** The FROZEN Track B gates (spec D4): beat the basket on return AND Sharpe, ≥3/4 folds of positive excess. */
export interface XsectionGateInput {
  strategyReturn: number;
  basketReturn: number;
  strategySharpe: number;
  basketSharpe: number;
  foldsExcessPositive: number;
  foldsTotal: number;
}
export function xsectionGates(g: XsectionGateInput): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!(g.strategyReturn > g.basketReturn)) reasons.push(`return ${(g.strategyReturn * 100).toFixed(2)}% ≤ basket ${(g.basketReturn * 100).toFixed(2)}% (rotation that matches the basket is churn)`);
  if (!(g.strategySharpe > g.basketSharpe)) reasons.push(`Sharpe ${g.strategySharpe.toFixed(2)} ≤ basket ${g.basketSharpe.toFixed(2)}`);
  if (!(g.foldsExcessPositive >= Math.min(3, g.foldsTotal))) reasons.push(`only ${g.foldsExcessPositive}/${g.foldsTotal} folds with positive excess (need ≥${Math.min(3, g.foldsTotal)})`);
  return { pass: reasons.length === 0, reasons };
}
