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

const SIGNAL_THRESHOLD = 40; // Minimum score to generate a signal (lowered from 60 for more signals)

let signalCounter = 0;

function generateSignalId(): string {
  signalCounter++;
  return `SIG-${Date.now().toString(36).toUpperCase()}-${signalCounter.toString(36).toUpperCase().padStart(4, '0')}`;
}

interface ScoreResult {
  buyScore: number;
  sellScore: number;
  reasons: string[];
}

/**
 * Calculate buy/sell scores from technical indicators
 */
function scoreIndicators(indicators: AllIndicators): ScoreResult {
  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];
  const { rsi, macd, ema, stochastic, bollinger, closes } = indicators;
  const currentPrice = closes[closes.length - 1];

  // ── RSI ────────────────────────────────────
  if (!isNaN(rsi.current)) {
    if (rsi.current < 30) {
      buyScore += WEIGHTS.RSI_OVERSOLD;
      reasons.push(`RSI oversold (${rsi.current.toFixed(1)})`);
    } else if (rsi.current < 40) {
      buyScore += WEIGHTS.RSI_OVERSOLD * 0.5;
      reasons.push(`RSI near oversold (${rsi.current.toFixed(1)})`);
    } else if (rsi.current > 70) {
      sellScore += WEIGHTS.RSI_OVERBOUGHT;
      reasons.push(`RSI overbought (${rsi.current.toFixed(1)})`);
    } else if (rsi.current > 60) {
      sellScore += WEIGHTS.RSI_OVERBOUGHT * 0.5;
      reasons.push(`RSI near overbought (${rsi.current.toFixed(1)})`);
    }
  }

  // ── MACD ───────────────────────────────────
  const hist = macd.current.histogram;
  const prevHistValues = macd.histogram.filter(v => !isNaN(v));
  const prevHist = prevHistValues.length >= 2 ? prevHistValues[prevHistValues.length - 2] : 0;

  if (hist > 0) {
    buyScore += WEIGHTS.MACD_BULLISH * 0.5;
    if (prevHist <= 0 && hist > 0) {
      buyScore += WEIGHTS.MACD_BULLISH * 0.5; // Bullish crossover bonus
      reasons.push('MACD bullish crossover');
    } else {
      reasons.push('MACD bullish');
    }
  } else if (hist < 0) {
    sellScore += WEIGHTS.MACD_BEARISH * 0.5;
    if (prevHist >= 0 && hist < 0) {
      sellScore += WEIGHTS.MACD_BEARISH * 0.5; // Bearish crossover bonus
      reasons.push('MACD bearish crossover');
    } else {
      reasons.push('MACD bearish');
    }
  }

  // ── EMA Trend ──────────────────────────────
  const { ema20, ema50, ema200 } = ema.current;
  if (!isNaN(ema20) && !isNaN(ema50)) {
    if (currentPrice > ema20 && ema20 > ema50) {
      buyScore += WEIGHTS.EMA_TREND_UP * 0.7;
      if (!isNaN(ema200) && ema50 > ema200) {
        buyScore += WEIGHTS.EMA_TREND_UP * 0.3;
        reasons.push('Strong uptrend (EMA20 > EMA50 > EMA200)');
      } else {
        reasons.push('Uptrend (price > EMA20 > EMA50)');
      }
    } else if (currentPrice < ema20 && ema20 < ema50) {
      sellScore += WEIGHTS.EMA_TREND_DOWN * 0.7;
      if (!isNaN(ema200) && ema50 < ema200) {
        sellScore += WEIGHTS.EMA_TREND_DOWN * 0.3;
        reasons.push('Strong downtrend (EMA20 < EMA50 < EMA200)');
      } else {
        reasons.push('Downtrend (price < EMA20 < EMA50)');
      }
    }
  }

  // ── Stochastic ─────────────────────────────
  const { k, d } = stochastic.current;
  if (!isNaN(k) && !isNaN(d)) {
    if (k < 20 && d < 20) {
      buyScore += WEIGHTS.STOCH_OVERSOLD;
      if (k > d) {
        reasons.push('Stochastic oversold with bullish cross');
      } else {
        reasons.push('Stochastic oversold');
      }
    } else if (k > 80 && d > 80) {
      sellScore += WEIGHTS.STOCH_OVERBOUGHT;
      if (k < d) {
        reasons.push('Stochastic overbought with bearish cross');
      } else {
        reasons.push('Stochastic overbought');
      }
    }
  }

  // ── Bollinger Bands ────────────────────────
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
        reasons.push('Price at lower Bollinger Band');
      } else if (distToUpper < 0.1) {
        sellScore += WEIGHTS.BB_UPPER_TOUCH;
        reasons.push('Price at upper Bollinger Band');
      }
    }
  }

  return { buyScore, sellScore, reasons };
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

  const rsiVal = isNaN(rsi.current) ? 50 : rsi.current;
  const emaCurrent = ema.current;

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
    support: swingLevels.support.length > 0
      ? swingLevels.support.slice(0, 2).map(v => +v.toFixed(5))
      : [+(currentPrice * 0.99).toFixed(5), +(currentPrice * 0.98).toFixed(5)],
    resistance: swingLevels.resistance.length > 0
      ? swingLevels.resistance.slice(0, 2).map(v => +v.toFixed(5))
      : [+(currentPrice * 1.01).toFixed(5), +(currentPrice * 1.02).toFixed(5)],
  };
}

/**
 * Generate trading signals from calculated indicators
 */
export function generateSignalsFromTA(
  symbol: string,
  indicators: AllIndicators,
  timeframe: string,
): TradingSignal[] {
  const { buyScore, sellScore } = scoreIndicators(indicators);
  const closes = indicators.closes;
  const currentPrice = closes[closes.length - 1];

  if (!currentPrice || isNaN(currentPrice)) return [];

  const signals: TradingSignal[] = [];
  const indicatorSummary = buildIndicatorSummary(indicators, currentPrice);
  const swingLevels = findSwingLevels(indicators.highs, indicators.lows);

  // Calculate ATR for dynamic SL/TP
  const recentHighs = indicators.highs.slice(-14);
  const recentLows = indicators.lows.slice(-14);
  const recentCloses = closes.slice(-15);
  let atr = 0;
  for (let i = 0; i < recentHighs.length; i++) {
    const tr = Math.max(
      recentHighs[i] - recentLows[i],
      Math.abs(recentHighs[i] - (recentCloses[i] ?? recentHighs[i])),
      Math.abs(recentLows[i] - (recentCloses[i] ?? recentLows[i]))
    );
    atr += tr;
  }
  atr = atr / recentHighs.length || currentPrice * 0.01;

  // Generate BUY signal
  if (buyScore >= SIGNAL_THRESHOLD && buyScore > sellScore) {
    const confidence = Math.min(95, Math.max(50, buyScore));
    const slDistance = atr * 1.5;
    const entry = +currentPrice.toFixed(5);
    
    // Use swing low for SL if available, otherwise ATR-based
    const nearestSupport = swingLevels.support[0];
    const stopLoss = nearestSupport && nearestSupport < currentPrice
      ? +Math.min(nearestSupport, currentPrice - slDistance).toFixed(5)
      : +(currentPrice - slDistance).toFixed(5);
    
    const riskDistance = entry - stopLoss;

    signals.push({
      id: generateSignalId(),
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
      timestamp: new Date().toISOString(),
      status: 'active',
    });
  }

  // Generate SELL signal
  if (sellScore >= SIGNAL_THRESHOLD && sellScore > buyScore) {
    const confidence = Math.min(95, Math.max(50, sellScore));
    const slDistance = atr * 1.5;
    const entry = +currentPrice.toFixed(5);
    
    // Use swing high for SL if available, otherwise ATR-based
    const nearestResistance = swingLevels.resistance[0];
    const stopLoss = nearestResistance && nearestResistance > currentPrice
      ? +Math.max(nearestResistance, currentPrice + slDistance).toFixed(5)
      : +(currentPrice + slDistance).toFixed(5);
    
    const riskDistance = stopLoss - entry;

    signals.push({
      id: generateSignalId(),
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
      timestamp: new Date().toISOString(),
      status: 'active',
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
