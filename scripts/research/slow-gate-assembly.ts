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

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// ─── Indicators ─────────────────────────────────────────────────────────────

/** EMA series aligned to input; null until `period-1` (seeded with SMA). */
export function emaSeries(values: number[], period: number): (number | null)[] {
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new Error(`period must be a safe integer greater than 0; got ${String(period)}.`);
  }
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) {
      throw new Error(`values[${i}] must be a finite number; got ${String(values[i])}.`);
    }
  }

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
  for (let i = 0; i < closes.length; i++) {
    if (!Number.isFinite(closes[i]) || closes[i] <= 0) {
      throw new Error(`closes[${i}] must be a finite positive number; got ${String(closes[i])}.`);
    }
  }

  const ema = emaSeries(closes, period);
  return closes.map((c, i) => (ema[i] === null ? false : c > ema[i]!));
}

// ─── Sizing ─────────────────────────────────────────────────────────────────

function formatInputValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

function isRegimeLabel(value: unknown): value is RegimeLabel {
  return value === 'trend' || value === 'volatile' || value === 'range';
}

/**
 * Regime size ratios from the SHIPPED allocator regime rules
 * (maxSinglePositionPct trend=15 / volatile=8 / range=6), normalized to
 * trend=1. Null/unknown warmup falls back to range sizing (plan D1 semantics).
 */
export function hmmSizeForRegime(regime: RegimeLabel | null): number {
  switch (regime) {
    case 'trend':
      return 1.0;
    case 'volatile':
      return 8 / 15;
    case 'range':
    case null:
      return 6 / 15;
    default:
      throw new Error(
        `regime must be "trend", "volatile", "range", or null; got ${formatInputValue(regime)}.`,
      );
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
  if (!Number.isFinite(targetAnnVol) || targetAnnVol <= 0) {
    throw new Error(`targetAnnVol must be a finite positive annualized volatility target; got ${String(targetAnnVol)}.`);
  }
  if (!Number.isSafeInteger(lookback) || lookback <= 1) {
    throw new Error(`lookback must be a safe integer greater than 1; got ${String(lookback)}.`);
  }
  for (let i = 0; i < dailyReturns.length; i++) {
    const dailyReturn = dailyReturns[i];
    if (!Number.isFinite(dailyReturn) || dailyReturn <= -1) {
      throw new Error(`dailyReturns[${i}] must be a finite return greater than -1; got ${String(dailyReturn)}.`);
    }
  }

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

function assertFiniteNonNegativeCost(name: keyof SlowGateCosts, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`costs.${name} must be a finite non-negative percentage; got ${String(value)}.`);
  }
}

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
  if (bars.length !== exposures.length || bars.length < 2) {
    throw new Error(
      `bars and exposures must align with length >= 2; got bars=${bars.length} exposures=${exposures.length}.`,
    );
  }
  assertStrictlyIncreasingMillisecondTimestamps('bars', bars);
  assertDailyCadence('bars', bars);
  assertFiniteNonNegativeCost('feePctPerSide', costs.feePctPerSide);
  assertFiniteNonNegativeCost('slippagePctPerSide', costs.slippagePctPerSide);
  assertFiniteNonNegativeCost('fundingPctPer8h', costs.fundingPctPer8h);

  const sidePct = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  const fundingPerDay = (costs.fundingPctPer8h * 3) / 100;

  const equity: number[] = new Array(bars.length).fill(1);
  let eq = 1;
  let prevExposure = 0;
  let totalCostPct = 0;
  let flips = 0;
  let exposureSum = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!Number.isFinite(bar.close) || bar.close <= 0) {
      throw new Error(`bars[${i}].close must be a finite positive number; got ${String(bar.close)}.`);
    }

    const rawExposure = exposures[i];
    if (
      rawExposure !== null &&
      (!Number.isFinite(rawExposure) || rawExposure < 0 || rawExposure > 1)
    ) {
      throw new Error(`exposures[${i}] must be null or a finite number between 0 and 1; got ${String(rawExposure)}.`);
    }

    const target = rawExposure ?? 0;
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
  for (let i = 0; i < equity.length; i++) {
    if (!Number.isFinite(equity[i]) || equity[i] <= 0) {
      throw new Error(`equity[${i}] must be a finite positive number; got ${String(equity[i])}.`);
    }
    if (!Number.isSafeInteger(timestamps[i])) {
      throw new Error(`timestamps[${i}] must be a safe integer millisecond timestamp; got ${String(timestamps[i])}.`);
    }
    if (i > 0) {
      if (timestamps[i] <= timestamps[i - 1]) {
        throw new Error(
          `timestamps[${i}] must be greater than timestamps[${i - 1}] (${timestamps[i - 1]}); got ${timestamps[i]}.`,
        );
      }
      const observedStep = timestamps[i] - timestamps[i - 1];
      if (observedStep < DAY_MS) {
        throw new Error(
          `timestamps[${i}] must be at least ${DAY_MS}ms after timestamps[${i - 1}]; got ${observedStep}ms.`,
        );
      }
      if (i > 1) {
        const previousStep = timestamps[i - 1] - timestamps[i - 2];
        if (observedStep !== previousStep) {
          throw new Error(
            `timestamps[${i}] must repeat the prior ${previousStep}ms cadence after timestamps[${i - 1}]; got ${observedStep}ms.`,
          );
        }
      }
    }
  }
  const years = (timestamps[timestamps.length - 1] - timestamps[0]) / (365 * DAY_MS);
  const total = equity[equity.length - 1] / equity[0];
  const cagr = Math.pow(total, 1 / years) - 1;

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

function assertStrictlyIncreasingMillisecondTimestamps(
  label: 'bars' | 'dayBars' | 'h1Bars',
  rows: Array<{ timestamp: number }>,
): void {
  for (let i = 0; i < rows.length; i++) {
    const timestamp = rows[i].timestamp;
    if (!Number.isSafeInteger(timestamp)) {
      throw new Error(`${label}[${i}].timestamp must be a safe integer millisecond timestamp; got ${String(timestamp)}.`);
    }
    if (i > 0 && timestamp <= rows[i - 1].timestamp) {
      throw new Error(
        `${label}[${i}].timestamp must be greater than ${label}[${i - 1}].timestamp (${rows[i - 1].timestamp}); got ${timestamp}.`,
      );
    }
  }
}

function assertDailyCadence(
  label: 'bars' | 'dayBars',
  rows: Array<{ timestamp: number }>,
): void {
  for (let i = 1; i < rows.length; i++) {
    const observedStep = rows[i].timestamp - rows[i - 1].timestamp;
    if (observedStep !== DAY_MS) {
      throw new Error(
        `${label}[${i}].timestamp must be exactly ${DAY_MS}ms after ${label}[${i - 1}].timestamp; got ${observedStep}ms.`,
      );
    }
  }
}

function assertHourlyCadence(
  label: 'h1Bars',
  rows: Array<{ timestamp: number }>,
): void {
  for (let i = 1; i < rows.length; i++) {
    const observedStep = rows[i].timestamp - rows[i - 1].timestamp;
    if (observedStep !== HOUR_MS) {
      throw new Error(
        `${label}[${i}].timestamp must be exactly ${HOUR_MS}ms after ${label}[${i - 1}].timestamp; got ${observedStep}ms.`,
      );
    }
  }
}

function assertRegimeH1BarValues(rows: RegimeH1Bar[]): void {
  const priceFields: Array<'open' | 'high' | 'low' | 'close'> = ['open', 'high', 'low', 'close'];

  for (let i = 0; i < rows.length; i++) {
    const bar = rows[i];
    for (const field of priceFields) {
      if (!Number.isFinite(bar[field]) || bar[field] <= 0) {
        throw new Error(`h1Bars[${i}].${field} must be a finite positive number; got ${String(bar[field])}.`);
      }
    }
    if (!Number.isFinite(bar.volume) || bar.volume < 0) {
      throw new Error(`h1Bars[${i}].volume must be a finite non-negative number; got ${String(bar.volume)}.`);
    }
    if (bar.high < bar.low || bar.open < bar.low || bar.open > bar.high || bar.close < bar.low || bar.close > bar.high) {
      throw new Error(`h1Bars[${i}] must satisfy low <= open/close <= high and high >= low.`);
    }
  }
}

function formatUtcDateHour(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
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
  if (!Number.isSafeInteger(windowBars) || windowBars <= 0) {
    throw new Error(`windowBars must be a safe integer greater than 0; got ${String(windowBars)}.`);
  }
  assertStrictlyIncreasingMillisecondTimestamps('dayBars', dayBars);
  assertDailyCadence('dayBars', dayBars);
  assertStrictlyIncreasingMillisecondTimestamps('h1Bars', h1Bars);
  assertHourlyCadence('h1Bars', h1Bars);
  assertRegimeH1BarValues(h1Bars);

  const DAY = 86_400_000;
  const out: (RegimeLabel | null)[] = [];
  let hi = 0;
  for (const day of dayBars) {
    const cutoff = day.timestamp + DAY;
    while (hi < h1Bars.length && h1Bars[hi].timestamp < cutoff) hi++;
    const expectedDayCloseH1 = cutoff - HOUR_MS;
    const latestH1BeforeCutoff = hi > 0 ? h1Bars[hi - 1] : null;
    if (latestH1BeforeCutoff === null || latestH1BeforeCutoff.timestamp !== expectedDayCloseH1) {
      throw new Error(
        `Insufficient H1 coverage for dayBars[${out.length}]: expected latest H1 bar ${formatUtcDateHour(expectedDayCloseH1)} before classifier input; got ${latestH1BeforeCutoff === null ? 'none' : formatUtcDateHour(latestH1BeforeCutoff.timestamp)}.`,
      );
    }
    const window = h1Bars.slice(Math.max(0, hi - windowBars), hi);
    if (window.length === 0) {
      out.push(null);
      continue;
    }
    try {
      const regime = classify(window) as unknown;
      if (!isRegimeLabel(regime)) {
        throw new Error(
          `classifier returned invalid regime label at dayBars[${out.length}]: ${formatInputValue(regime)}.`,
        );
      }
      out.push(regime);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.startsWith('classifier returned invalid regime label')) {
          throw error;
        }
        if (error.message.startsWith('insufficient data')) {
          out.push(null);
          continue;
        }
      }
      throw error;
    }
  }
  return out;
}
