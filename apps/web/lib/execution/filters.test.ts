/**
 * Pure-function tests for entry filters. No network, no DB.
 *
 * Builds synthetic kline series with controlled EMA slope and ADX values
 * to exercise direction + regime gates deterministically.
 */

import type { BinanceKline, BinancePosition } from './binance-futures';
import {
  concurrencyFilter,
  directionFilter,
  regimeFilter,
  runEntryFilters,
  universeFilter,
} from './filters';

function k(open: number, high: number, low: number, close: number): BinanceKline {
  return { openTime: 0, open, high, low, close, volume: 0, closeTime: 0 };
}

function risingSeries(n: number, start = 100, step = 0.5): BinanceKline[] {
  const out: BinanceKline[] = [];
  for (let i = 0; i < n; i++) {
    const c = start + i * step;
    out.push(k(c - 0.1, c + 0.2, c - 0.2, c));
  }
  return out;
}

function fallingSeries(n: number, start = 100, step = 0.5): BinanceKline[] {
  return risingSeries(n, start, -step);
}

function flatSeries(n: number, price = 100): BinanceKline[] {
  const out: BinanceKline[] = [];
  for (let i = 0; i < n; i++) out.push(k(price, price + 0.001, price - 0.001, price));
  return out;
}

const POS = (symbol: string, qty = 1): BinancePosition => ({
  symbol,
  positionAmt: qty,
  entryPrice: 100,
  markPrice: 100,
  unrealizedProfit: 0,
  leverage: 5,
  isolated: true,
  positionSide: 'BOTH',
});

describe('universeFilter', () => {
  test('passes when symbol is in the set', () => {
    expect(universeFilter('BTCUSDT', new Set(['BTCUSDT']))).toEqual({ passed: true });
  });

  test('rejects when not in set', () => {
    const v = universeFilter('XRPUSDT', new Set(['BTCUSDT']));
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('not_in_universe');
  });
});

describe('concurrencyFilter', () => {
  test('rejects when symbol already has a live position', () => {
    const v = concurrencyFilter('BTCUSDT', {
      livePositions: [POS('BTCUSDT')],
      openExecutionCount: 1,
      maxPositions: 4,
    });
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('symbol_has_open_position');
  });

  test('rejects when global cap reached', () => {
    const v = concurrencyFilter('BTCUSDT', {
      livePositions: [],
      openExecutionCount: 4,
      maxPositions: 4,
    });
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('max_positions_reached');
  });

  test('passes when below cap and symbol clean', () => {
    expect(
      concurrencyFilter('BTCUSDT', {
        livePositions: [POS('ETHUSDT')],
        openExecutionCount: 1,
        maxPositions: 4,
      }),
    ).toEqual({ passed: true });
  });

  test('treats positionAmt=0 as no position (Binance returns zeroed rows)', () => {
    const v = concurrencyFilter('BTCUSDT', {
      livePositions: [{ ...POS('BTCUSDT'), positionAmt: 0 }],
      openExecutionCount: 0,
      maxPositions: 4,
    });
    expect(v.passed).toBe(true);
  });
});

describe('directionFilter', () => {
  test('LONG passes when EMA-50 slope is rising', () => {
    const v = directionFilter(risingSeries(60), 'BUY');
    expect(v.passed).toBe(true);
  });

  test('LONG rejects when EMA-50 slope is falling', () => {
    const v = directionFilter(fallingSeries(60), 'BUY');
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('direction_disagrees');
  });

  test('SHORT passes on falling slope', () => {
    expect(directionFilter(fallingSeries(60), 'SELL').passed).toBe(true);
  });

  test('SHORT rejects on rising slope', () => {
    const v = directionFilter(risingSeries(60), 'SELL');
    expect(v.passed).toBe(false);
  });

  test('insufficient data returns explicit reason', () => {
    const v = directionFilter(risingSeries(10), 'BUY');
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('insufficient_data_for_direction');
  });
});

describe('regimeFilter', () => {
  test('strong trend yields ADX above floor and passes', () => {
    // 100 strongly-trending candles produce ADX well above 20.
    const v = regimeFilter(risingSeries(100, 100, 1.0));
    expect(v.passed).toBe(true);
  });

  test('flat series fails ADX floor', () => {
    const v = regimeFilter(flatSeries(60));
    expect(v.passed).toBe(false);
    if (v.passed) return;
    // Either chop or insufficient_data depending on ADX warmup; both are rejections.
    expect(['regime_chop', 'insufficient_data_for_regime']).toContain(v.reason);
  });

  test('insufficient candles returns explicit reason', () => {
    const v = regimeFilter(risingSeries(5));
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('insufficient_data_for_regime');
  });
});

describe('runEntryFilters — composition order', () => {
  test('universe rejects before any kline math runs', () => {
    const v = runEntryFilters({
      symbol: 'XRPUSDT',
      side: 'BUY',
      todayUniverse: new Set(['BTCUSDT']),
      concurrencyState: { livePositions: [], openExecutionCount: 0, maxPositions: 4 },
      klinesH1: [],                     // would otherwise fail "insufficient data"
    });
    expect(v.passed).toBe(false);
    if (v.passed) return;
    expect(v.reason).toBe('not_in_universe');
  });

  test('all gates pass on a clean trending setup', () => {
    const v = runEntryFilters({
      symbol: 'BTCUSDT',
      side: 'BUY',
      todayUniverse: new Set(['BTCUSDT']),
      concurrencyState: { livePositions: [], openExecutionCount: 0, maxPositions: 4 },
      klinesH1: risingSeries(100, 100, 1.0),
    });
    expect(v.passed).toBe(true);
  });
});
