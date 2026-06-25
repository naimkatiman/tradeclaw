/**
 * Regression tests for the pending-record resolver queue.
 *
 * The outcome tracker must only surface rows that can actually be resolved:
 * unresolved rows with tp1/sl present. Legacy or malformed rows without the
 * trade levels would otherwise clog the cron queue forever.
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

  return {
    __esModule: true,
    default: mockFs,
    ...mockFs,
  };
});

const ORIG_ENV = { ...process.env };

import fs from 'fs';
import { query } from '../db-pool';
import { getPendingRecords, getPendingRecordsAsync } from '../signal-history';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedFs = fs as unknown as {
  existsSync: jest.Mock;
  mkdirSync: jest.Mock;
  readFileSync: jest.Mock;
  writeFileSync: jest.Mock;
};

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  mockedQuery.mockReset();
  mockedFs.existsSync.mockReset();
  mockedFs.mkdirSync.mockReset();
  mockedFs.readFileSync.mockReset();
  mockedFs.writeFileSync.mockReset();
});

afterAll(() => {
  process.env = ORIG_ENV;
});

describe('getPendingRecordsAsync', () => {
  it('queries only unresolved rows that still have tp1 and sl', async () => {
    process.env.DATABASE_URL = 'postgres://stub';
    mockedQuery.mockResolvedValueOnce([]);

    await getPendingRecordsAsync();

    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockedQuery.mock.calls[0];
    expect(sql).toMatch(/outcome_4h IS NULL OR outcome_24h IS NULL/);
    expect(sql).toMatch(/tp1 IS NOT NULL/);
    expect(sql).toMatch(/sl IS NOT NULL/);
    expect(sql).toMatch(/created_at > NOW\(\) - INTERVAL '30 days'/);
  });
});

describe('getPendingRecords', () => {
  it('filters out unresolved rows that are missing tp1 or sl in the file fallback', () => {
    delete process.env.DATABASE_URL;

    const now = Date.now();
    const rows = [
      {
        id: 'old-pending',
        pair: 'AUDUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 68,
        entryPrice: 0.66,
        timestamp: now - (31 * 24 * 60 * 60 * 1000),
        tp1: 0.67,
        sl: 0.65,
        isSimulated: false,
        outcomes: { '4h': null, '24h': null },
      },
      {
        id: 'ok-1',
        pair: 'XAUUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 80,
        entryPrice: 2400,
        timestamp: now - 2,
        tp1: 2410,
        sl: 2390,
        isSimulated: false,
        outcomes: { '4h': null, '24h': null },
      },
      {
        id: 'ok-2',
        pair: 'XAGUSD',
        timeframe: 'H1',
        direction: 'SELL',
        confidence: 78,
        entryPrice: 28,
        timestamp: now - 1,
        tp1: 27,
        sl: 29,
        isSimulated: false,
        outcomes: { '4h': null, '24h': null },
      },
      {
        id: 'missing-tp',
        pair: 'EURUSD',
        timeframe: 'H1',
        direction: 'SELL',
        confidence: 72,
        entryPrice: 1.08,
        timestamp: now,
        sl: 1.09,
        isSimulated: false,
        outcomes: { '4h': null, '24h': null },
      },
      {
        id: 'missing-sl',
        pair: 'USDJPY',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 75,
        entryPrice: 151,
        timestamp: now + 1,
        tp1: 152,
        isSimulated: false,
        outcomes: { '4h': null, '24h': null },
      },
      {
        id: 'resolved',
        pair: 'GBPUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 76,
        entryPrice: 1.26,
        timestamp: now - 3,
        tp1: 1.27,
        sl: 1.25,
        isSimulated: false,
        outcomes: { '4h': { price: 1.27, pnlPct: 0.8, hit: true }, '24h': { price: 1.28, pnlPct: 1.6, hit: true } },
      },
    ];

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(rows));

    const result = getPendingRecords();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('ok-2');
    expect(result[1].id).toBe('ok-1');
    expect(result[0].tp1).toBe(27);
    expect(result[0].sl).toBe(29);
    expect(result[1].tp1).toBe(2410);
    expect(result[1].sl).toBe(2390);
  });
});
