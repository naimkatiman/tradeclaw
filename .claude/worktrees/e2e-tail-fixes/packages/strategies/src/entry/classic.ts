import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands, calculateStochastic } from '@tradeclaw/signals';

/**
 * Classic entry: baseline scoring using RSI + MACD + EMA trend + Stochastic + Bollinger Bands.
 * Reproduces the pre-regime-filter signal generator behavior (commit 95ff3fc4^).
 *
 * Pre-regime thresholds:
 *   SIGNAL_THRESHOLD = 25
 *   MIN_CONFIDENCE = 58 (scaled to 0–1 → 0.58)
 *   MIN_DIRECTIONAL_EDGE = 8
 */

const WEIGHTS = {
  RSI_OVERSOLD: 20,
  RSI_OVERBOUGHT: 20,
  MACD_BULLISH: 25,
  MACD_BEARISH: 25,
  EMA_TREND_UP: 20,
  EMA_TREND_DOWN: 20,
  STOCH_OVERSOLD: 15,
  STOCH_OVERBOUGHT: 15,
  BB_LOWER_TOUCH: 10,
  BB_UPPER_TOUCH: 10,
} as const;

const SIGNAL_THRESHOLD = 25;    // pre-regime value
const MIN_CONFIDENCE = 0.58;    // pre-regime value (58%), normalised to 0–1
const MIN_DIRECTIONAL_EDGE = 8; // pre-regime value

/** Score buy/sell from per-bar indicator scalars. Returns scores 0–~130. */
function scoreBar(
  rsi: number,
  hist: number,
  prevHist: number,
  ema20: number,
  ema50: number,
  price: number,
  stochK: number,
  stochD: number,
  bbUpper: number,
  bbLower: number,
): { buyScore: number; sellScore: number; reasons: string[] } {
  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  // RSI
  if (rsi < 30) {
    buyScore += WEIGHTS.RSI_OVERSOLD;
    reasons.push('rsi-oversold');
  } else if (rsi < 40) {
    buyScore += WEIGHTS.RSI_OVERSOLD * 0.5;
    reasons.push('rsi-near-oversold');
  } else if (rsi < 50) {
    buyScore += WEIGHTS.RSI_OVERSOLD * 0.25;
  } else if (rsi > 70) {
    sellScore += WEIGHTS.RSI_OVERBOUGHT;
    reasons.push('rsi-overbought');
  } else if (rsi > 60) {
    sellScore += WEIGHTS.RSI_OVERBOUGHT * 0.5;
    reasons.push('rsi-near-overbought');
  } else if (rsi > 50) {
    sellScore += WEIGHTS.RSI_OVERBOUGHT * 0.25;
  }

  // MACD histogram
  if (hist > 0) {
    if (prevHist <= 0) {
      buyScore += WEIGHTS.MACD_BULLISH;
      reasons.push('macd-bullish-crossover');
    } else {
      buyScore += WEIGHTS.MACD_BULLISH * 0.5;
      reasons.push('macd-bullish');
    }
  } else if (hist < 0) {
    if (prevHist >= 0) {
      sellScore += WEIGHTS.MACD_BEARISH;
      reasons.push('macd-bearish-crossover');
    } else {
      sellScore += WEIGHTS.MACD_BEARISH * 0.5;
      reasons.push('macd-bearish');
    }
  }

  // EMA trend
  if (price > ema20 && ema20 > ema50) {
    buyScore += WEIGHTS.EMA_TREND_UP;
    reasons.push('ema-uptrend');
  } else if (price > ema20) {
    buyScore += WEIGHTS.EMA_TREND_UP * 0.35;
  } else if (price < ema20 && ema20 < ema50) {
    sellScore += WEIGHTS.EMA_TREND_DOWN;
    reasons.push('ema-downtrend');
  } else if (price < ema20) {
    sellScore += WEIGHTS.EMA_TREND_DOWN * 0.35;
  }

  // Stochastic
  if (stochK < 20 && stochD < 20) {
    buyScore += WEIGHTS.STOCH_OVERSOLD;
    reasons.push('stoch-oversold');
  } else if (stochK < 40) {
    buyScore += WEIGHTS.STOCH_OVERSOLD * 0.4;
  } else if (stochK > 80 && stochD > 80) {
    sellScore += WEIGHTS.STOCH_OVERBOUGHT;
    reasons.push('stoch-overbought');
  } else if (stochK > 60) {
    sellScore += WEIGHTS.STOCH_OVERBOUGHT * 0.4;
  }

  // Bollinger Bands
  const bbRange = bbUpper - bbLower;
  if (bbRange > 0) {
    const distToLower = (price - bbLower) / bbRange;
    const distToUpper = (bbUpper - price) / bbRange;
    if (distToLower < 0.1) {
      buyScore += WEIGHTS.BB_LOWER_TOUCH;
      reasons.push('bb-lower-touch');
    } else if (distToLower < 0.3) {
      buyScore += WEIGHTS.BB_LOWER_TOUCH * 0.5;
    } else if (distToUpper < 0.1) {
      sellScore += WEIGHTS.BB_UPPER_TOUCH;
      reasons.push('bb-upper-touch');
    } else if (distToUpper < 0.3) {
      sellScore += WEIGHTS.BB_UPPER_TOUCH * 0.5;
    }
  }

  return { buyScore, sellScore, reasons };
}

/** Scale a raw score (0–~130) to confidence 0–1. Mirrors pre-regime scaleConfidence(). */
function scaleToConfidence(score: number): number {
  // pre-regime: Math.min(95, Math.max(48, Math.round(42 + score * 0.62))) → 0–1
  return Math.min(0.95, Math.max(0.48, (42 + score * 0.62) / 100));
}

export const classicEntry: EntryModule = {
  id: 'classic',

  generateSignals(candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
    // Need at least 50 bars for EMA50 and stable indicators
    if (candles.length < 50) return [];

    const signals: EntrySignal[] = [];

    for (let i = 50; i < candles.length; i++) {
      const slice = candles.slice(0, i + 1);
      const closes = slice.map((c) => c.close);
      const highs = slice.map((c) => c.high);
      const lows = slice.map((c) => c.low);

      const rsi = calculateRSI(closes, 14);
      const { histogram: hist } = calculateMACD(closes);

      // Previous bar histogram for crossover detection
      let prevHist = 0;
      if (i >= 51) {
        const prevCloses = candles.slice(0, i).map((c) => c.close);
        const prevMacd = calculateMACD(prevCloses);
        prevHist = prevMacd.histogram;
      }

      const ema20 = calculateEMA(closes, 20);
      const ema50 = calculateEMA(closes, 50);
      const bb = calculateBollingerBands(closes, 20, 2);
      const stoch = calculateStochastic(highs, lows, closes, 14, 3);

      const price = candles[i].close;

      const { buyScore, sellScore, reasons } = scoreBar(
        rsi,
        hist,
        prevHist,
        ema20,
        ema50,
        price,
        stoch.k,
        stoch.d,
        bb.upper,
        bb.lower,
      );

      const edge = buyScore - sellScore;

      if (buyScore >= SIGNAL_THRESHOLD && edge >= MIN_DIRECTIONAL_EDGE) {
        const confidence = scaleToConfidence(buyScore);
        if (confidence >= MIN_CONFIDENCE) {
          signals.push({
            barIndex: i,
            direction: 'BUY',
            price,
            confidence,
            reason: reasons.filter((r) =>
              r.includes('rsi-over') || r.includes('macd-bull') || r.includes('ema-up') || r.includes('stoch-over') || r.includes('bb-lower'),
            ).join('+') || 'classic-buy',
          });
        }
      } else if (sellScore >= SIGNAL_THRESHOLD && -edge >= MIN_DIRECTIONAL_EDGE) {
        const confidence = scaleToConfidence(sellScore);
        if (confidence >= MIN_CONFIDENCE) {
          signals.push({
            barIndex: i,
            direction: 'SELL',
            price,
            confidence,
            reason: reasons.filter((r) =>
              r.includes('rsi-over') || r.includes('macd-bear') || r.includes('ema-down') || r.includes('stoch-over') || r.includes('bb-upper'),
            ).join('+') || 'classic-sell',
          });
        }
      }
    }

    return signals;
  },
};
