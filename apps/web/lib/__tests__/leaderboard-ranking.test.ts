import { recomputeOverall, type AssetStats } from '../signal-history';

function asset(overrides: Partial<AssetStats> = {}): AssetStats {
  return {
    pair: 'BTCUSD',
    totalSignals: 10,
    resolved4h: 4,
    resolved24h: 4,
    hits4h: 2,
    hits24h: 2,
    hitRate4h: 50,
    hitRate24h: 50,
    avgConfidence: 75,
    avgPnl: 0,
    totalPnl: 0,
    bestStreak: 1,
    worstStreak: -1,
    recentHits: [true, false],
    ...overrides,
  };
}

function unresolvedAsset(pair: string, totalSignals: number = 10): AssetStats {
  return asset({
    pair,
    totalSignals,
    resolved4h: 0,
    resolved24h: 0,
    hits4h: 0,
    hits24h: 0,
    hitRate4h: 0,
    hitRate24h: 0,
    avgPnl: 0,
    totalPnl: 0,
    bestStreak: 0,
    worstStreak: 0,
    recentHits: [],
  });
}

describe('leaderboard performer evidence boundary', () => {
  it('excludes zero-evidence assets from best and worst performer selection', () => {
    const overall = recomputeOverall([
      asset({ pair: 'BTCUSD', hitRate24h: 75, hits24h: 3 }),
      asset({ pair: 'ETHUSD', hitRate24h: 25, hits24h: 1, totalPnl: -2 }),
      unresolvedAsset('SOLUSD'),
    ]);

    expect(overall.topPerformer).toBe('BTCUSD');
    expect(overall.worstPerformer).toBe('ETHUSD');
  });

  it('returns unavailable performer markers when every asset has zero evidence', () => {
    const overall = recomputeOverall([
      unresolvedAsset('SOLUSD'),
      unresolvedAsset('SPYUSD'),
    ]);

    expect(overall.resolvedSignals).toBe(0);
    expect(overall.topPerformer).toBe('\u2014');
    expect(overall.worstPerformer).toBe('\u2014');
  });

  it('keeps zero-evidence signal totals while ranking only mixed evidence-backed assets', () => {
    const overall = recomputeOverall([
      asset({ pair: 'BTCUSD', totalSignals: 8, resolved24h: 2, hits24h: 1, hitRate24h: 50 }),
      asset({ pair: 'ETHUSD', totalSignals: 7, resolved24h: 5, hits24h: 4, hitRate24h: 80 }),
      unresolvedAsset('SOLUSD', 20),
    ]);

    expect(overall.totalSignals).toBe(35);
    expect(overall.resolvedSignals).toBe(7);
    expect(overall.overallHitRate24h).toBe(71.4);
    expect(overall.topPerformer).toBe('ETHUSD');
    expect(overall.worstPerformer).toBe('BTCUSD');
  });
});
