/**
<<<<<<< HEAD
 * Technical Analysis Engine — pure math, zero dependencies
 * All standard TA indicators implemented from scratch
 */

import type { OHLCV } from "./ohlcv";
=======
 * Technical Analysis Engine — pure math, hand-rolled + trading-signals for ADX
 * All standard TA indicators implemented from scratch except ADX (uses library)
 */

import type { OHLCV } from "./ohlcv";
import { ADX as LibADX } from "trading-signals";
>>>>>>> origin/main

// ─── Result Types ────────────────────────────────────────────

export interface RSIResult {
  values: number[]; // RSI values for each candle (NaN for insufficient data)
  current: number;
}

export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
  current: { macd: number; signal: number; histogram: number };
}

export interface EMAResult {
  ema20: number[];
  ema50: number[];
  ema200: number[];
  current: { ema20: number; ema50: number; ema200: number };
}

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  current: { upper: number; middle: number; lower: number; bandwidth: number };
}

export interface StochasticResult {
  k: number[];
  d: number[];
  current: { k: number; d: number };
}

<<<<<<< HEAD
=======
export interface ADXResult {
  adx: number[]; // ADX values (NaN for insufficient data)
  plusDI: number[];
  minusDI: number[];
  current: { adx: number; plusDI: number; minusDI: number };
}

export interface VolumeResult {
  sma: number[]; // Volume SMA values
  currentVolume: number;
  currentSMA: number;
  ratio: number; // currentVolume / currentSMA (>1 = above average)
  isSynthetic: boolean; // true if volume data looks synthetic/unreliable
}

>>>>>>> origin/main
export interface AllIndicators {
  rsi: RSIResult;
  macd: MACDResult;
  ema: EMAResult;
  bollinger: BollingerResult;
  stochastic: StochasticResult;
<<<<<<< HEAD
  closes: number[];
  highs: number[];
  lows: number[];
=======
  adx: ADXResult;
  volume: VolumeResult;
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
>>>>>>> origin/main
}

// ─── Helper Functions ────────────────────────────────────────

/**
 * Calculate Exponential Moving Average
 */
function calcEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;

  // First EMA value is SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  // EMA multiplier
  const multiplier = 2 / (period + 1);

  // Calculate remaining EMA values
  for (let i = period; i < data.length; i++) {
    result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
  }

  return result;
}

/**
 * Calculate Simple Moving Average
 */
function calcSMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    result[i] = sum / period;
  }

  return result;
}

// ─── RSI (Wilder's Method) ───────────────────────────────────

/**
 * Calculate RSI using Wilder's smoothing method
 * @param closes - Array of closing prices
 * @param period - RSI period (default 14)
 */
export function calculateRSI(closes: number[], period: number = 14): RSIResult {
  const values: number[] = new Array(closes.length).fill(NaN);

  if (closes.length < period + 1) {
    return { values, current: NaN };
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // First average gain/loss (SMA of first `period` changes)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  if (avgLoss === 0) {
    values[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    values[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      values[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      values[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  const lastValid = values.filter((v) => !isNaN(v));
  return {
    values,
    current: lastValid.length > 0 ? lastValid[lastValid.length - 1] : NaN,
  };
}

// ─── MACD ────────────────────────────────────────────────────

/**
 * Calculate MACD (Moving Average Convergence/Divergence)
 * @param closes - Array of closing prices
 * @param fastPeriod - Fast EMA period (default 12)
 * @param slowPeriod - Slow EMA period (default 26)
 * @param signalPeriod - Signal line period (default 9)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const emaFast = calcEMA(closes, fastPeriod);
  const emaSlow = calcEMA(closes, slowPeriod);

  // MACD line = Fast EMA - Slow EMA
  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(emaFast[i]) && !isNaN(emaSlow[i])) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }

  // Signal line = EMA of MACD line
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalEma = calcEMA(validMacd, signalPeriod);

  // Map signal back to full array
  const signalLine: number[] = new Array(closes.length).fill(NaN);
  let validIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macdLine[i])) {
      signalLine[i] = signalEma[validIdx] ?? NaN;
      validIdx++;
    }
  }

  // Histogram = MACD - Signal
  const histogram: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macdLine[i]) && !isNaN(signalLine[i])) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  const lastMacd = macdLine.filter((v) => !isNaN(v));
  const lastSignal = signalLine.filter((v) => !isNaN(v));
  const lastHist = histogram.filter((v) => !isNaN(v));

  return {
    macdLine,
    signalLine,
    histogram,
    current: {
      macd: lastMacd.length > 0 ? lastMacd[lastMacd.length - 1] : 0,
      signal: lastSignal.length > 0 ? lastSignal[lastSignal.length - 1] : 0,
      histogram: lastHist.length > 0 ? lastHist[lastHist.length - 1] : 0,
    },
  };
}

// ─── EMA (Multiple Periods) ─────────────────────────────────

/**
 * Calculate EMA for standard periods (20, 50, 200)
 */
export function calculateEMAs(closes: number[]): EMAResult {
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);

  const last20 = ema20.filter((v) => !isNaN(v));
  const last50 = ema50.filter((v) => !isNaN(v));
  const last200 = ema200.filter((v) => !isNaN(v));

  return {
    ema20,
    ema50,
    ema200,
    current: {
      ema20: last20.length > 0 ? last20[last20.length - 1] : NaN,
      ema50: last50.length > 0 ? last50[last50.length - 1] : NaN,
      ema200: last200.length > 0 ? last200[last200.length - 1] : NaN,
    },
  };
}

// ─── Bollinger Bands ─────────────────────────────────────────

/**
 * Calculate Bollinger Bands
 * @param closes - Array of closing prices
 * @param period - SMA period (default 20)
 * @param stdDevMultiplier - Standard deviation multiplier (default 2)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerResult {
  const middle = calcSMA(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  const bandwidth: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    // Calculate standard deviation
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - middle[i];
      sumSqDiff += diff * diff;
    }
    const stdDev = Math.sqrt(sumSqDiff / period);

    upper[i] = middle[i] + stdDevMultiplier * stdDev;
    lower[i] = middle[i] - stdDevMultiplier * stdDev;
    bandwidth[i] =
      middle[i] > 0 ? ((upper[i] - lower[i]) / middle[i]) * 100 : 0;
  }

  const lastUpper = upper.filter((v) => !isNaN(v));
  const lastMiddle = middle.filter((v) => !isNaN(v));
  const lastLower = lower.filter((v) => !isNaN(v));
  const lastBw = bandwidth.filter((v) => !isNaN(v));

  return {
    upper,
    middle,
    lower,
    bandwidth,
    current: {
      upper: lastUpper.length > 0 ? lastUpper[lastUpper.length - 1] : NaN,
      middle: lastMiddle.length > 0 ? lastMiddle[lastMiddle.length - 1] : NaN,
      lower: lastLower.length > 0 ? lastLower[lastLower.length - 1] : NaN,
      bandwidth: lastBw.length > 0 ? lastBw[lastBw.length - 1] : NaN,
    },
  };
}

// ─── Stochastic Oscillator ──────────────────────────────────

/**
 * Calculate Stochastic Oscillator
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param kPeriod - %K period (default 14)
 * @param kSmooth - %K smoothing (default 3)
 * @param dPeriod - %D period (default 3)
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  kSmooth: number = 3,
  dPeriod: number = 3
): StochasticResult {
  const len = closes.length;
  const rawK: number[] = new Array(len).fill(NaN);

  // Calculate raw %K
  for (let i = kPeriod - 1; i < len; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }
    const range = highestHigh - lowestLow;
    rawK[i] = range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100;
  }

  // Smooth %K with SMA
  const validRawK = rawK.filter((v) => !isNaN(v));
  const smoothedK = calcSMA(validRawK, kSmooth);

  // Map back to full array
  const k: number[] = new Array(len).fill(NaN);
  let rawIdx = 0;
  for (let i = 0; i < len; i++) {
    if (!isNaN(rawK[i])) {
      k[i] = smoothedK[rawIdx] ?? NaN;
      rawIdx++;
    }
  }

  // %D = SMA of %K
  const validK = k.filter((v) => !isNaN(v));
  const dSma = calcSMA(validK, dPeriod);

  const d: number[] = new Array(len).fill(NaN);
  let kIdx = 0;
  for (let i = 0; i < len; i++) {
    if (!isNaN(k[i])) {
      d[i] = dSma[kIdx] ?? NaN;
      kIdx++;
    }
  }

  const lastK = k.filter((v) => !isNaN(v));
  const lastD = d.filter((v) => !isNaN(v));

  return {
    k,
    d,
    current: {
      k: lastK.length > 0 ? lastK[lastK.length - 1] : 50,
      d: lastD.length > 0 ? lastD[lastD.length - 1] : 50,
    },
  };
}

// ─── Find Support/Resistance (Swing Points) ─────────────────

/**
 * Find swing high/low levels from recent price action
 */
export function findSwingLevels(
  highs: number[],
  lows: number[],
  lookback: number = 50
): { support: number[]; resistance: number[] } {
  const startIdx = Math.max(0, highs.length - lookback);
  const recentHighs = highs.slice(startIdx);
  const recentLows = lows.slice(startIdx);

  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 2; i < recentHighs.length - 2; i++) {
    // Swing high: higher than 2 candles on each side
    if (
      recentHighs[i] > recentHighs[i - 1] &&
      recentHighs[i] > recentHighs[i - 2] &&
      recentHighs[i] > recentHighs[i + 1] &&
      recentHighs[i] > recentHighs[i + 2]
    ) {
      swingHighs.push(recentHighs[i]);
    }

    // Swing low: lower than 2 candles on each side
    if (
      recentLows[i] < recentLows[i - 1] &&
      recentLows[i] < recentLows[i - 2] &&
      recentLows[i] < recentLows[i + 1] &&
      recentLows[i] < recentLows[i + 2]
    ) {
      swingLows.push(recentLows[i]);
    }
  }

  // Sort and take top 2 closest to current price
  swingHighs.sort((a, b) => b - a);
  swingLows.sort((a, b) => a - b);

  return {
    support: swingLows.slice(0, 3),
    resistance: swingHighs.slice(0, 3),
  };
}

<<<<<<< HEAD
=======
// ─── ADX (Average Directional Index) ────────────────────────

/**
 * Calculate ADX using the trading-signals library (Wilder smoothing).
 * ADX measures trend strength: <20 weak, 20-25 emerging, >25 trending, >40 strong trend.
 * +DI/-DI indicate trend direction.
 */
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): ADXResult {
  const len = closes.length;
  const adxValues: number[] = new Array(len).fill(NaN);
  const plusDIValues: number[] = new Array(len).fill(NaN);
  const minusDIValues: number[] = new Array(len).fill(NaN);

  if (len < period * 2 + 1) {
    return {
      adx: adxValues,
      plusDI: plusDIValues,
      minusDI: minusDIValues,
      current: { adx: NaN, plusDI: NaN, minusDI: NaN },
    };
  }

  try {
    const adxIndicator = new LibADX(period);

    for (let i = 0; i < len; i++) {
      adxIndicator.update({ high: highs[i], low: lows[i], close: closes[i] }, false);

      try {
        const adxVal = adxIndicator.getResult();
        adxValues[i] = Number(adxVal);
        plusDIValues[i] = Number(adxIndicator.pdi);
        minusDIValues[i] = Number(adxIndicator.mdi);
      } catch {
        // Not enough data yet — keep NaN
      }
    }
  } catch {
    // Library error — return NaN values
  }

  const lastAdx = adxValues.filter((v) => !isNaN(v));
  const lastPlus = plusDIValues.filter((v) => !isNaN(v));
  const lastMinus = minusDIValues.filter((v) => !isNaN(v));

  return {
    adx: adxValues,
    plusDI: plusDIValues,
    minusDI: minusDIValues,
    current: {
      adx: lastAdx.length > 0 ? lastAdx[lastAdx.length - 1] : NaN,
      plusDI: lastPlus.length > 0 ? lastPlus[lastPlus.length - 1] : NaN,
      minusDI: lastMinus.length > 0 ? lastMinus[lastMinus.length - 1] : NaN,
    },
  };
}

// ─── Volume SMA ─────────────────────────────────────────────

/**
 * Calculate Volume SMA and determine if volume data is synthetic.
 * Synthetic detection: if all volumes are within 10% of each other or all zero.
 */
export function calculateVolumeSMA(volumes: number[], period: number = 20): VolumeResult {
  const sma = calcSMA(volumes, period);
  const currentVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
  const validSMA = sma.filter((v) => !isNaN(v));
  const currentSMA = validSMA.length > 0 ? validSMA[validSMA.length - 1] : 0;

  // Detect synthetic/unreliable volume data
  let isSynthetic = false;
  if (volumes.length > 0) {
    const nonZero = volumes.filter((v) => v > 0);
    if (nonZero.length === 0) {
      isSynthetic = true;
    } else {
      const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
      if (mean > 0) {
        const allClose = nonZero.every((v) => Math.abs(v - mean) / mean < 0.1);
        isSynthetic = allClose;
      }
    }
  }

  const ratio = currentSMA > 0 ? currentVolume / currentSMA : 0;

  return { sma, currentVolume, currentSMA, ratio, isSynthetic };
}

>>>>>>> origin/main
// ─── Main Entry Point ────────────────────────────────────────

/**
 * Calculate all technical indicators from OHLCV data
 */
export function calculateAllIndicators(candles: OHLCV[]): AllIndicators {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
<<<<<<< HEAD
=======
  const volumes = candles.map((c) => c.volume);
>>>>>>> origin/main

  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    ema: calculateEMAs(closes),
    bollinger: calculateBollingerBands(closes),
    stochastic: calculateStochastic(highs, lows, closes),
<<<<<<< HEAD
    closes,
    highs,
    lows,
=======
    adx: calculateADX(highs, lows, closes),
    volume: calculateVolumeSMA(volumes),
    closes,
    highs,
    lows,
    volumes,
>>>>>>> origin/main
  };
}
