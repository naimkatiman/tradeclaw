/**
 * DARK-strategy rule tests (plan Open decision #4): tv-* partner content is
 * ingested but never publicly rendered. The rule is enforced at three choke
 * points — getResolvedSlice, readHistoryAsync, getRecordByIdAsync — plus a
 * shared SQL predicate for the raw broadcast/landing queries. A regression
 * in any of them re-exposes premium partner signals.
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
  getPool: jest.fn(),
}));

jest.mock('fs', () => {
  const mockFs = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
  return { __esModule: true, default: mockFs, ...mockFs };
});

jest.mock('../signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

const ORIG_ENV = { ...process.env };

import fs from 'fs';
import { query, queryOne } from '../db-pool';
import {
  readHistoryAsync,
  getRecordByIdAsync,
  isDarkStrategy,
  DARK_STRATEGY_PREFIXES,
  NOT_DARK_STRATEGY_SQL,
  type SignalHistoryRecord,
} from '../signal-history';
import { getResolvedSlice } from '../signal-slice';
import { getCachedHistory } from '../signal-history-cache';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockedHistoryCache = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;
const mockedFs = fs as unknown as {
  existsSync: jest.Mock;
  readFileSync: jest.Mock;
};

function record(id: string, strategyId: string | undefined): SignalHistoryRecord {
  return {
    id,
    pair: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 90,
    entryPrice: 2400,
    timestamp: Date.now() - 60_000,
    tp1: 2410,
    sl: 2395,
    isSimulated: false,
    gateBlocked: false,
    strategyId,
    outcomes: {
      '4h': null,
      '24h': { price: 2410, pnlPct: 2, hit: true, target: 'TP1' },
    },
  };
}

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = ORIG_ENV;
});

describe('isDarkStrategy', () => {
  it('flags every configured dark prefix and nothing else', () => {
    expect(DARK_STRATEGY_PREFIXES).toContain('tv-');
    expect(isDarkStrategy('tv-zaky-classic')).toBe(true);
    expect(isDarkStrategy('tv-hafiz-synergy')).toBe(true);
    expect(isDarkStrategy('classic')).toBe(false);
    expect(isDarkStrategy('hmm-top3')).toBe(false);
    expect(isDarkStrategy(null)).toBe(false);
    expect(isDarkStrategy(undefined)).toBe(false);
  });
});

describe('readHistoryAsync dark exclusion', () => {
  it('DB path applies the shared NOT-dark SQL predicate', async () => {
    process.env.DATABASE_URL = 'postgres://stub';
    mockedQuery.mockResolvedValueOnce([]);

    await readHistoryAsync();

    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockedQuery.mock.calls[0];
    expect(sql).toContain(NOT_DARK_STRATEGY_SQL);
    expect(sql).toMatch(/strategy_id IS NULL OR strategy_id NOT LIKE 'tv-%'/);
  });

  it('file fallback drops tv-* rows and keeps algo rows', async () => {
    delete process.env.DATABASE_URL;
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify([
        record('algo-1', 'classic'),
        record('tv-leak-1', 'tv-zaky-classic'),
        record('no-strategy', undefined),
      ]),
    );

    const rows = await readHistoryAsync();

    expect(rows.map((r) => r.id)).toEqual(['algo-1', 'no-strategy']);
  });
});

describe('getRecordByIdAsync dark exclusion', () => {
  it('DB path applies the shared NOT-dark SQL predicate (tv ids resolve to nothing → 404)', async () => {
    process.env.DATABASE_URL = 'postgres://stub';
    mockedQueryOne.mockResolvedValueOnce(null);

    const result = await getRecordByIdAsync('tv-source-id-1');

    expect(result).toBeUndefined();
    const [sql] = mockedQueryOne.mock.calls[0];
    expect(sql).toContain(NOT_DARK_STRATEGY_SQL);
  });

  it('file fallback returns undefined for a tv-* row but finds algo rows', async () => {
    delete process.env.DATABASE_URL;
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify([
        record('algo-1', 'classic'),
        record('tv-leak-1', 'tv-impulse-hunter'),
      ]),
    );

    expect(await getRecordByIdAsync('tv-leak-1')).toBeUndefined();
    expect((await getRecordByIdAsync('algo-1'))?.id).toBe('algo-1');
  });
});

describe('getResolvedSlice dark exclusion', () => {
  it('excludes tv-* rows from every scope', async () => {
    mockedHistoryCache.mockResolvedValue([
      record('algo-1', 'classic'),
      record('tv-leak-1', 'tv-zaky-classic'),
      record('no-strategy', undefined),
    ]);

    const proSlice = await getResolvedSlice({ scope: 'pro' });
    expect(proSlice.scopedRecords.map((r) => r.id)).toEqual(['algo-1', 'no-strategy']);

    const broadcastSlice = await getResolvedSlice({ scope: 'broadcast' });
    expect(broadcastSlice.scopedRecords.some((r) => r.id === 'tv-leak-1')).toBe(false);
  });
});
