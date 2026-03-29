import type { UTCTimestamp } from 'lightweight-charts';
import type { OHLCVBar } from '../components/charts/types';

/** Convert millisecond timestamp to UTCTimestamp (seconds) */
export function toUTC(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

/**
 * Generate synthetic OHLCV bars around a signal entry price.
 * Pre-signal bars show buildup, post-signal bars show directional drift.
 */
export function generateBars(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  timestamp: number,
  count = 80,
): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  let price = entryPrice;
  const step = 3600; // 1h in seconds
  const vol = price * 0.004;
  let seed = timestamp % 1e9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  for (let i = -30; i < count; i++) {
    const drift =
      i >= 0 && i < 40
        ? direction === 'BUY'
          ? 0.0006
          : -0.0006
        : 0;
    const change = (rand() - 0.48 + drift) * vol;
    const open = price;
    price = Math.max(price + change, price * 0.98);
    const range = rand() * vol * 0.8;
    const high = Math.max(open, price) + range * 0.5;
    const low = Math.min(open, price) - range * 0.5;
    bars.push({
      time: toUTC(timestamp + i * step * 1000),
      open,
      high,
      low,
      close: price,
      volume: rand() * 1000 + 200,
    });
  }
  return bars;
}

/** Convert a flat price array into OHLCVBar[] with synthetic OHLC */
export function pricesToBars(
  prices: number[],
  startTime: number = Date.now() - prices.length * 3600000,
  intervalMs: number = 3600000,
): OHLCVBar[] {
  return prices.map((close, i) => {
    const spread = close * 0.002;
    return {
      time: toUTC(startTime + i * intervalMs),
      open: close - spread * 0.3,
      high: close + spread,
      low: close - spread,
      close,
      volume: 500,
    };
  });
}
