/**
 * TradeClaw — Signal Engine Unit Tests
 * Covers: EMA, RSI, MACD, Bollinger Bands, Stochastic, S/R levels
 * Run: npm test (from repo root)
 */

import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  detectBollingerSqueeze,
  DEFAULT_SQUEEZE_THRESHOLD,
  calculateStochastic,
  findSupportLevels,
  findResistanceLevels,
  clamp,
  formatNumber,
} from '../index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function repeat(value: number, n: number): number[] {
  return Array(n).fill(value);
}

function linspace(start: number, end: number, n: number): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

// ─── EMA ──────────────────────────────────────────────────────────────────────

describe('calculateEMA', () => {
  it('returns 0 for empty input', () => {
    expect(calculateEMA([], 14)).toBe(0);
  });

  it('returns SMA when prices < period (fallback)', () => {
    const prices = [10, 20, 30]; // avg = 20
    expect(calculateEMA(prices, 14)).toBeCloseTo(20, 5);
  });

  it('returns price itself for a constant series', () => {
    const prices = repeat(100, 50);
    expect(calculateEMA(prices, 14)).toBeCloseTo(100, 5);
  });

  it('reacts to price increases (EMA rises)', () => {
    const low = repeat(100, 30);
    const high = repeat(200, 30);
    const series = [...low, ...high];
    const ema = calculateEMA(series, 14);
    // After 30 bars at 200, EMA should be significantly above 100
    expect(ema).toBeGreaterThan(150);
    expect(ema).toBeLessThan(200);
  });

  it('converges to 200 on long constant-200 series', () => {
    const prices = [...repeat(100, 20), ...repeat(200, 200)];
    const ema = calculateEMA(prices, 14);
    expect(ema).toBeCloseTo(200, 0);
  });

  it('period-1 EMA equals last price', () => {
    const prices = [10, 20, 30, 40, 50];
    expect(calculateEMA(prices, 1)).toBe(50);
  });
});

// ─── RSI ──────────────────────────────────────────────────────────────────────

describe('calculateRSI', () => {
  it('returns 50 (neutral) when not enough data', () => {
    expect(calculateRSI([10, 20, 30], 14)).toBe(50);
  });

  it('returns 100 for a pure up-trend (no losses)', () => {
    const prices = linspace(100, 200, 50);
    expect(calculateRSI(prices, 14)).toBe(100);
  });

  it('returns 0 for a pure down-trend (no gains)', () => {
    const prices = linspace(200, 100, 50);
    expect(calculateRSI(prices, 14)).toBe(0);
  });

  it('returns ~50 for alternating up/down equal moves', () => {
    const prices: number[] = [100];
    for (let i = 0; i < 50; i++) {
      prices.push(i % 2 === 0 ? prices[prices.length - 1] + 1 : prices[prices.length - 1] - 1);
    }
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThan(40);
    expect(rsi).toBeLessThan(60);
  });

  it('is in [0, 100] range', () => {
    const prices = Array.from({ length: 30 }, () => Math.random() * 100 + 50);
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it('oversold RSI < 30 on heavy downtrend', () => {
    const prices = [...repeat(100, 5), ...linspace(100, 50, 40)];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeLessThan(30);
  });

  it('overbought RSI > 70 on strong uptrend', () => {
    const prices = [...repeat(100, 5), ...linspace(100, 150, 40)];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThan(70);
  });
});

// ─── MACD ─────────────────────────────────────────────────────────────────────

describe('calculateMACD', () => {
  it('returns all zeros for constant price series', () => {
    const prices = repeat(100, 60);
    const { macd, signal, histogram } = calculateMACD(prices);
    expect(macd).toBeCloseTo(0, 4);
    expect(signal).toBeCloseTo(0, 4);
    expect(histogram).toBeCloseTo(0, 4);
  });

  it('returns positive MACD on strong uptrend', () => {
    const prices = linspace(50, 200, 60);
    const { macd } = calculateMACD(prices);
    expect(macd).toBeGreaterThan(0);
  });

  it('returns negative MACD on strong downtrend', () => {
    const prices = linspace(200, 50, 60);
    const { macd } = calculateMACD(prices);
    expect(macd).toBeLessThan(0);
  });

  it('histogram = macd - signal', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 20);
    const { macd, signal, histogram } = calculateMACD(prices);
    expect(histogram).toBeCloseTo(macd - signal, 8);
  });

  it('needs at least 26 prices to produce non-trivial results', () => {
    const prices = linspace(100, 200, 35);
    const result = calculateMACD(prices);
    expect(typeof result.macd).toBe('number');
    expect(typeof result.signal).toBe('number');
    expect(typeof result.histogram).toBe('number');
  });
});

// ─── Bollinger Bands ─────────────────────────────────────────────────────────

describe('calculateBollingerBands', () => {
  it('returns equal upper/lower/middle for constant series', () => {
    const prices = repeat(100, 25);
    const { upper, middle, lower } = calculateBollingerBands(prices);
    expect(upper).toBeCloseTo(100, 3);
    expect(middle).toBeCloseTo(100, 3);
    expect(lower).toBeCloseTo(100, 3);
  });

  it('upper > middle > lower for volatile series', () => {
    const prices = Array.from({ length: 25 }, (_, i) =>
      100 + (i % 2 === 0 ? 5 : -5)
    );
    const { upper, middle, lower } = calculateBollingerBands(prices);
    expect(upper).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(lower);
  });

  it('bands symmetric around middle', () => {
    const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 10);
    const { upper, middle, lower } = calculateBollingerBands(prices);
    const upperDelta = upper - middle;
    const lowerDelta = middle - lower;
    expect(upperDelta).toBeCloseTo(lowerDelta, 5);
  });

  it('band width increases with higher multiplier', () => {
    const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 10);
    const narrow = calculateBollingerBands(prices, 20, 1);
    const wide = calculateBollingerBands(prices, 20, 3);
    expect(wide.upper - wide.lower).toBeGreaterThan(narrow.upper - narrow.lower);
  });

  it('reports bandwidth as a percentage of the middle band', () => {
    // Tiny noise around 100 → very low bandwidth
    const prices = Array.from({ length: 25 }, (_, i) =>
      100 + (i % 2 === 0 ? 0.1 : -0.1)
    );
    const { bandwidth } = calculateBollingerBands(prices);
    expect(bandwidth).toBeLessThan(1); // <1% of middle
    expect(bandwidth).toBeGreaterThan(0);
  });
});

// ─── Bollinger Band Squeeze ──────────────────────────────────────────────────

describe('detectBollingerSqueeze', () => {
  it('returns squeeze=false when not enough data', () => {
    const result = detectBollingerSqueeze([100, 101, 99], 20);
    expect(result.squeeze).toBe(false);
    expect(result.bandwidth).toBe(0);
    expect(result.threshold).toBe(DEFAULT_SQUEEZE_THRESHOLD);
  });

  it('detects a squeeze on a tight range series', () => {
    // Prices oscillating in a ±0.1 band around 100 → bandwidth ≪ 4%
    const prices = Array.from({ length: 25 }, (_, i) =>
      100 + (i % 2 === 0 ? 0.1 : -0.1)
    );
    const result = detectBollingerSqueeze(prices);
    expect(result.squeeze).toBe(true);
    expect(result.bandwidth).toBeLessThan(DEFAULT_SQUEEZE_THRESHOLD);
  });

  it('does NOT report a squeeze on a wide-range series', () => {
    // Prices oscillating ±10 around 100 → bandwidth well above 4%
    const prices = Array.from({ length: 25 }, (_, i) =>
      100 + (i % 2 === 0 ? 10 : -10)
    );
    const result = detectBollingerSqueeze(prices);
    expect(result.squeeze).toBe(false);
    expect(result.bandwidth).toBeGreaterThan(DEFAULT_SQUEEZE_THRESHOLD);
  });

  it('honors a custom threshold', () => {
    const prices = Array.from({ length: 25 }, (_, i) =>
      100 + (i % 2 === 0 ? 1 : -1)
    );
    const tight = detectBollingerSqueeze(prices, 20, 2, 10);
    const loose = detectBollingerSqueeze(prices, 20, 2, 0.5);
    expect(tight.squeeze).toBe(true);
    expect(loose.squeeze).toBe(false);
  });
});

// ─── Stochastic ──────────────────────────────────────────────────────────────

describe('calculateStochastic', () => {
  it('returns 100 when close is always the high', () => {
    const n = 20;
    const high = repeat(110, n);
    const low = repeat(100, n);
    const close = repeat(110, n); // always at high
    const result = calculateStochastic(high, low, close);
    expect(result.k).toBeCloseTo(100, 4);
  });

  it('returns 0 when close is always the low', () => {
    const n = 20;
    const high = repeat(110, n);
    const low = repeat(100, n);
    const close = repeat(100, n); // always at low
    const result = calculateStochastic(high, low, close);
    expect(result.k).toBeCloseTo(0, 4);
  });

  it('k is in [0, 100]', () => {
    const n = 20;
    const high = Array.from({ length: n }, () => 100 + Math.random() * 10);
    const low = Array.from({ length: n }, () => 90 + Math.random() * 5);
    const close = Array.from({ length: n }, (_, i) =>
      low[i] + Math.random() * (high[i] - low[i])
    );
    const { k } = calculateStochastic(high, low, close);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThanOrEqual(100);
  });
});

// ─── Support / Resistance Levels ─────────────────────────────────────────────

describe('findSupportLevels', () => {
  it('returns correct number of levels', () => {
    const lows = [100, 95, 98, 90, 93, 88, 92, 86, 89, 84];
    const levels = findSupportLevels(lows, 3);
    expect(levels.length).toBeLessThanOrEqual(3);
  });

  it('levels are all from the input array values', () => {
    const lows = [100, 95, 98, 90, 93, 88, 92, 86, 89, 84];
    const levels = findSupportLevels(lows, 3);
    levels.forEach((level: number) => {
      expect(lows).toContain(level);
    });
  });

  it('returns empty array for empty input', () => {
    expect(findSupportLevels([], 3)).toEqual([]);
  });
});

describe('findResistanceLevels', () => {
  it('returns correct number of levels', () => {
    const highs = [100, 105, 102, 110, 107, 112, 108, 115, 111, 118];
    const levels = findResistanceLevels(highs, 3);
    expect(levels.length).toBeLessThanOrEqual(3);
  });

  it('levels are all from the input array values', () => {
    const highs = [100, 105, 102, 110, 107, 112, 108, 115, 111, 118];
    const levels = findResistanceLevels(highs, 3);
    levels.forEach((level: number) => {
      expect(highs).toContain(level);
    });
  });
});

// ─── Utility Functions ────────────────────────────────────────────────────────

describe('clamp', () => {
  it('clamps to min', () => expect(clamp(-10, 0, 100)).toBe(0));
  it('clamps to max', () => expect(clamp(200, 0, 100)).toBe(100));
  it('passes through value in range', () => expect(clamp(50, 0, 100)).toBe(50));
  it('handles min === max', () => expect(clamp(50, 75, 75)).toBe(75));
});

describe('formatNumber', () => {
  it('formats to 4 decimals for values between 1–999', () => expect(formatNumber(3.14159)).toBe('3.1416'));
  it('formats to specified decimals', () => expect(formatNumber(3.14159, 4)).toBe('3.1416'));
  it('uses 5 decimals for very small numbers (< 0.01)', () => {
    const result = formatNumber(0.00123);
    expect(result).toMatch(/0\.00123/);
  });
  it('adds thousands separator for large numbers', () => {
    // formatNumber uses toLocaleString — commas are expected
    expect(formatNumber(1234567.89, 2)).toMatch(/1,234,567\.89/);
  });
});
