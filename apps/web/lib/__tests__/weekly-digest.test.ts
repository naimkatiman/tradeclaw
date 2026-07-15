jest.mock('../signal-history', () => {
  const actual = jest.requireActual('../signal-history');
  return { ...actual, readHistoryAsync: jest.fn() };
});

import { getWeeklyDigest } from '../weekly-digest';
import { readHistoryAsync, type SignalHistoryRecord } from '../signal-history';

const mockedHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;
const MONDAY = Date.UTC(2026, 6, 13);

function record(
  id: string,
  dayOffset: number,
  outcome: SignalHistoryRecord['outcomes']['24h'],
  overrides: Partial<SignalHistoryRecord> = {},
): SignalHistoryRecord {
  return {
    id,
    pair: id.toUpperCase(),
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 70 + dayOffset,
    entryPrice: 100,
    timestamp: MONDAY + dayOffset * 86_400_000 + 43_200_000,
    isSimulated: false,
    gateBlocked: false,
    outcomes: { '4h': null, '24h': outcome },
    ...overrides,
  };
}

describe('getWeeklyDigest canonical denominator', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
  });
  afterAll(() => jest.useRealTimers());
  beforeEach(() => mockedHistory.mockReset());

  it('counts real drift closes and excludes placeholders, simulated, and gate-blocked rows', async () => {
    mockedHistory.mockResolvedValue([
      record('win-a', 0, { price: 101, pnlPct: 1, hit: true, target: 'TP1', source: 'binance' }),
      record('win-b', 1, { price: 101, pnlPct: 1, hit: true, target: 'expired', source: 'binance' }),
      record('win-c', 2, { price: 101, pnlPct: 1, hit: true, target: 'TP1', source: 'binance' }),
      record('loss-a', 2, { price: 99, pnlPct: -1, hit: false, target: 'SL', source: 'binance' }),
      record('loss-b', 2, { price: 99.5, pnlPct: -0.5, hit: false, target: 'expired', source: 'binance' }),
      record('force-expired', 2, { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' }),
      record('simulated', 2, { price: 101, pnlPct: 1, hit: true, source: 'binance' }, { isSimulated: true }),
      record('gate-blocked', 2, { price: 101, pnlPct: 1, hit: true, source: 'binance' }, { gateBlocked: true }),
    ]);

    const digest = await getWeeklyDigest();

    expect(digest.stats.totalSignals).toBe(5);
    expect(digest.stats.winRate).toBe(60);
    expect(digest.topSignals).toHaveLength(5);
    expect(digest.topSignals.map((r) => r.id)).not.toEqual(expect.arrayContaining([
      'force-expired', 'simulated', 'gate-blocked',
    ]));
  });
});
