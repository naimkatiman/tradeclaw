import { trimClosedCandles, type OHLCV } from '../ohlcv';

const makeCandle = (timestamp: number): OHLCV => ({
  timestamp,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 1000,
});

describe('trimClosedCandles', () => {
  it('keeps candles whose close time has passed', () => {
    const now = Date.parse('2026-05-25T10:00:00Z');
    const candles: OHLCV[] = [
      makeCandle(Date.parse('2026-05-25T08:00:00Z')), // H1: closes 09:00:00 — kept
      makeCandle(Date.parse('2026-05-25T09:00:00Z')), // H1: closes 10:00:00 — kept
    ];
    const result = trimClosedCandles(candles, 'H1', now);
    expect(result).toHaveLength(2);
  });

  it('drops the currently-forming candle', () => {
    const now = Date.parse('2026-05-25T10:00:00Z');
    const candles: OHLCV[] = [
      makeCandle(Date.parse('2026-05-25T09:00:00Z')), // closes 10:00:00 — kept
      makeCandle(Date.parse('2026-05-25T10:00:00Z')), // closes 11:00:00 — dropped
    ];
    const result = trimClosedCandles(candles, 'H1', now);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(Date.parse('2026-05-25T09:00:00Z'));
  });

  it('works for M5 candles', () => {
    const now = Date.parse('2026-05-25T10:02:00Z');
    const candles: OHLCV[] = [
      makeCandle(Date.parse('2026-05-25T09:55:00Z')), // closes 10:00:00 — kept
      makeCandle(Date.parse('2026-05-25T10:00:00Z')), // closes 10:05:00 — dropped
    ];
    const result = trimClosedCandles(candles, 'M5', now);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(Date.parse('2026-05-25T09:55:00Z'));
  });

  it('works for D1 candles', () => {
    const now = Date.parse('2026-05-25T12:00:00Z');
    const candles: OHLCV[] = [
      makeCandle(Date.parse('2026-05-24T00:00:00Z')), // closes 25th 00:00:00 — kept
      makeCandle(Date.parse('2026-05-25T00:00:00Z')), // closes 26th 00:00:00 — dropped
    ];
    const result = trimClosedCandles(candles, 'D1', now);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(Date.parse('2026-05-24T00:00:00Z'));
  });

  it('returns all candles when the newest one is already closed', () => {
    const now = Date.parse('2026-05-25T11:05:00Z');
    const candles: OHLCV[] = [
      makeCandle(Date.parse('2026-05-25T09:00:00Z')),
      makeCandle(Date.parse('2026-05-25T10:00:00Z')), // closes 11:00:00 — kept at 11:05
    ];
    const result = trimClosedCandles(candles, 'H1', now);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when input is empty', () => {
    const result = trimClosedCandles([], 'H1');
    expect(result).toHaveLength(0);
  });

  it('returns candles unchanged for unknown timeframe', () => {
    const candles: OHLCV[] = [makeCandle(Date.now())];
    const result = trimClosedCandles(candles, 'UNKNOWN');
    expect(result).toBe(candles);
  });

  it('filters correctly at the exact boundary', () => {
    const candleTs = Date.parse('2026-05-25T10:00:00Z');
    const now = candleTs + 60 * 60 * 1000; // exactly 1 hour later
    const candles: OHLCV[] = [
      makeCandle(candleTs), // closes at `now` — kept (<=)
    ];
    const result = trimClosedCandles(candles, 'H1', now);
    expect(result).toHaveLength(1);
  });
});
