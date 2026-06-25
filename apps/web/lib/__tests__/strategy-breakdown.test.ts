import {
  computeStrategyBreakdown,
  type SignalHistoryRecord,
  type StrategyBreakdownRow,
} from '../signal-history';

describe('computeStrategyBreakdown', () => {
  const baseRecord = (overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord => ({
    id: 'test-id',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 75,
    entryPrice: 50000,
    timestamp: Date.now(),
    tp1: 51000,
    sl: 49500,
    outcomes: { '4h': null, '24h': null },
    ...overrides,
  });

  it('computes basic metrics for a single strategy', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', outcomes: { '4h': { hit: true, pnlPct: 1.5, price: 100 }, '24h': { hit: true, pnlPct: 2.0, price: 100 } } }),
      baseRecord({ strategyId: 'classic', outcomes: { '4h': { hit: false, pnlPct: -1.0, price: 100 }, '24h': { hit: false, pnlPct: -1.5, price: 100 } } }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result).toHaveLength(1);
    const row = result[0];
    expect(row.strategyId).toBe('classic');
    expect(row.totalSignals).toBe(2);
    expect(row.resolvedSignals).toBe(2);
    expect(row.hitRate24h).toBe(50);
    expect(row.avgPnl).toBe(0.25);
  });

  it('computes avgRiskReward from TP/SL/entry', () => {
    const records: SignalHistoryRecord[] = [
      // BUY: risk=500, reward=1000 → RR=2.0
      baseRecord({ strategyId: 'classic', direction: 'BUY', entryPrice: 50000, tp1: 51000, sl: 49500 }),
      // SELL: risk=500, reward=1000 → RR=2.0
      baseRecord({ strategyId: 'classic', direction: 'SELL', entryPrice: 50000, tp1: 49000, sl: 50500 }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].avgRiskReward).toBe(2);
  });

  it('computes sharpeRatio from resolved PnL values', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', outcomes: { '4h': null, '24h': { hit: true, pnlPct: 2.0, price: 100 } } }),
      baseRecord({ strategyId: 'classic', outcomes: { '4h': null, '24h': { hit: true, pnlPct: 4.0, price: 100 } } }),
      baseRecord({ strategyId: 'classic', outcomes: { '4h': null, '24h': { hit: false, pnlPct: -1.0, price: 100 } } }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    const row = result[0];
    expect(row.sharpeRatio).not.toBe(0);
    // mean = (2 + 4 - 1) / 3 = 1.666...
    // variance = ((2-1.666)^2 + (4-1.666)^2 + (-1-1.666)^2) / 3 ≈ 4.222
    // std ≈ 2.054
    // sharpe ≈ 0.81
    expect(row.sharpeRatio).toBeCloseTo(0.81, 1);
  });

  it('returns sharpeRatio 0 when fewer than 2 PnL samples', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', outcomes: { '4h': null, '24h': { hit: true, pnlPct: 2.0, price: 100 } } }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].sharpeRatio).toBe(0);
  });

  it('ignores gate-blocked and simulated records', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', gateBlocked: true }),
      baseRecord({ strategyId: 'classic', isSimulated: true }),
      baseRecord({ strategyId: 'classic' }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].totalSignals).toBe(1);
  });

  it('groups by strategyId and sorts by totalSignals desc', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic' }),
      baseRecord({ strategyId: 'classic' }),
      baseRecord({ strategyId: 'hmm-top3' }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].strategyId).toBe('classic');
    expect(result[0].totalSignals).toBe(2);
    expect(result[1].strategyId).toBe('hmm-top3');
    expect(result[1].totalSignals).toBe(1);
  });

  it('falls back to unknown for missing strategyId', () => {
    const records: SignalHistoryRecord[] = [baseRecord({ strategyId: undefined })];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].strategyId).toBe('unknown');
  });

  it('filters by period cutoff', () => {
    const now = Date.now();
    const old = now - 40 * 86400000; // 40 days ago
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', timestamp: old }),
      baseRecord({ strategyId: 'classic', timestamp: now }),
    ];
    const result30d = computeStrategyBreakdown(records, '30d');
    expect(result30d[0].totalSignals).toBe(1);
    const resultAll = computeStrategyBreakdown(records, 'all');
    expect(resultAll[0].totalSignals).toBe(2);
  });

  it('skips RR calculation when sl is missing or invalid', () => {
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', tp1: 51000, sl: undefined }),
      baseRecord({ strategyId: 'classic', tp1: 51000, sl: 0 }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].avgRiskReward).toBe(0);
  });

  it('skips RR when risk is not positive (BUY with sl above entry)', () => {
    // BUY with SL above entry → negative risk → skip
    const records: SignalHistoryRecord[] = [
      baseRecord({ strategyId: 'classic', direction: 'BUY', entryPrice: 50000, tp1: 51000, sl: 50500 }),
    ];
    const result = computeStrategyBreakdown(records, 'all');
    expect(result[0].avgRiskReward).toBe(0);
  });
});

describe('computeStrategyBreakdown multi-strategy winners', () => {
  it('produces distinct sharpe and winRate leaders', () => {
    const records = [
      {
        id: '1', pair: 'X', timeframe: 'H1', direction: 'BUY' as const, confidence: 70, entryPrice: 100,
        timestamp: Date.now(), tp1: 110, sl: 95,
        strategyId: 'classic',
        outcomes: { '4h': null, '24h': { hit: true, pnlPct: 5.0, price: 100 } },
      },
      {
        id: '2', pair: 'X', timeframe: 'H1', direction: 'BUY' as const, confidence: 70, entryPrice: 100,
        timestamp: Date.now(), tp1: 110, sl: 95,
        strategyId: 'classic',
        outcomes: { '4h': null, '24h': { hit: false, pnlPct: -4.0, price: 100 } },
      },
      {
        id: '3', pair: 'X', timeframe: 'H1', direction: 'BUY' as const, confidence: 70, entryPrice: 100,
        timestamp: Date.now(), tp1: 110, sl: 95,
        strategyId: 'hmm-top3',
        outcomes: { '4h': null, '24h': { hit: true, pnlPct: 2.0, price: 100 } },
      },
      {
        id: '4', pair: 'X', timeframe: 'H1', direction: 'BUY' as const, confidence: 70, entryPrice: 100,
        timestamp: Date.now(), tp1: 110, sl: 95,
        strategyId: 'hmm-top3',
        outcomes: { '4h': null, '24h': { hit: true, pnlPct: 2.1, price: 100 } },
      },
    ];
    const result = computeStrategyBreakdown(records as unknown as SignalHistoryRecord[], 'all');
    const classic = result.find((r) => r.strategyId === 'classic')!;
    const hmm = result.find((r) => r.strategyId === 'hmm-top3')!;

    // classic: 50% win rate, high variance → lower sharpe
    // hmm-top3: 100% win rate, low variance → higher sharpe
    expect(classic.hitRate24h).toBe(50);
    expect(hmm.hitRate24h).toBe(100);
    expect(hmm.sharpeRatio).toBeGreaterThan(classic.sharpeRatio);
  });
});
