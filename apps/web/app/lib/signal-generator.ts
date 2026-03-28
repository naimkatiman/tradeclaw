/**
 * Signal Generator — converts real TA indicators into trading signals
 * Uses a weighted scoring system to determine signal direction and confidence
 */

import type { AllIndicators } from './ta-engine';
import { calculateAllIndicators, findSwingLevels } from './ta-engine';
import type { TradingSignal, IndicatorSummary } from './signals';
import { getOHLCV } from './ohlcv';

// ─── Multi-Timeframe Types ────────────────────────────────────

const MTF_TIMEFRAMES = ['H1', 'H4', 'D1'] as const;
type MTFTimeframe = typeof MTF_TIMEFRAMES[number];

export interface TFDirection {
  timeframe: MTFTimeframe;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  buyScore: number;
  sellScore: number;
}

export interface MultiTFResult {
  symbol: string;
  timeframes: TFDirection[];
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  agreementCount: number; // how many of 3 TFs agree
  confluenceBonus: number; // +15, +5, 0, -20
  isConflicted: boolean;
  entry: number;
  indicators: IndicatorSummary;
  timestamp: string;
  source: 'real' | 'synthetic';
}

// Scoring weights for each indicator
const WEIGHTS = {
  RSI_OVERSOLD: 20,      // RSI < 30 → buy signal
  RSI_OVERBOUGHT: 20,    // RSI > 70 → sell signal
  MACD_BULLISH: 25,      // MACD histogram positive & crossing up
  MACD_BEARISH: 25,      // MACD histogram negative & crossing down
  EMA_TREND_UP: 20,      // EMA20 > EMA50 > EMA200
  EMA_TREND_DOWN: 20,    // EMA20 < EMA50 < EMA200
  STOCH_OVERSOLD: 15,    // Stochastic < 20 and K crossing above D
  STOCH_OVERBOUGHT: 15,  // Stochastic > 80 and K crossing below D
  BB_LOWER_TOUCH: 10,    // Price near lower Bollinger band
  BB_UPPER_TOUCH: 10,    // Price near upper Bollinger band
} as const;

const SIGNAL_THRESHOLD = 55; // Minimum score to generate a signal
const MIN_DIRECTIONAL_EDGE = 12;
const MIN_TREND_STRENGTH = 0.2;
const MIN_ATR_PCT = 0.0008;
const MIN_BB_WIDTH = 0.5;
const MIN_RISK_ATR = 0.8;
const MAX_RISK_ATR = 2.5;

let signalCounter = 0;

function generateSignalId(
  symbol: string,
  timeframe: string,
  direction: 'BUY' | 'SELL',
  signalTimestamp: number,
): string {
  signalCounter++;
  return `SIG-${symbol}-${timeframe}-${direction}-${signalTimestamp.toString(36).toUpperCase()}`;
}

interface ScoreResult {
  buyScore: number;
  sellScore: number;
  reasons: string[];
  buyCategories: { momentum: number; trend: number; volatility: number };
  sellCategories: { momentum: number; trend: number; volatility: number };
}

interface MarketQuality {
  atr: number;
  atrPct: number;
  bandwidth: number;
  trendStrength: number;
  ema20Slope: number;
  ema50Slope: number;
  macdStrength: number;
  isChoppy: boolean;
}

interface DirectionGateResult {
  passes: boolean;
  confidenceBoost: number;
}

function getLastValidValues(values: number[], count: number): number[] {
  const valid = values.filter(v => !isNaN(v));
  return valid.slice(-count);
}

function calculatePercentSlope(values: number[], lookback: number = 5): number {
  const sample = getLastValidValues(values, lookback + 1);
  if (sample.length < 2) return 0;

  const first = sample[0];
  const last = sample[sample.length - 1];
  if (!first || isNaN(first) || isNaN(last)) return 0;

  return (last - first) / Math.abs(first);
}

function calculateATR(indicators: AllIndicators, period: number = 14): number {
  const highs = indicators.highs.slice(-(period + 1));
  const lows = indicators.lows.slice(-(period + 1));
  const closes = indicators.closes.slice(-(period + 2));

  if (highs.length < period || lows.length < period || closes.length < period + 1) {
    const currentPrice = indicators.closes[indicators.closes.length - 1] ?? 0;
    return currentPrice * 0.01;
  }

  let atr = 0;
  for (let i = 0; i < period; i++) {
    const high = highs[i + highs.length - period];
    const low = lows[i + lows.length - period];
    const prevClose = closes[i + closes.length - period - 1] ?? highs[i + highs.length - period];
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    atr += tr;
  }

  const currentPrice = indicators.closes[indicators.closes.length - 1] ?? 0;
  return atr / period || currentPrice * 0.01;
}

function findNearestSupport(levels: number[], currentPrice: number): number | undefined {
  const belowPrice = levels.filter(level => level < currentPrice);
  if (belowPrice.length === 0) return undefined;
  return Math.max(...belowPrice);
}

function findNearestResistance(levels: number[], currentPrice: number): number | undefined {
  const abovePrice = levels.filter(level => level > currentPrice);
  if (abovePrice.length === 0) return undefined;
  return Math.min(...abovePrice);
}

function getNearestLevels(
  levels: number[],
  currentPrice: number,
  side: 'support' | 'resistance',
  count: number,
): number[] {
  const filtered = levels.filter(level =>
    side === 'support' ? level < currentPrice : level > currentPrice,
  );

  return filtered
    .sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b))
    .slice(0, count);
}

function analyzeMarketQuality(
  indicators: AllIndicators,
  currentPrice: number,
  atr: number,
): MarketQuality {
  const { ema, macd, bollinger } = indicators;
  const ema20Slope = calculatePercentSlope(ema.ema20, 5);
  const ema50Slope = calculatePercentSlope(ema.ema50, 5);
  const ema20 = ema.current.ema20;
  const ema50 = ema.current.ema50;
  const ema200 = ema.current.ema200;

  const emaSpread =
    (!isNaN(ema20) && !isNaN(ema50) ? Math.abs(ema20 - ema50) : 0) +
    (!isNaN(ema50) && !isNaN(ema200) ? Math.abs(ema50 - ema200) * 0.5 : 0);

  const atrPct = currentPrice > 0 ? atr / currentPrice : 0;
  const trendStrength = atr > 0 ? emaSpread / atr : 0;
  const bandwidth = isNaN(bollinger.current.bandwidth) ? 0 : bollinger.current.bandwidth;
  const macdStrength = atr > 0 ? Math.abs(macd.current.histogram) / atr : 0;

  return {
    atr,
    atrPct,
    bandwidth,
    trendStrength,
    ema20Slope,
    ema50Slope,
    macdStrength,
    isChoppy:
      trendStrength < MIN_TREND_STRENGTH &&
      Math.abs(ema20Slope) < 0.002 &&
      Math.abs(ema50Slope) < 0.001 &&
      atrPct < MIN_ATR_PCT &&
      bandwidth < MIN_BB_WIDTH,
  };
}

function passesDirectionGate(
  direction: 'BUY' | 'SELL',
  indicators: AllIndicators,
  quality: MarketQuality,
  score: number,
  opposingScore: number,
): DirectionGateResult {
  const { rsi, macd, stochastic } = indicators;
  const scoreEdge = score - opposingScore;

  if (scoreEdge < MIN_DIRECTIONAL_EDGE || quality.isChoppy) {
    return { passes: false, confidenceBoost: 0 };
  }

  if (quality.trendStrength < MIN_TREND_STRENGTH || quality.atrPct < MIN_ATR_PCT) {
    return { passes: false, confidenceBoost: 0 };
  }

  // ADX directional confirmation: +DI > -DI for BUY, -DI > +DI for SELL
  const { adx } = indicators;
  const plusDI = adx.current.plusDI;
  const minusDI = adx.current.minusDI;
  if (!isNaN(plusDI) && !isNaN(minusDI)) {
    if (direction === 'BUY' && minusDI > plusDI) {
      return { passes: false, confidenceBoost: 0 };
    }
    if (direction === 'SELL' && plusDI > minusDI) {
      return { passes: false, confidenceBoost: 0 };
    }
  }

  if (direction === 'BUY') {
    if (macd.current.histogram <= 0 || quality.ema20Slope <= 0 || quality.ema50Slope < 0) {
      return { passes: false, confidenceBoost: 0 };
    }
    if (!isNaN(rsi.current) && (rsi.current < 43 || rsi.current > 74)) {
      return { passes: false, confidenceBoost: 0 };
    }
    if (stochastic.current.k > 92 && stochastic.current.d > 88) {
      return { passes: false, confidenceBoost: 0 };
    }
  } else {
    if (macd.current.histogram >= 0 || quality.ema20Slope >= 0 || quality.ema50Slope > 0) {
      return { passes: false, confidenceBoost: 0 };
    }
    if (!isNaN(rsi.current) && (rsi.current > 57 || rsi.current < 26)) {
      return { passes: false, confidenceBoost: 0 };
    }
    if (stochastic.current.k < 8 && stochastic.current.d < 12) {
      return { passes: false, confidenceBoost: 0 };
    }
  }

  const confidenceBoost = Math.min(
    12,
    Math.round(scoreEdge / 3 + quality.trendStrength * 2 + quality.macdStrength * 10),
  );

  return { passes: true, confidenceBoost };
}

/**
 * Calculate buy/sell scores from technical indicators
 */
function scoreIndicators(indicators: AllIndicators): ScoreResult {
  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];
  const buyCategories = { momentum: 0, trend: 0, volatility: 0 };
  const sellCategories = { momentum: 0, trend: 0, volatility: 0 };
  const { rsi, macd, ema, stochastic, bollinger, closes } = indicators;
  const currentPrice = closes[closes.length - 1];

  // ── RSI (momentum) ─────────────────────────────────
  if (!isNaN(rsi.current)) {
    if (rsi.current < 30) {
      buyScore += WEIGHTS.RSI_OVERSOLD;
      buyCategories.momentum += WEIGHTS.RSI_OVERSOLD;
      reasons.push(`RSI oversold (${rsi.current.toFixed(1)})`);
    } else if (rsi.current < 40) {
      buyScore += WEIGHTS.RSI_OVERSOLD * 0.5;
      buyCategories.momentum += WEIGHTS.RSI_OVERSOLD * 0.5;
      reasons.push(`RSI near oversold (${rsi.current.toFixed(1)})`);
    } else if (rsi.current > 70) {
      sellScore += WEIGHTS.RSI_OVERBOUGHT;
      sellCategories.momentum += WEIGHTS.RSI_OVERBOUGHT;
      reasons.push(`RSI overbought (${rsi.current.toFixed(1)})`);
    } else if (rsi.current > 60) {
      sellScore += WEIGHTS.RSI_OVERBOUGHT * 0.5;
      sellCategories.momentum += WEIGHTS.RSI_OVERBOUGHT * 0.5;
      reasons.push(`RSI near overbought (${rsi.current.toFixed(1)})`);
    }
  }

  // ── MACD (trend) ────────────────────────────────────
  const hist = macd.current.histogram;
  const prevHistValues = macd.histogram.filter(v => !isNaN(v));
  const prevHist = prevHistValues.length >= 2 ? prevHistValues[prevHistValues.length - 2] : 0;

  if (hist > 0) {
    buyScore += WEIGHTS.MACD_BULLISH * 0.5;
    buyCategories.trend += WEIGHTS.MACD_BULLISH * 0.5;
    if (prevHist <= 0 && hist > 0) {
      buyScore += WEIGHTS.MACD_BULLISH * 0.5;
      buyCategories.trend += WEIGHTS.MACD_BULLISH * 0.5;
      reasons.push('MACD bullish crossover');
    } else {
      reasons.push('MACD bullish');
    }
  } else if (hist < 0) {
    sellScore += WEIGHTS.MACD_BEARISH * 0.5;
    sellCategories.trend += WEIGHTS.MACD_BEARISH * 0.5;
    if (prevHist >= 0 && hist < 0) {
      sellScore += WEIGHTS.MACD_BEARISH * 0.5;
      sellCategories.trend += WEIGHTS.MACD_BEARISH * 0.5;
      reasons.push('MACD bearish crossover');
    } else {
      reasons.push('MACD bearish');
    }
  }

  // ── EMA Trend (trend) ────────────────────────────────
  const { ema20, ema50, ema200 } = ema.current;
  if (!isNaN(ema20) && !isNaN(ema50)) {
    if (currentPrice > ema20 && ema20 > ema50) {
      buyScore += WEIGHTS.EMA_TREND_UP * 0.7;
      buyCategories.trend += WEIGHTS.EMA_TREND_UP * 0.7;
      if (!isNaN(ema200) && ema50 > ema200) {
        buyScore += WEIGHTS.EMA_TREND_UP * 0.3;
        buyCategories.trend += WEIGHTS.EMA_TREND_UP * 0.3;
        reasons.push('Strong uptrend (EMA20 > EMA50 > EMA200)');
      } else {
        reasons.push('Uptrend (price > EMA20 > EMA50)');
      }
    } else if (currentPrice < ema20 && ema20 < ema50) {
      sellScore += WEIGHTS.EMA_TREND_DOWN * 0.7;
      sellCategories.trend += WEIGHTS.EMA_TREND_DOWN * 0.7;
      if (!isNaN(ema200) && ema50 < ema200) {
        sellScore += WEIGHTS.EMA_TREND_DOWN * 0.3;
        sellCategories.trend += WEIGHTS.EMA_TREND_DOWN * 0.3;
        reasons.push('Strong downtrend (EMA20 < EMA50 < EMA200)');
      } else {
        reasons.push('Downtrend (price < EMA20 < EMA50)');
      }
    }
  }

  // ── Stochastic (momentum) ────────────────────────────
  const { k, d } = stochastic.current;
  if (!isNaN(k) && !isNaN(d)) {
    if (k < 20 && d < 20) {
      buyScore += WEIGHTS.STOCH_OVERSOLD;
      buyCategories.momentum += WEIGHTS.STOCH_OVERSOLD;
      if (k > d) {
        reasons.push('Stochastic oversold with bullish cross');
      } else {
        reasons.push('Stochastic oversold');
      }
    } else if (k > 80 && d > 80) {
      sellScore += WEIGHTS.STOCH_OVERBOUGHT;
      sellCategories.momentum += WEIGHTS.STOCH_OVERBOUGHT;
      if (k < d) {
        reasons.push('Stochastic overbought with bearish cross');
      } else {
        reasons.push('Stochastic overbought');
      }
    }
  }

  // ── Bollinger Bands (volatility) ──────────────────────
  const bbUpper = bollinger.current.upper;
  const bbLower = bollinger.current.lower;
  const bbMiddle = bollinger.current.middle;
  if (!isNaN(bbUpper) && !isNaN(bbLower) && !isNaN(bbMiddle)) {
    const bbRange = bbUpper - bbLower;
    if (bbRange > 0) {
      const distToLower = (currentPrice - bbLower) / bbRange;
      const distToUpper = (bbUpper - currentPrice) / bbRange;

      if (distToLower < 0.1) {
        buyScore += WEIGHTS.BB_LOWER_TOUCH;
        buyCategories.volatility += WEIGHTS.BB_LOWER_TOUCH;
        reasons.push('Price at lower Bollinger Band');
      } else if (distToUpper < 0.1) {
        sellScore += WEIGHTS.BB_UPPER_TOUCH;
        sellCategories.volatility += WEIGHTS.BB_UPPER_TOUCH;
        reasons.push('Price at upper Bollinger Band');
      }
    }
  }

  // ── ADX Trend Strength Bonus ────────────────────────────
  const adxCurrent = indicators.adx.current;
  if (!isNaN(adxCurrent.adx) && adxCurrent.adx > 40) {
    // Strong trend bonus — add to the dominant direction
    if (buyScore > sellScore) {
      buyScore += 5;
      buyCategories.trend += 5;
      reasons.push(`Strong trend (ADX=${adxCurrent.adx.toFixed(1)})`);
    } else if (sellScore > buyScore) {
      sellScore += 5;
      sellCategories.trend += 5;
      reasons.push(`Strong trend (ADX=${adxCurrent.adx.toFixed(1)})`);
    }
  }

  // ── Volume Confirmation Bonus ─────────────────────────
  const vol = indicators.volume;
  if (!vol.isSynthetic && vol.ratio >= 2.0) {
    const volumeBonus = vol.ratio >= 3.0 ? 5 : 3;
    if (buyScore > sellScore) {
      buyScore += volumeBonus;
      buyCategories.momentum += volumeBonus;
    } else if (sellScore > buyScore) {
      sellScore += volumeBonus;
      sellCategories.momentum += volumeBonus;
    }
    reasons.push(`High volume (${vol.ratio.toFixed(1)}x avg)`);
  }

  return { buyScore, sellScore, reasons, buyCategories, sellCategories };
}

/**
 * Build IndicatorSummary from real calculations
 */
function buildIndicatorSummary(
  indicators: AllIndicators,
  currentPrice: number,
): IndicatorSummary {
  const { rsi, macd, ema, bollinger, stochastic, highs, lows } = indicators;
  const swingLevels = findSwingLevels(highs, lows);
  const nearestSupport = getNearestLevels(swingLevels.support, currentPrice, 'support', 2);
  const nearestResistance = getNearestLevels(swingLevels.resistance, currentPrice, 'resistance', 2);

  const rsiVal = isNaN(rsi.current) ? 50 : rsi.current;
  const emaCurrent = ema.current;

  const { adx, volume } = indicators;
  const adxVal = adx.current.adx;
  const volumeData = volume;

  return {
    rsi: {
      value: +rsiVal.toFixed(2),
      signal: rsiVal < 30 ? 'oversold' : rsiVal > 70 ? 'overbought' : 'neutral',
    },
    macd: {
      histogram: +macd.current.histogram.toFixed(6),
      signal: macd.current.histogram > 0 ? 'bullish' : macd.current.histogram < 0 ? 'bearish' : 'neutral',
    },
    ema: {
      trend: !isNaN(emaCurrent.ema20) && !isNaN(emaCurrent.ema50)
        ? (currentPrice > emaCurrent.ema20 && emaCurrent.ema20 > emaCurrent.ema50 ? 'up'
          : currentPrice < emaCurrent.ema20 && emaCurrent.ema20 < emaCurrent.ema50 ? 'down'
          : 'sideways')
        : 'sideways',
      ema20: +(emaCurrent.ema20 || currentPrice).toFixed(5),
      ema50: +(emaCurrent.ema50 || currentPrice).toFixed(5),
      ema200: +(emaCurrent.ema200 || currentPrice).toFixed(5),
    },
    bollingerBands: {
      position: !isNaN(bollinger.current.middle)
        ? (currentPrice > bollinger.current.middle ? 'upper' : 'lower')
        : 'middle',
      bandwidth: +(bollinger.current.bandwidth || 0).toFixed(4),
    },
    stochastic: {
      k: +stochastic.current.k.toFixed(2),
      d: +stochastic.current.d.toFixed(2),
      signal: stochastic.current.k < 20 ? 'oversold' : stochastic.current.k > 80 ? 'overbought' : 'neutral',
    },
    support: nearestSupport.length > 0
      ? nearestSupport.map(v => +v.toFixed(5))
      : [+(currentPrice * 0.99).toFixed(5), +(currentPrice * 0.98).toFixed(5)],
    resistance: nearestResistance.length > 0
      ? nearestResistance.map(v => +v.toFixed(5))
      : [+(currentPrice * 1.01).toFixed(5), +(currentPrice * 1.02).toFixed(5)],
    adx: !isNaN(adxVal)
      ? {
          value: +adxVal.toFixed(2),
          trending: adxVal >= 25,
          plusDI: +(adx.current.plusDI || 0).toFixed(2),
          minusDI: +(adx.current.minusDI || 0).toFixed(2),
        }
      : undefined,
    volume: !volumeData.isSynthetic
      ? {
          current: +volumeData.currentVolume.toFixed(0),
          average: +volumeData.currentSMA.toFixed(0),
          ratio: +volumeData.ratio.toFixed(2),
          confirmed: volumeData.ratio >= 1.5,
        }
      : undefined,
  };
}

/**
 * Generate trading signals from calculated indicators
 */
export function generateSignalsFromTA(
  symbol: string,
  indicators: AllIndicators,
  timeframe: string,
  source: 'real' | 'synthetic' = 'real',
  signalTimestamp: number = Date.now(),
): TradingSignal[] {
  // Suppress signals on synthetic data
  if (source === 'synthetic') return [];

  // Minimum candle count guard — require at least 100 candles for reliable signals
  if (indicators.closes.length < 100) return [];

  const { buyScore, sellScore, buyCategories, sellCategories } = scoreIndicators(indicators);
  const closes = indicators.closes;
  const currentPrice = closes[closes.length - 1];

  if (!currentPrice || isNaN(currentPrice)) return [];

  // ── ADX Gate: suppress signals in ranging markets (ADX < 25) ──
  const adxValue = indicators.adx.current.adx;
  if (!isNaN(adxValue) && adxValue < 25) return [];

  // ── Volume Gate: require above-average volume for confirmation ──
  const { volume } = indicators;
  if (!volume.isSynthetic && volume.ratio > 0 && volume.ratio < 1.5) return [];

  const signals: TradingSignal[] = [];
  const indicatorSummary = buildIndicatorSummary(indicators, currentPrice);
  const swingLevels = findSwingLevels(indicators.highs, indicators.lows);
  const atr = calculateATR(indicators);
  const marketQuality = analyzeMarketQuality(indicators, currentPrice, atr);
  const publishedAt = new Date(signalTimestamp).toISOString();

  // Generate BUY signal
  const buyingCategoryCount = [buyCategories.momentum, buyCategories.trend, buyCategories.volatility]
    .filter(v => v > 0).length;
  const buyGate = passesDirectionGate('BUY', indicators, marketQuality, buyScore, sellScore);
  if (buyScore >= SIGNAL_THRESHOLD && buyScore > sellScore && buyingCategoryCount >= 2 && buyGate.passes) {
    const confidence = Math.min(95, Math.max(52, Math.round(buyScore + buyGate.confidenceBoost)));
    const slDistance = atr * 1.5;
    const entry = +currentPrice.toFixed(5);

    const nearestSupport = findNearestSupport(swingLevels.support, currentPrice);
    const atrStop = currentPrice - slDistance;
    const stopLoss = nearestSupport && nearestSupport < currentPrice
      ? +Math.max(nearestSupport, atrStop).toFixed(5)
      : +atrStop.toFixed(5);

    const riskDistance = entry - stopLoss;
    const nearestResistance = findNearestResistance(swingLevels.resistance, currentPrice);

    if (riskDistance < atr * MIN_RISK_ATR || riskDistance > atr * MAX_RISK_ATR) {
      return signals;
    }

    if (nearestResistance && nearestResistance <= entry + riskDistance * 1.1) {
      return signals;
    }

    signals.push({
      id: generateSignalId(symbol, timeframe, 'BUY', signalTimestamp),
      symbol,
      direction: 'BUY',
      confidence,
      entry,
      stopLoss,
      takeProfit1: +(entry + riskDistance * 1.5).toFixed(5),
      takeProfit2: +(entry + riskDistance * 2.5).toFixed(5),
      takeProfit3: +(entry + riskDistance * 3.5).toFixed(5),
      indicators: indicatorSummary,
      timeframe,
      timestamp: publishedAt,
      status: 'active',
      dataQuality: 'real',
    });
  }

  // Generate SELL signal
  const sellingCategoryCount = [sellCategories.momentum, sellCategories.trend, sellCategories.volatility]
    .filter(v => v > 0).length;
  const sellGate = passesDirectionGate('SELL', indicators, marketQuality, sellScore, buyScore);
  if (sellScore >= SIGNAL_THRESHOLD && sellScore > buyScore && sellingCategoryCount >= 2 && sellGate.passes) {
    const confidence = Math.min(95, Math.max(52, Math.round(sellScore + sellGate.confidenceBoost)));
    const slDistance = atr * 1.5;
    const entry = +currentPrice.toFixed(5);

    const nearestResistance = findNearestResistance(swingLevels.resistance, currentPrice);
    const atrStop = currentPrice + slDistance;
    const stopLoss = nearestResistance && nearestResistance > currentPrice
      ? +Math.min(nearestResistance, atrStop).toFixed(5)
      : +atrStop.toFixed(5);

    const riskDistance = stopLoss - entry;
    const nearestSupport = findNearestSupport(swingLevels.support, currentPrice);

    if (riskDistance < atr * MIN_RISK_ATR || riskDistance > atr * MAX_RISK_ATR) {
      return signals;
    }

    if (nearestSupport && nearestSupport >= entry - riskDistance * 1.1) {
      return signals;
    }

    signals.push({
      id: generateSignalId(symbol, timeframe, 'SELL', signalTimestamp),
      symbol,
      direction: 'SELL',
      confidence,
      entry,
      stopLoss,
      takeProfit1: +(entry - riskDistance * 1.5).toFixed(5),
      takeProfit2: +(entry - riskDistance * 2.5).toFixed(5),
      takeProfit3: +(entry - riskDistance * 3.5).toFixed(5),
      indicators: indicatorSummary,
      timeframe,
      timestamp: publishedAt,
      status: 'active',
      dataQuality: 'real',
    });
  }

  return signals;
}

// ─── Multi-Timeframe Analysis ─────────────────────────────────

/**
 * Determine directional bias for one timeframe from pre-scored indicators.
 * Does NOT apply the SIGNAL_THRESHOLD — we want the bias even for weak signals.
 */
function getTFDirection(indicators: AllIndicators, timeframe: MTFTimeframe): TFDirection {
  const { buyScore, sellScore } = scoreIndicators(indicators);

  let direction: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let dominantScore = 0;

  if (buyScore > sellScore && buyScore > 0) {
    direction = 'BUY';
    dominantScore = buyScore;
  } else if (sellScore > buyScore && sellScore > 0) {
    direction = 'SELL';
    dominantScore = sellScore;
  }

  const confidence = direction === 'NEUTRAL'
    ? Math.round((buyScore + sellScore) / 2)
    : Math.min(95, Math.max(40, dominantScore));

  return { timeframe, direction, confidence, buyScore, sellScore };
}

/**
 * Run the TA engine across H1, H4, D1 for a single symbol and compute confluence.
 * Returns null if insufficient data is available for all timeframes.
 */
export async function generateMultiTFSignal(symbol: string): Promise<MultiTFResult | null> {
  type TFEntry = { tf: MTFTimeframe; indicators: AllIndicators; source: 'binance' | 'yahoo' | 'synthetic' };

  const settled = await Promise.allSettled(
    MTF_TIMEFRAMES.map(async (tf): Promise<TFEntry | null> => {
      const { candles, source } = await getOHLCV(symbol, tf);
      if (candles.length < 50) return null;
      const indicators = calculateAllIndicators(candles);
      return { tf, indicators, source };
    })
  );

  const tfData = settled
    .filter(
      (r): r is PromiseFulfilledResult<TFEntry> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value);

  if (tfData.length === 0) return null;

  const timeframes = tfData.map(({ tf, indicators }) => getTFDirection(indicators, tf));

  const buyCount = timeframes.filter(t => t.direction === 'BUY').length;
  const sellCount = timeframes.filter(t => t.direction === 'SELL').length;

  let dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let agreementCount = 0;
  let confluenceBonus = 0;
  let isConflicted = false;

  if (buyCount > sellCount) {
    dominantDirection = 'BUY';
    agreementCount = buyCount;
  } else if (sellCount > buyCount) {
    dominantDirection = 'SELL';
    agreementCount = sellCount;
  }

  if (buyCount === 3 || sellCount === 3) {
    confluenceBonus = 15;
  } else if (buyCount === 2 || sellCount === 2) {
    confluenceBonus = 5;
  } else if (buyCount >= 1 && sellCount >= 1) {
    confluenceBonus = -20;
    isConflicted = true;
  }

  // Use H1 data (first available) as primary for entry price + indicators
  const primary = tfData[0];
  const entry = primary.indicators.closes[primary.indicators.closes.length - 1];
  const indicatorSummary = buildIndicatorSummary(primary.indicators, entry);
  const source = tfData.every(d => d.source === 'synthetic') ? 'synthetic' : 'real';

  return {
    symbol,
    timeframes,
    dominantDirection,
    agreementCount,
    confluenceBonus,
    isConflicted,
    entry: +entry.toFixed(5),
    indicators: indicatorSummary,
    timestamp: new Date().toISOString(),
    source,
  };
}
