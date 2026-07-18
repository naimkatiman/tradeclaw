/**
 * Slow regime-gate sandbox assembly (pure functions, no I/O).
 *
 * Spec: docs/plans/2026-07-18-slow-regime-gate-sandbox.md. Parameters are
 * pre-registered there — this module contains NO tunable defaults beyond the
 * spec. The CLI (slow-gate-cli.ts) owns loading, wiring, and reporting.
 *
 * Execution model (no lookahead): exposure is decided at day t's close from
 * data available at that close, and applies to the close(t) -> close(t+1)
 * return. Exposure changes pay one side of fee+slippage per unit changed;
 * funding accrues per held exposure-day (perp sensitivity only — the spot
 * cost model sets funding to zero).
 */

export interface DailyBar {
  timestamp: number;
  close: number;
}

export interface SlowGateCosts {
  /** Percent per side, e.g. 0.1 = 0.1%. */
  feePctPerSide: number;
  /** Percent per side. */
  slippagePctPerSide: number;
  /** Percent per 8h held (perp funding upper bound; 0 for spot). */
  fundingPctPer8h: number;
}

export interface SimResult {
  /** Equity curve, one entry per daily bar, starting at 1. */
  equity: number[];
  /** Cumulative cost paid, in percent of equity (sum of per-day charges). */
  totalCostPct: number;
  /** Number of exposure changes (turnover events, |delta| > 1e-9). */
  flips: number;
  /** Mean absolute exposure across days. */
  avgExposure: number;
}

export interface Metrics {
  cagr: number;
  maxDrawdown: number;
  calmar: number | null;
  sharpe: number | null;
  years: number;
}

export type RegimeLabel = 'trend' | 'volatile' | 'range';

// ─── Indicators ─────────────────────────────────────────────────────────────

/** EMA series aligned to input; null until `period-1` (seeded with SMA). */
export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  out[period - 1] = ema;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

/** Long/flat gate: true when close > EMA(period). False during warmup (flat). */
export function trendGateSeries(closes: number[], period: number): boolean[] {
  const ema = emaSeries(closes, period);
  return closes.map((c, i) => (ema[i] === null ? false : c > ema[i]!));
}

// ─── Sizing ─────────────────────────────────────────────────────────────────

/**
 * Regime size ratios from the SHIPPED allocator regime rules
 * (maxSinglePositionPct trend=15 / volatile=8 / range=6), normalized to
 * trend=1. Null/unknown falls back to range sizing (plan D1 semantics).
 */
export function hmmSizeForRegime(regime: RegimeLabel | null): number {
  switch (regime) {
    case 'trend':
      return 1.0;
    case 'volatile':
      return 8 / 15;
    default:
      return 6 / 15;
  }
}

/**
 * Inverse-vol target exposure: min(1, targetAnnVol / realizedAnnVol) using a
 * trailing `lookback` of daily returns (365d annualization — crypto trades
 * every day). Null during warmup.
 */
export function volTargetSeries(
  dailyReturns: number[],
  targetAnnVol: number,
  lookback: number,
): (number | null)[] {
  const out: (number | null)[] = new Array(dailyReturns.length).fill(null);
  for (let i = lookback - 1; i < dailyReturns.length; i++) {
    const window = dailyReturns.slice(i - lookback + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / lookback;
    const variance = window.reduce((a, b) => a + (b - mean) * (b - mean), 0) / lookback;
    const annVol = Math.sqrt(variance) * Math.sqrt(365);
    out[i] = annVol <= 0 ? 1 : Math.min(1, targetAnnVol / annVol);
  }
  return out;
}

// ─── Simulation ─────────────────────────────────────────────────────────────

/**
 * Daily close-to-close simulation. `exposures[i]` (0..1, null = flat) is the
 * exposure held from close(i) to close(i+1). Turnover cost = |delta exposure|
 * x one side of (fee + slippage). Funding = exposure x fundingPctPer8h x 3
 * per day held.
 */
export function simulateDaily(
  bars: DailyBar[],
  exposures: (number | null)[],
  costs: SlowGateCosts,
): SimResult {
  if (bars.length !== exposures.length) {
    throw new Error(`bars (${bars.length}) and exposures (${exposures.length}) must align`);
  }
  const sidePct = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  const fundingPerDay = (costs.fundingPctPer8h * 3) / 100;

  const equity: number[] = new Array(bars.length).fill(1);
  let eq = 1;
  let prevExposure = 0;
  let totalCostPct = 0;
  let flips = 0;
  let exposureSum = 0;

  for (let i = 0; i < bars.length; i++) {
    const target = exposures[i] ?? 0;
    const turnover = Math.abs(target - prevExposure);
    if (turnover > 1e-9) flips++;
    // Cost of moving to today's target exposure, charged at today's close.
    const turnoverCost = turnover * sidePct;
    // Funding for the day ahead while holding `target`.
    const fundingCost = target * fundingPerDay;
    eq *= 1 - turnoverCost;
    totalCostPct += turnover * (costs.feePctPerSide + costs.slippagePctPerSide);
    equity[i] = eq;
    exposureSum += target;

    if (i < bars.length - 1) {
      const ret = bars[i + 1].close / bars[i].close - 1;
      eq *= 1 + target * ret;
      eq *= 1 - fundingCost;
      if (fundingCost > 0) totalCostPct += target * costs.fundingPctPer8h * 3;
    }
    prevExposure = target;
  }
  // Final bar's equity reflects the last day's return.
  equity[bars.length - 1] = eq;

  return {
    equity,
    totalCostPct,
    flips,
    avgExposure: bars.length > 0 ? exposureSum / bars.length : 0,
  };
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export function computeMetrics(equity: number[], timestamps: number[]): Metrics {
  if (equity.length !== timestamps.length || equity.length < 2) {
    throw new Error('equity and timestamps must align with length >= 2');
  }
  const years = (timestamps[timestamps.length - 1] - timestamps[0]) / (365 * 86_400_000);
  const total = equity[equity.length - 1] / equity[0];
  const cagr = years > 0 ? Math.pow(total, 1 / years) - 1 : 0;

  let peak = equity[0];
  let maxDrawdown = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = 1 - e / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) rets.push(equity[i] / equity[i - 1] - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rets.length;
  const dailyVol = Math.sqrt(variance);
  const sharpe = dailyVol > 0 ? (mean / dailyVol) * Math.sqrt(365) : null;

  return {
    cagr,
    maxDrawdown,
    calmar: maxDrawdown > 0 ? cagr / maxDrawdown : null,
    sharpe,
    years,
  };
}

// ─── Regime downsampling ────────────────────────────────────────────────────

export interface RegimeH1Bar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Daily regime series: for each daily bar, classify from the trailing
 * `windowBars` H1 bars that OPENED within or before that day (the last such
 * bar closes exactly at the daily close — no lookahead). A classifier throw
 * (warmup) yields null for that day.
 */
export function dailyRegimeSeries(
  dayBars: DailyBar[],
  h1Bars: RegimeH1Bar[],
  classify: (bars: RegimeH1Bar[]) => RegimeLabel,
  windowBars: number,
): (RegimeLabel | null)[] {
  const DAY = 86_400_000;
  const out: (RegimeLabel | null)[] = [];
  let hi = 0;
  for (const day of dayBars) {
    const cutoff = day.timestamp + DAY;
    while (hi < h1Bars.length && h1Bars[hi].timestamp < cutoff) hi++;
    const window = h1Bars.slice(Math.max(0, hi - windowBars), hi);
    if (window.length === 0) {
      out.push(null);
      continue;
    }
    try {
      out.push(classify(window));
    } catch {
      out.push(null);
    }
  }
  return out;
}
