jest.mock('../signal-history', () => {
  const actual = jest.requireActual('../signal-history');
  return { ...actual, readHistoryAsync: jest.fn() };
});

import { getEmailDigestData } from '../email-digest';
import { readHistoryAsync, type SignalHistoryRecord } from '../signal-history';

const mockedHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;

function record(
  id: string,
  pair: string,
  outcome: SignalHistoryRecord['outcomes']['24h'],
  overrides: Partial<SignalHistoryRecord> = {},
): SignalHistoryRecord {
  const timestamp = Date.now() - 60_000;
  const countedOutcome = outcome
    ? {
        ...outcome,
        resolvedAt: outcome.resolvedAt ?? new Date(timestamp + 30_000).toISOString(),
        source: outcome.source ?? 'binance',
      }
    : null;
  return {
    id,
    pair,
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    timestamp,
    isSimulated: false,
    gateBlocked: false,
    outcomes: { '4h': null, '24h': countedOutcome },
    ...overrides,
  };
}

describe('getEmailDigestData canonical top signals', () => {
  beforeEach(() => mockedHistory.mockReset());

  it('shows only counted outcomes while retaining nonzero drift closes', async () => {
    mockedHistory.mockResolvedValue([
      record('tp-win', 'BTCUSD', { price: 102, pnlPct: 2, hit: true, target: 'TP1' }, { confidence: 70 }),
      record('drift-loss', 'ETHUSD', { price: 99.5, pnlPct: -0.5, hit: false, target: 'expired' }, { confidence: 75 }),
      record('force-expired', 'XAUUSD', { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' }, { confidence: 99 }),
      record('simulated', 'SOLUSD', { price: 110, pnlPct: 10, hit: true }, { confidence: 98, isSimulated: true }),
      record('gate-blocked', 'DOGEUSD', { price: 110, pnlPct: 10, hit: true }, { confidence: 97, gateBlocked: true }),
    ]);

    const digest = await getEmailDigestData({ period: '7d', topN: 5 });

    expect(digest.topSignals.map((r) => r.pair)).toEqual(['ETHUSD', 'BTCUSD']);
    expect(digest.accuracy.totalResolved).toBe(2);
    expect(digest.accuracy.hitRate24h).toBe(50);
  });
});
