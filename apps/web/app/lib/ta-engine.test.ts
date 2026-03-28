import { calculateRSI, calculateADX, calculateVolumeSMA } from './ta-engine';

describe('calculateRSI', () => {

  test('returns NaN when not enough data', () => {
    const result = calculateRSI([10, 11], 14);

    expect(result.current).toBeNaN();
    expect(result.values.every(v => isNaN(v))).toBe(true);
  });

  test('all gains → RSI should be 100', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const result = calculateRSI(prices, 14);

    expect(result.current).toBe(100);
  });

  test('all losses → RSI should be near 0', () => {
    const prices = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const result = calculateRSI(prices, 14);

    expect(result.current).toBeLessThan(1);
  });

  test('flat prices → RSI should be 100 (no losses)', () => {
    const prices = Array(20).fill(10);
    const result = calculateRSI(prices, 14);

    expect(result.current).toBe(100);
  });

  test('mixed values → RSI between 0 and 100', () => {
    const prices = [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19];
    const result = calculateRSI(prices, 14);

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  test('values array structure is correct', () => {
    const prices = [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19];
    const result = calculateRSI(prices, 14);

    for (let i = 0; i < 14; i++) {
      expect(result.values[i]).toBeNaN();
    }

    expect(result.values[14]).not.toBeNaN();
  });

});

describe('calculateADX', () => {

  test('returns NaN when not enough data', () => {
    const highs = [11, 12, 13];
    const lows = [9, 10, 11];
    const closes = [10, 11, 12];
    const result = calculateADX(highs, lows, closes, 14);

    expect(result.current.adx).toBeNaN();
    expect(result.adx.every(v => isNaN(v))).toBe(true);
  });

  test('strong uptrend returns ADX > 20 with +DI > -DI', () => {
    const len = 60;
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i < len; i++) {
      const base = 100 + i * 2;
      highs.push(base + 3);
      lows.push(base - 1);
      closes.push(base + 1);
    }

    const result = calculateADX(highs, lows, closes, 14);
    expect(result.current.adx).toBeGreaterThan(20);
    expect(result.current.plusDI).toBeGreaterThan(result.current.minusDI);
  });

  test('ranging market returns lower ADX', () => {
    const len = 60;
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i < len; i++) {
      const base = 100 + Math.sin(i * 0.5) * 2;
      highs.push(base + 1);
      lows.push(base - 1);
      closes.push(base);
    }

    const result = calculateADX(highs, lows, closes, 14);
    expect(result.current.adx).not.toBeNaN();
    expect(result.current.adx).toBeLessThan(50);
  });

  test('values array length matches input length', () => {
    const len = 50;
    const highs = Array.from({ length: len }, (_, i) => 105 + i);
    const lows = Array.from({ length: len }, (_, i) => 95 + i);
    const closes = Array.from({ length: len }, (_, i) => 100 + i);

    const result = calculateADX(highs, lows, closes, 14);
    expect(result.adx.length).toBe(len);
    expect(result.plusDI.length).toBe(len);
    expect(result.minusDI.length).toBe(len);
  });
});

describe('calculateVolumeSMA', () => {

  test('volume ratio > 1.5 when current volume is above average', () => {
    const volumes = [...Array(19).fill(1000), 3000];
    const result = calculateVolumeSMA(volumes, 20);

    expect(result.ratio).toBeGreaterThan(1.5);
    expect(result.currentVolume).toBe(3000);
    expect(result.isSynthetic).toBe(false);
  });

  test('volume ratio < 1 when current volume is below average', () => {
    const volumes = [...Array(19).fill(1000), 500];
    const result = calculateVolumeSMA(volumes, 20);

    expect(result.ratio).toBeLessThan(1);
    expect(result.currentVolume).toBe(500);
  });

  test('handles zero-volume data (synthetic detection)', () => {
    const volumes = Array(25).fill(0);
    const result = calculateVolumeSMA(volumes, 20);

    expect(result.isSynthetic).toBe(true);
  });

  test('detects synthetic data when all volumes are similar', () => {
    const volumes = Array(25).fill(1000);
    const result = calculateVolumeSMA(volumes, 20);

    expect(result.isSynthetic).toBe(true);
  });

  test('real-looking volume data is not flagged as synthetic', () => {
    const volumes = [500, 1200, 800, 2000, 1500, 600, 3000, 900, 1100, 1800,
                     700, 2500, 1000, 1400, 900, 2200, 600, 1700, 1300, 4000,
                     800, 1500, 2100, 900, 1600];
    const result = calculateVolumeSMA(volumes, 20);

    expect(result.isSynthetic).toBe(false);
  });
});