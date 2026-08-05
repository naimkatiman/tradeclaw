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

import {
  lastClosedBarIndex,
  buildRegimeSeries,
  regimeAt,
  classifyBucket,
  DAY_MS,
  VARIANTS,
  type RegimeSnapshot,
} from '../regime-study-assembly';

describe('lastClosedBarIndex (the lookahead gate)', () => {
  const ts = [0, DAY_MS, 2 * DAY_MS, 3 * DAY_MS]; // D1 open times
  it('returns the last bar whose CLOSE is at or before the signal', () => {
    // signal exactly at close of bar 1 (open DAY_MS + DAY_MS): bar 1 usable
    expect(lastClosedBarIndex(ts, DAY_MS, 2 * DAY_MS)).toBe(1);
    // one ms earlier: bar 1 still open -> bar 0
    expect(lastClosedBarIndex(ts, DAY_MS, 2 * DAY_MS - 1)).toBe(0);
  });
  it('returns -1 when no bar has closed yet', () => {
    expect(lastClosedBarIndex(ts, DAY_MS, DAY_MS - 1)).toBe(-1);
  });
  it('returns the final bar for far-future signals', () => {
    expect(lastClosedBarIndex(ts, DAY_MS, 100 * DAY_MS)).toBe(3);
  });
});

function trendBars(n: number, step: number, start = 1000): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const close = start + step * i;
    return { timestamp: i * DAY_MS, open: close, high: close * 1.005, low: close * 0.995, close, volume: 1 };
  });
}

describe('regimeAt + classifyBucket', () => {
  it('classifies an established uptrend as up/aligned for BUY, counter for SELL', () => {
    const series = buildRegimeSeries(trendBars(260, 5));
    const signalTs = 259 * DAY_MS + DAY_MS; // after final close
    const regime = regimeAt(series, signalTs)!;
    expect(regime.trendSide).toBe('up');
    expect(classifyBucket('BUY', regime, 'adx20')).toBe('aligned');
    expect(classifyBucket('SELL', regime, 'adx20')).toBe('counter');
    expect(classifyBucket('BUY', regime, 'er030')).toBe('aligned');
  });
  it('classifies chop as sideways under every variant', () => {
    // 220 warmup up-bars then 60 alternating bars around a flat level
    const bars = trendBars(220, 5);
    const last = bars[bars.length - 1].close;
    for (let i = 0; i < 60; i++) {
      const close = last + (i % 2 === 0 ? 0 : 3);
      bars.push({ timestamp: (220 + i) * DAY_MS, open: close, high: close + 4, low: close - 4, close, volume: 1 });
    }
    const series = buildRegimeSeries(bars);
    const regime = regimeAt(series, 280 * DAY_MS)!;
    expect(classifyBucket('BUY', regime, 'adx20')).toBe('sideways');
    expect(classifyBucket('BUY', regime, 'er030')).toBe('sideways');
  });
  it('returns null (unclassified) during warmup', () => {
    const series = buildRegimeSeries(trendBars(50, 5));
    expect(regimeAt(series, 49 * DAY_MS + DAY_MS)).toBeNull();
  });
  it('returns null when the signal predates every close', () => {
    const series = buildRegimeSeries(trendBars(260, 5));
    expect(regimeAt(series, 0)).toBeNull();
  });
});

describe('classifyBucket (direct RegimeSnapshot fixtures)', () => {
  it('returns null when the variant detector value is unavailable, under every variant', () => {
    const regime: RegimeSnapshot = { trendSide: 'up', adx: null, er: null };
    for (const variant of VARIANTS) {
      expect(classifyBucket('BUY', regime, variant)).toBeNull();
    }
  });
  it('returns sideways when the detector is strong but trendSide is none, under every variant', () => {
    const regime: RegimeSnapshot = { trendSide: 'none', adx: 30, er: 0.8 };
    for (const variant of VARIANTS) {
      expect(classifyBucket('BUY', regime, variant)).toBe('sideways');
    }
  });
});
