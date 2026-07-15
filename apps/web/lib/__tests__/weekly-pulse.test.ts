import { computeWeeklyPulse, WEEKLY_PULSE_MIN } from '../weekly-pulse';
import type { SignalHistoryRecord } from '../signal-history';

// Fixed "now": 2026-06-17 is a Wednesday. Monday of that week = 2026-06-15.
const NOW = new Date('2026-06-17T12:00:00.000Z');
const MONDAY = Date.UTC(2026, 5, 15);
const DAY = 86_400_000;

function mk(
  id: string,
  opts: {
    pair?: string;
    hit?: boolean;
    pnlPct?: number;
    target?: 'TP1' | 'SL' | 'expired';
    gateBlocked?: boolean;
    isSimulated?: boolean;
    confidence?: number;
    source?: string;
    /** Whole-day offset from Monday 00:00 UTC of the test week. */
    dayOffset?: number;
  },
): SignalHistoryRecord {
  // Noon of the target day so it sits unambiguously inside the UTC week.
  const timestamp = MONDAY + (opts.dayOffset ?? 0) * DAY + DAY / 2;
  return {
    id,
    pair: opts.pair ?? 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: opts.confidence ?? 80,
    entryPrice: 50000,
    timestamp,
    isSimulated: opts.isSimulated ?? false,
    gateBlocked: opts.gateBlocked ?? false,
    outcomes: {
      '4h': null,
      '24h': {
        price: 51000,
        pnlPct: opts.pnlPct ?? (opts.hit ? 2 : -1),
        hit: opts.hit ?? false,
        target: opts.target ?? (opts.hit ? 'TP1' : 'SL'),
        resolvedAt: new Date(timestamp + DAY).toISOString(),
        source: opts.source ?? 'binance',
      },
    },
  };
}

describe('computeWeeklyPulse — real-data weekly pulse (replaces mulberry32 PRNG)', () => {
  it('aggregates real resolved signals and flags enough data at the threshold', () => {
    const recs = [
      mk('1', { hit: true, dayOffset: 0 }),
      mk('2', { hit: true, dayOffset: 1 }),
      mk('3', { hit: false, dayOffset: 2 }),
      mk('4', { hit: true, dayOffset: 3 }),
      mk('5', { hit: false, dayOffset: 4 }),
    ];
    const p = computeWeeklyPulse(recs, NOW);
    expect(p.totalSignals).toBe(5);
    expect(p.hasEnoughData).toBe(true);
    expect(p.winRate).toBe(60); // 3 of 5
    expect(p.dailyBreakdown).toEqual([1, 1, 1, 1, 1, 0, 0]);
    expect(p.weekOf).toBe('2026-06-15');
  });

  it('excludes simulated, gate-blocked, and auto-expired rows (canonical denominator)', () => {
    const recs = [
      mk('w', { hit: true, dayOffset: 0 }),
      mk('l', { hit: false, dayOffset: 0 }),
      mk('exp', { hit: false, pnlPct: 0, target: 'expired', source: 'force-expired', dayOffset: 0 }),
      mk('blk', { hit: true, gateBlocked: true, dayOffset: 0 }),
      mk('sim', { hit: true, isSimulated: true, dayOffset: 0 }),
    ];
    const p = computeWeeklyPulse(recs, NOW);
    expect(p.totalSignals).toBe(2);
    expect(p.winRate).toBe(50);
  });

  it('ignores signals outside the current week', () => {
    const recs = [
      mk('in', { hit: true, dayOffset: 0 }),
      mk('lastWeek', { hit: true, dayOffset: -1 }),
      mk('nextWeek', { hit: true, dayOffset: 7 }),
    ];
    const p = computeWeeklyPulse(recs, NOW);
    expect(p.totalSignals).toBe(1);
  });

  it('picks the top asset by hit rate, breaking ties on sample size', () => {
    const recs = [
      mk('b1', { pair: 'BTCUSD', hit: true, dayOffset: 0 }),
      mk('b2', { pair: 'BTCUSD', hit: true, dayOffset: 0 }),
      mk('e1', { pair: 'ETHUSD', hit: false, dayOffset: 0 }),
      mk('e2', { pair: 'ETHUSD', hit: false, dayOffset: 0 }),
      mk('x1', { pair: 'XAUUSD', hit: true, dayOffset: 0 }),
    ];
    const p = computeWeeklyPulse(recs, NOW);
    expect(p.topAsset).toBe('BTCUSD'); // 2/2 beats XAU 1/1 on volume
    expect(p.topAccuracy).toBe(100);
  });

  it('returns an honest empty state below the threshold without dividing by zero', () => {
    const recs = [mk('1', { hit: true, dayOffset: 0 }), mk('2', { hit: false, dayOffset: 0 })];
    const p = computeWeeklyPulse(recs, NOW);
    expect(p.totalSignals).toBe(2);
    expect(p.hasEnoughData).toBe(false);
  });

  it('zeroes cleanly with no data', () => {
    const p = computeWeeklyPulse([], NOW);
    expect(p.totalSignals).toBe(0);
    expect(p.winRate).toBe(0);
    expect(p.topAsset).toBe('—');
    expect(p.dailyBreakdown).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(p.hasEnoughData).toBe(false);
  });

  it('keeps the threshold aligned with the weekly-digest <5 contract', () => {
    expect(WEEKLY_PULSE_MIN).toBe(5);
  });
});
