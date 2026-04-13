import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { calculateEMA, calculateBollingerBands } from '@tradeclaw/signals';

/**
 * VWAP + EMA + Bollinger Bands entry.
 * BUY: EMA20 > EMA50, close > VWAP20, low pierces lower BB (mean reversion in uptrend).
 * SELL: EMA20 < EMA50, close < VWAP20, high pierces upper BB (mean reversion in downtrend).
 *
 * Both calculateEMA and calculateBollingerBands are scalar-returning (trailing-window scalar).
 * We follow the same per-bar slice pattern as classic.ts.
 */

/**
 * Rolling VWAP over a fixed lookback period.
 * Returns an array parallel to `candles`; indices < period-1 are NaN.
 */
function rollingVwap(candles: OHLCV[], period: number): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let pv = 0;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const typical = (candles[j].high + candles[j].low + candles[j].close) / 3;
      const vol = candles[j].volume ?? 1;
      pv += typical * vol;
      v += vol;
    }
    out[i] = v > 0 ? pv / v : NaN;
  }
  return out;
}

export const vwapEmaBbEntry: EntryModule = {
  id: 'vwap-ema-bb',

  generateSignals(candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
    if (candles.length < 50) return [];

    // Pre-compute rolling VWAP (array, O(n*period))
    const vwap = rollingVwap(candles, 20);

    const signals: EntrySignal[] = [];

    for (let i = 50; i < candles.length; i++) {
      const slice = candles.slice(0, i + 1);
      const closes = slice.map((c) => c.close);

      // Scalar indicators — each call uses the trailing slice
      const e20 = calculateEMA(closes, 20);
      const e50 = calculateEMA(closes, 50);
      const bb = calculateBollingerBands(closes, 20, 2);

      const v = vwap[i];
      const close = candles[i].close;
      const low = candles[i].low;
      const high = candles[i].high;

      // Guard against degenerate values
      if (!Number.isFinite(v) || !Number.isFinite(e20) || !Number.isFinite(e50)) continue;
      if (!Number.isFinite(bb.lower) || !Number.isFinite(bb.upper)) continue;

      const trendUp = e20 > e50;
      const trendDown = e20 < e50;

      const bandWidth = bb.upper - bb.lower;
      if (bandWidth <= 0) continue;

      if (trendUp && close > v && low <= bb.lower) {
        const pen = (bb.lower - low) / bandWidth;
        signals.push({
          barIndex: i,
          direction: 'BUY',
          price: close,
          confidence: Math.min(1, Math.max(0.3, pen * 2)),
          reason: 'vwap-ema-bb-long',
        });
      } else if (trendDown && close < v && high >= bb.upper) {
        const pen = (high - bb.upper) / bandWidth;
        signals.push({
          barIndex: i,
          direction: 'SELL',
          price: close,
          confidence: Math.min(1, Math.max(0.3, pen * 2)),
          reason: 'vwap-ema-bb-short',
        });
      }
    }

    return signals;
  },
};
