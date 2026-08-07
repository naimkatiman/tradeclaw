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
  it('barCloseTs reflects the close of the classified bar (bar 259 opens 259*DAY_MS, closes 260*DAY_MS)', () => {
    const series = buildRegimeSeries(trendBars(260, 5));
    const signalTs = 259 * DAY_MS + DAY_MS;
    expect(regimeAt(series, signalTs)!.barCloseTs).toBe(260 * DAY_MS);
  });
});

describe('classifyBucket (direct RegimeSnapshot fixtures)', () => {
  it('returns null when the variant detector value is unavailable, under every variant', () => {
    const regime: RegimeSnapshot = { trendSide: 'up', adx: null, er: null, barCloseTs: 0 };
    for (const variant of VARIANTS) {
      expect(classifyBucket('BUY', regime, variant)).toBeNull();
    }
  });
  it('returns sideways when the detector is strong but trendSide is none, under every variant', () => {
    const regime: RegimeSnapshot = { trendSide: 'none', adx: 30, er: 0.8, barCloseTs: 0 };
    for (const variant of VARIANTS) {
      expect(classifyBucket('BUY', regime, variant)).toBe('sideways');
    }
  });
});

import {
  computeBucketStats,
  invertTrade,
  computeCostCurve,
  reconcile,
  parseCliArgs,
  type StudyTrade,
} from '../regime-study-assembly';

function trade(over: Partial<StudyTrade>): StudyTrade {
  return {
    ts: 0, pair: 'BTCUSD', direction: 'BUY', strategyId: 'classic', confidence: 80,
    rRaw: 1, rSized: 1, costR: 0.5, isWin: true, ...over,
  };
}

describe('computeBucketStats', () => {
  it('computes exact stats on a hand-built set', () => {
    const trades = [
      trade({ rRaw: 2, rSized: 2, costR: 0.4, isWin: true }),
      trade({ rRaw: -1, rSized: -1, costR: 0.6, isWin: false }),
      trade({ rRaw: 1, rSized: 1, costR: 0.5, isWin: true }),
    ];
    const s = computeBucketStats(trades, 3);
    expect(s.n).toBe(3);
    expect(s.winRatePct).toBeCloseTo(66.7, 1);
    expect(s.avgWinR).toBeCloseTo(1.5, 10);       // (2+1)/2 on rRaw
    expect(s.avgLossR).toBeCloseTo(-1, 10);
    expect(s.grossExpectancyR).toBeCloseTo((2 - 1 + 1) / 3, 10);
    expect(s.avgCostR).toBeCloseTo(0.5, 10);
    expect(s.netExpectancyR).toBeCloseTo((2 - 0.4 - 1 - 0.6 + 1 - 0.5) / 3, 10); // net uses rSized - costR
    expect(s.conclusive).toBe(true);
  });
  it('marks small samples inconclusive', () => {
    expect(computeBucketStats([trade({})], 300).conclusive).toBe(false);
  });
  it('handles the empty bucket', () => {
    const s = computeBucketStats([], 300);
    expect(s.n).toBe(0);
    expect(s.netExpectancyR).toBe(0);
  });
});

describe('invertTrade', () => {
  it('flips gross R and win flag, keeps cost, re-caps sized R', () => {
    const t = invertTrade(trade({ rRaw: 20, rSized: 8, costR: 0.5, isWin: true }));
    expect(t.rRaw).toBe(-20);
    expect(t.rSized).toBe(-8);
    expect(t.costR).toBe(0.5);
    expect(t.isWin).toBe(false);
    expect(t.direction).toBe('SELL');
  });
});

describe('computeCostCurve', () => {
  it('scales avg cost inversely with the stop-width multiple', () => {
    const trades = [trade({ costR: 0.4 }), trade({ costR: 0.6 })];
    const curve = computeCostCurve(trades, [1, 2, 5]);
    expect(curve).toEqual([
      { multiple: 1, avgCostR: 0.5 },
      { multiple: 2, avgCostR: 0.25 },
      { multiple: 5, avgCostR: 0.1 },
    ]);
  });
});

describe('reconcile (pre-registered gates)', () => {
  it('passes a stream matching the dashboard decomposition', () => {
    // 3100 trades: gross +0.02, cost 0.51 -> net -0.49
    const trades = Array.from({ length: 3100 }, () =>
      trade({ rRaw: 0.02, rSized: 0.02, costR: 0.51 }));
    const r = reconcile(trades);
    expect(r.pass).toBe(true);
    expect(r.failures).toEqual([]);
  });
  it('fails on wrong N, gross, cost, or net — with named failures', () => {
    const small = reconcile(Array.from({ length: 100 }, () => trade({})));
    expect(small.pass).toBe(false);
    expect(small.failures.join(' ')).toContain('n');
  });
  it('fails closed when aggregate metrics are non-finite', () => {
    const poisoned = reconcile(Array.from({ length: 3100 }, () =>
      trade({ rRaw: Number.NaN, rSized: Number.NaN, costR: Number.POSITIVE_INFINITY })));

    expect(poisoned.pass).toBe(false);
    expect(poisoned.failures).toEqual([
      'gross NaN is not finite',
      'cost Infinity is not finite',
      'net NaN is not finite',
    ]);
  });
});

describe('parseCliArgs', () => {
  it('applies defaults (minN 300)', () => {
    expect(parseCliArgs([])).toEqual({ days: null, minN: 300, jsonPath: null, help: false });
  });
  it('parses flags', () => {
    expect(parseCliArgs(['--days', '30', '--min-n', '100', '--json', 'out.json'])).toEqual({
      days: 30, minN: 100, jsonPath: 'out.json', help: false,
    });
  });
  it('rejects unknown flags and bad integers', () => {
    expect(() => parseCliArgs(['--nope'])).toThrow();
    expect(() => parseCliArgs(['--days', '0'])).toThrow();
    expect(() => parseCliArgs(['--days', 'abc'])).toThrow();
  });
  it('handles --help', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
  });
});
