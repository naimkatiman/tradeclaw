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
