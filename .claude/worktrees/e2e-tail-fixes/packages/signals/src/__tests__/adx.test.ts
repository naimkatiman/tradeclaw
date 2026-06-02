import { calculateADX } from '../index.js';

function repeat(value: number, n: number): number[] {
  return Array(n).fill(value);
}

function linspace(start: number, end: number, n: number): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

describe('calculateADX', () => {
  it('returns neutral values when not enough data', () => {
    const high = [110, 115, 112];
    const low = [105, 108, 107];
    const close = [108, 113, 110];
    const result = calculateADX(high, low, close, 14);
    expect(result).toEqual({ value: 0, plusDI: 0, minusDI: 0, trending: false });
  });

  it('shows strong trending and +DI > -DI on clear uptrend', () => {
    const n = 60;
    const closes = linspace(100, 200, n);
    const high = closes.map(c => c + 2);
    const low = closes.map(c => c - 1);
    const result = calculateADX(high, low, closes, 14);
    expect(result.value).toBeGreaterThanOrEqual(25);
    expect(result.trending).toBe(true);
    expect(result.plusDI).toBeGreaterThan(result.minusDI);
  });

  it('shows strong trending and -DI > +DI on clear downtrend', () => {
    const n = 60;
    const closes = linspace(200, 100, n);
    const high = closes.map(c => c + 1);
    const low = closes.map(c => c - 2);
    const result = calculateADX(high, low, closes, 14);
    expect(result.value).toBeGreaterThanOrEqual(25);
    expect(result.trending).toBe(true);
    expect(result.minusDI).toBeGreaterThan(result.plusDI);
  });

  it('shows weak trend (ADX < 25) on sideways market', () => {
    const n = 60;
    const base = 100;
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];
    for (let i = 0; i < n; i++) {
      const offset = (i % 4) - 1.5;
      high.push(base + Math.abs(offset) + 0.5);
      low.push(base - Math.abs(offset) - 0.5);
      close.push(base + offset * 0.3);
    }
    const result = calculateADX(high, low, close, 14);
    expect(result.value).toBeLessThan(25);
    expect(result.trending).toBe(false);
  });

  it('ADX value is in [0, 100] range', () => {
    const n = 60;
    const closes = linspace(100, 300, n);
    const high = closes.map(c => c + 5);
    const low = closes.map(c => c - 5);
    const result = calculateADX(high, low, closes, 14);
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(100);
  });

  it('+DI is in [0, 100] range', () => {
    const n = 60;
    const closes = linspace(100, 200, n);
    const high = closes.map(c => c + 3);
    const low = closes.map(c => c - 1);
    const result = calculateADX(high, low, closes, 14);
    expect(result.plusDI).toBeGreaterThanOrEqual(0);
    expect(result.plusDI).toBeLessThanOrEqual(100);
  });

  it('-DI is in [0, 100] range', () => {
    const n = 60;
    const closes = linspace(200, 100, n);
    const high = closes.map(c => c + 1);
    const low = closes.map(c => c - 3);
    const result = calculateADX(high, low, closes, 14);
    expect(result.minusDI).toBeGreaterThanOrEqual(0);
    expect(result.minusDI).toBeLessThanOrEqual(100);
  });

  it('trending is true when ADX >= 25', () => {
    const n = 80;
    const closes = linspace(50, 250, n);
    const high = closes.map(c => c + 3);
    const low = closes.map(c => c - 1);
    const result = calculateADX(high, low, closes, 14);
    expect(result.trending).toBe(result.value >= 25);
  });
});
