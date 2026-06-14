jest.mock('../signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

import { getResolvedSlice, parseScope } from '../signal-slice';
import { getCachedHistory } from '../signal-history-cache';
import type { SignalHistoryRecord } from '../signal-history';

const mockedHistory = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;

function mkRecord(id: string, broadcastBlocked: boolean | undefined): SignalHistoryRecord {
  return {
    id,
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 50000,
    timestamp: Date.now() - 60_000,
    tp1: 51000,
    sl: 49500,
    isSimulated: false,
    gateBlocked: false,
    broadcastBlocked,
    outcomes: {
      '4h': null,
      '24h': { price: 51000, pnlPct: 2.0, hit: true, target: 'TP1' },
    },
  };
}

beforeEach(() => {
  mockedHistory.mockReset();
});

describe('parseScope', () => {
  it('accepts broadcast and defaults unknown values to pro', () => {
    expect(parseScope('broadcast')).toBe('broadcast');
    expect(parseScope('free')).toBe('free');
    expect(parseScope('pro')).toBe('pro');
    expect(parseScope('nonsense')).toBe('pro');
    expect(parseScope(null)).toBe('pro');
  });
});

describe('getResolvedSlice scope=broadcast', () => {
  it('includes ONLY rows whose decision ran and approved (strict === false)', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('approved', false),
      mkRecord('blocked', true),
      mkRecord('not-recorded', undefined),
    ]);

    const slice = await getResolvedSlice({ scope: 'broadcast' });

    expect(slice.scopedRecords.map((r) => r.id)).toEqual(['approved']);
    expect(slice.resolved.map((r) => r.id)).toEqual(['approved']);
  });

  it('scope=pro still returns the full firehose including undecided rows', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('approved', false),
      mkRecord('blocked', true),
      mkRecord('not-recorded', undefined),
    ]);

    const slice = await getResolvedSlice({ scope: 'pro' });

    expect(slice.scopedRecords).toHaveLength(3);
  });
});
