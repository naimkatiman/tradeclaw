import type { IndicatorPlugin, OHLCV, IndicatorResult } from '../../packages/core/src/plugins/types';

/**
 * Williams %R indicator plugin.
 *
 * Williams %R oscillates between 0 and -100:
 *   - Values above -20 indicate overbought conditions (SELL signal)
 *   - Values below -80 indicate oversold conditions  (BUY signal)
 *   - Values in between are neutral                   (HOLD signal)
 *
 * Default look-back period: 14 candles.
 */

const PERIOD = 14;
const OVERBOUGHT = -20;
const OVERSOLD = -80;

function computeWilliamsR(candles: OHLCV[], period: number): number | null {
  if (candles.length < period) {
    return null;
  }

  const window = candles.slice(-period);
  const highestHigh = Math.max(...window.map((c) => c.high));
  const lowestLow = Math.min(...window.map((c) => c.low));
  const currentClose = candles[candles.length - 1].close;

  if (highestHigh === lowestLow) {
    return -50; // midpoint when range is zero
  }

  return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
}

const williamsRPlugin: IndicatorPlugin = {
  name: 'williams-r',
  version: '1.0.0',

  compute(candles: OHLCV[]): IndicatorResult {
    const value = computeWilliamsR(candles, PERIOD);

    if (value === null) {
      return {
        signal: 'HOLD',
        confidence: 0,
        meta: { error: `Need at least ${PERIOD} candles, got ${candles.length}` },
      };
    }

    let signal: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (value < OVERSOLD) {
      signal = 'BUY';
      // Deeper oversold = higher confidence (range -80 to -100 maps to 60-100)
      confidence = Math.min(100, Math.round(60 + (Math.abs(value) - 80) * 2));
    } else if (value > OVERBOUGHT) {
      signal = 'SELL';
      // Higher overbought = higher confidence (range -20 to 0 maps to 60-100)
      confidence = Math.min(100, Math.round(60 + (20 - Math.abs(value)) * 2));
    } else {
      signal = 'HOLD';
      confidence = 30;
    }

    return {
      signal,
      confidence,
      meta: { williamsR: value, period: PERIOD },
    };
  },
};

export default williamsRPlugin;
