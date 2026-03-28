import { calculateRSI } from './ta-engine';

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