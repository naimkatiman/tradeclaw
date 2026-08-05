import {
  isCountedRow,
  toStudyTrade,
  type StudyRow,
} from '../regime-study-assembly';

const baseRow: StudyRow = {
  pair: 'BTCUSD',
  timeframe: 'M15',
  direction: 'BUY',
  confidence: 80,
  entry_price: 100,
  sl: 98,
  cost_estimate_pct: 0.4,
  strategy_id: 'classic',
  created_at: '2026-07-01T00:00:00.000Z',
  pnl_pct: 3,
  hit: true,
  target: 'TP1',
  source: 'binance',
};

describe('isCountedRow (mirrors lib isCountedResolved, NOT recost-segment)', () => {
  it('counts a resolved observed-source row', () => {
    expect(isCountedRow(baseRow)).toBe(true);
  });
  it('drops unresolved rows', () => {
    expect(isCountedRow({ ...baseRow, pnl_pct: null, hit: null })).toBe(false);
  });
  it('drops the force-expiry placeholder (pnl 0, not hit)', () => {
    expect(isCountedRow({ ...baseRow, pnl_pct: 0, hit: false })).toBe(false);
  });
  it('KEEPS a nonzero target=expired row (mark-to-market close is real)', () => {
    expect(isCountedRow({ ...baseRow, target: 'expired', pnl_pct: -1.2, hit: false })).toBe(true);
  });
  it('drops rows without approved observed-OHLCV source', () => {
    expect(isCountedRow({ ...baseRow, source: null })).toBe(false);
    expect(isCountedRow({ ...baseRow, source: 'force-expired' })).toBe(false);
  });
});

describe('toStudyTrade', () => {
  it('computes riskPct, rRaw, sized cap, costR from persisted cost', () => {
    // riskPct = |100-98|/100*100 = 2. rRaw = 3/2 = 1.5. costR = 0.4/2 = 0.2.
    const t = toStudyTrade(baseRow)!;
    expect(t.rRaw).toBeCloseTo(1.5, 10);
    expect(t.rSized).toBeCloseTo(1.5, 10);
    expect(t.costR).toBeCloseTo(0.2, 10);
    expect(t.isWin).toBe(true);
    expect(t.direction).toBe('BUY');
    expect(t.pair).toBe('BTCUSD');
    expect(t.strategyId).toBe('classic');
  });
  it('caps sized R at ±8 but keeps rRaw uncapped', () => {
    const t = toStudyTrade({ ...baseRow, pnl_pct: 40 })!; // rRaw = 20
    expect(t.rRaw).toBeCloseTo(20, 10);
    expect(t.rSized).toBe(8);
  });
  it('falls back to asset-class cost when cost_estimate_pct is null (crypto 0.40)', () => {
    const t = toStudyTrade({ ...baseRow, cost_estimate_pct: null })!;
    expect(t.costR).toBeCloseTo(0.4 / 2, 10);
  });
  it('returns null when sl is missing or entry invalid', () => {
    expect(toStudyTrade({ ...baseRow, sl: null })).toBeNull();
    expect(toStudyTrade({ ...baseRow, entry_price: 0 })).toBeNull();
  });
  it('returns null for uncounted rows', () => {
    expect(toStudyTrade({ ...baseRow, source: null })).toBeNull();
  });
});

import { adxSeries, efficiencyRatioSeries, type Bar } from '../regime-study-assembly';

function bar(close: number, spreadPct = 1): Bar {
  const half = (close * spreadPct) / 200;
  return { timestamp: 0, open: close, high: close + half, low: close - half, close, volume: 1 };
}

describe('adxSeries (Wilder, period 14)', () => {
  it('is null through the warmup (first 2*period-1 bars)', () => {
    const bars = Array.from({ length: 40 }, (_, i) => bar(100 + i));
    const adx = adxSeries(bars, 14);
    for (let i = 0; i < 27; i++) expect(adx[i]).toBeNull();
    expect(adx[27]).not.toBeNull();
    expect(adx.length).toBe(40);
  });
  it('reads high on a persistent one-way trend', () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(100 + 2 * i));
    const adx = adxSeries(bars, 14);
    expect(adx[59]!).toBeGreaterThan(60);
  });
  it('reads low on alternating chop', () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(100 + (i % 2 === 0 ? 0 : 0.5)));
    const adx = adxSeries(bars, 14);
    expect(adx[59]!).toBeLessThan(20);
  });
  it('returns all nulls when there are not enough bars', () => {
    const adx = adxSeries(Array.from({ length: 10 }, () => bar(100)), 14);
    expect(adx.every((v) => v === null)).toBe(true);
  });
});

describe('efficiencyRatioSeries (Kaufman, window 20)', () => {
  it('is 1 for a perfectly straight line', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const er = efficiencyRatioSeries(closes, 20);
    expect(er[20]!).toBeCloseTo(1, 10);
    expect(er[29]!).toBeCloseTo(1, 10);
  });
  it('is ~0 for a full round trip', () => {
    // 10 up then 10 down: net 0, path 20
    const closes: number[] = [100];
    for (let i = 0; i < 10; i++) closes.push(closes[closes.length - 1] + 1);
    for (let i = 0; i < 10; i++) closes.push(closes[closes.length - 1] - 1);
    const er = efficiencyRatioSeries(closes, 20);
    expect(er[20]!).toBeCloseTo(0, 10);
  });
  it('is null during warmup (indices 0..window-1)', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i);
    const er = efficiencyRatioSeries(closes, 20);
    for (let i = 0; i < 20; i++) expect(er[i]).toBeNull();
  });
});
