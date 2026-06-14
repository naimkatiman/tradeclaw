jest.mock('../signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

import { computeTrackRecordStats } from '../track-record-stats';
import { isCountedResolved, type SignalHistoryRecord } from '../signal-history';
import { getCachedHistory } from '../signal-history-cache';

const mockedHistory = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;

function mkRecord(
  id: string,
  opts: {
    confidence?: number;
    hit?: boolean;
    pnlPct?: number;
    target?: 'TP1' | 'SL' | 'expired';
    gateBlocked?: boolean;
    isSimulated?: boolean;
    ageDays?: number;
  },
): SignalHistoryRecord {
  const ageMs = (opts.ageDays ?? 1) * 86_400_000;
  return {
    id,
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: opts.confidence ?? 80,
    entryPrice: 50000,
    timestamp: Date.now() - ageMs,
    tp1: 51000,
    sl: 49500,
    isSimulated: opts.isSimulated ?? false,
    gateBlocked: opts.gateBlocked ?? false,
    outcomes: {
      '4h': null,
      '24h': {
        price: 51000,
        pnlPct: opts.pnlPct ?? (opts.hit ? 2.0 : -1.0),
        hit: opts.hit ?? false,
        target: opts.target ?? (opts.hit ? 'TP1' : 'SL'),
      },
    },
  };
}

beforeEach(() => {
  mockedHistory.mockReset();
});

describe('computeTrackRecordStats — OG/embed honesty parity', () => {
  it('excludes auto-expired rows from the resolved count, matching isCountedResolved', async () => {
    const rows = [
      mkRecord('win', { hit: true }),
      mkRecord('loss', { hit: false }),
      // Auto-expire placeholder: pnl 0, no hit, target 'expired'. The page body
      // (isCountedResolved) drops it; the OG/embed must drop it too.
      mkRecord('expired', { hit: false, pnlPct: 0, target: 'expired' }),
    ];
    mockedHistory.mockResolvedValue(rows);

    const stats = await computeTrackRecordStats('all');

    const expectedResolved = rows.filter(isCountedResolved);
    expect(stats.total).toBe(expectedResolved.length); // 2, NOT 3
    expect(stats.total).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.winRate).toBe(50); // 1/2, not 1/3
  });

  it('excludes gate-blocked and simulated rows like the page body', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('win', { hit: true }),
      mkRecord('blocked', { hit: true, gateBlocked: true }),
      mkRecord('sim', { hit: true, isSimulated: true }),
    ]);

    const stats = await computeTrackRecordStats('all');

    expect(stats.total).toBe(1);
    expect(stats.wins).toBe(1);
  });

  it('respects the premium / standard band split on resolved rows', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('premium-win', { hit: true, confidence: 90 }),
      mkRecord('standard-loss', { hit: false, confidence: 50 }),
    ]);

    const premium = await computeTrackRecordStats('premium');
    const standard = await computeTrackRecordStats('standard');

    expect(premium.total).toBe(1);
    expect(premium.wins).toBe(1);
    expect(standard.total).toBe(1);
    expect(standard.wins).toBe(0);
  });
});
