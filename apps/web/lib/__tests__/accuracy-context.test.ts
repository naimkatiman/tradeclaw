import { computeAccuracyContext, type AccuracyContext } from '../accuracy-context';

// Minimal signal_history row shape for testing
function row(pair: string, tf: string, hit: boolean, ts: number) {
  return {
    pair,
    timeframe: tf,
    created_at: new Date(ts).toISOString(),
    outcomes: { '24h': { hit, pnlPct: hit ? 1.2 : -0.8 } },
  };
}

describe('computeAccuracyContext', () => {
  it('returns correct stats for a symbol with history', () => {
    const now = Date.now();
    const rows = [
      row('BTCUSD', 'H1', true, now - 3600_000),
      row('BTCUSD', 'H1', true, now - 7200_000),
      row('BTCUSD', 'H1', false, now - 10800_000),
    ];
    const ctx = computeAccuracyContext(rows, 'BTCUSD', 'H1');
    expect(ctx).not.toBeNull();
    expect(ctx!.winRate).toBeCloseTo(66.67, 0);
    expect(ctx!.sampleSize).toBe(3);
    expect(ctx!.windowLabel).toBe('24h');
    expect(ctx!.oldestSampleTs).toBe(rows[2].created_at);
    expect(ctx!.newestSampleTs).toBe(rows[0].created_at);
  });

  it('returns null when no matching rows exist', () => {
    const ctx = computeAccuracyContext([], 'XAUUSD', 'H4');
    expect(ctx).toBeNull();
  });

  it('excludes auto-expire sentinel outcomes', () => {
    const now = Date.now();
    const rows = [
      row('BTCUSD', 'H1', true, now - 1000),
      { pair: 'BTCUSD', timeframe: 'H1', created_at: new Date(now - 2000).toISOString(), outcomes: { '24h': { hit: false, pnlPct: 0 } } },
    ];
    const ctx = computeAccuracyContext(rows as any, 'BTCUSD', 'H1');
    expect(ctx!.sampleSize).toBe(1);
    expect(ctx!.winRate).toBe(100);
  });

  it('ignores rows with null 24h outcome', () => {
    const now = Date.now();
    const rows = [
      row('ETHUSD', 'M15', true, now - 1000),
      { pair: 'ETHUSD', timeframe: 'M15', created_at: new Date(now).toISOString(), outcomes: { '24h': null } },
    ];
    const ctx = computeAccuracyContext(rows as any, 'ETHUSD', 'M15');
    expect(ctx!.sampleSize).toBe(1);
    expect(ctx!.winRate).toBe(100);
  });
});
