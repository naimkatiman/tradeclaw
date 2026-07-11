import { computeWrappedStats, WRAPPED_MIN } from '../wrapped-stats';
import type { SignalHistoryRecord } from '../signal-history';

function mk(
  id: string,
  opts: {
    pair?: string;
    hit?: boolean;
    direction?: 'BUY' | 'SELL';
    confidence?: number;
    timeframe?: string;
    tsMs?: number;
    pnlPct?: number;
    target?: 'TP1' | 'SL' | 'expired';
    gateBlocked?: boolean;
    isSimulated?: boolean;
  },
): SignalHistoryRecord {
  return {
    id,
    pair: opts.pair ?? 'BTCUSD',
    timeframe: opts.timeframe ?? 'H1',
    direction: opts.direction ?? 'BUY',
    confidence: opts.confidence ?? 70,
    entryPrice: 100,
    timestamp: opts.tsMs ?? Date.UTC(2026, 0, 1, 12),
    isSimulated: opts.isSimulated ?? false,
    gateBlocked: opts.gateBlocked ?? false,
    outcomes: {
      '4h': null,
      '24h': {
        price: 101,
        pnlPct: opts.pnlPct ?? (opts.hit ? 1 : -1),
        hit: opts.hit ?? false,
        target: opts.target ?? (opts.hit ? 'TP1' : 'SL'),
      },
    },
  };
}

/** N records for one pair in a given month, hit pattern from `hits`. */
function series(
  pair: string,
  month: number,
  hits: boolean[],
  opts: { direction?: 'BUY' | 'SELL'; timeframe?: string; hour?: number } = {},
): SignalHistoryRecord[] {
  return hits.map((h, i) =>
    mk(`${pair}-${month}-${i}`, {
      pair,
      hit: h,
      direction: opts.direction,
      timeframe: opts.timeframe,
      tsMs: Date.UTC(2026, month, 1 + i, opts.hour ?? 12),
    }),
  );
}

describe('computeWrappedStats — real platform year-in-review (replaces seeded LCG)', () => {
  it('computes real aggregates over a full year of resolved signals', () => {
    const recs = [
      // BTC: 6 in January at hour 9, 5 wins / 1 loss
      ...series('BTCUSD', 0, [true, true, true, false, true, true], { hour: 9 }),
      // XAU: 12 in January at hour 10, all wins
      ...series('XAUUSD', 0, [true, true, true, true, true, true, true, true, true, true, true, true], { hour: 10 }),
      // ETH: 3 in June at hour 14, all losses, SELL
      ...series('ETHUSD', 5, [false, false, false], { hour: 14, direction: 'SELL' }),
    ];
    const w = computeWrappedStats(recs, 2026);

    expect(w.hasEnoughData).toBe(true);
    expect(w.totalSignals).toBe(21);
    expect(w.totalWins).toBe(17);
    expect(w.totalLosses).toBe(4);
    expect(w.overallWinRate).toBeCloseTo(17 / 21, 3);
    expect(w.uniquePairs).toBe(3);

    // Best / worst pair by win rate (both clear PAIR_MIN).
    expect(w.bestPair).toBe('XAUUSD');
    expect(w.bestPairWinRate).toBeCloseTo(1, 3);
    expect(w.bestPairCount).toBe(12);
    expect(w.worstPair).toBe('ETHUSD');
    expect(w.worstPairWinRate).toBeCloseTo(0, 3);

    // Direction split.
    expect(w.totalBuy).toBe(18); // BTC + XAU
    expect(w.totalSell).toBe(3); // ETH

    // Monthly activity.
    expect(w.monthlyActivity[0]).toBe(18); // Jan: BTC6 + XAU12
    expect(w.monthlyActivity[5]).toBe(3); // Jun: ETH3
    expect(w.accuracyTrend[5]).toBe(0); // all ETH losses
    expect(w.accuracyTrend[0]).toBeCloseTo(17 / 18, 3);

    // Busiest hour = 10 (XAU's 12 beat hour 9's 6 and hour 14's 3).
    expect(w.busiestHour).toBe(10);

    // Longest consecutive winning streak, chronological across all pairs.
    // Sorted by ts: only BTC d4 (hour 9) is a loss; everything after is a win.
    expect(w.longestStreak).toBe(11);
  });

  it('excludes simulated, gate-blocked, and auto-expired rows and gates below the threshold', () => {
    const recs = [
      mk('w', { hit: true }),
      mk('l', { hit: false }),
      mk('exp', { hit: false, pnlPct: 0, target: 'expired' }),
      mk('blk', { hit: true, gateBlocked: true }),
      mk('sim', { hit: true, isSimulated: true }),
    ];
    const w = computeWrappedStats(recs, 2026);
    expect(w.totalSignals).toBe(2); // only w + l count
    expect(w.hasEnoughData).toBe(false);
  });

  it('filters out signals from other years', () => {
    const inYear = series('BTCUSD', 0, Array.from({ length: 20 }, () => true), { hour: 9 });
    const recs = [
      ...inYear,
      mk('lastYear', { hit: true, tsMs: Date.UTC(2025, 11, 31, 12) }),
      mk('nextYear', { hit: true, tsMs: Date.UTC(2027, 0, 1, 12) }),
    ];
    const w = computeWrappedStats(recs, 2026);
    expect(w.totalSignals).toBe(20);
  });

  it('returns an honest empty state with no data', () => {
    const w = computeWrappedStats([], 2026);
    expect(w.hasEnoughData).toBe(false);
    expect(w.totalSignals).toBe(0);
    expect(w.bestPair).toBe('—');
    expect(w.monthlyActivity).toHaveLength(12);
    expect(w.accuracyTrend).toHaveLength(12);
  });

  it('exposes the threshold constant', () => {
    expect(WRAPPED_MIN).toBe(20);
  });
});
