jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

export {};

jest.mock('fs', () => {
  const mockFs = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
  return { __esModule: true, default: mockFs, ...mockFs };
});

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

afterAll(() => {
  if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
});

type SignalHistoryModule = typeof import('../signal-history');

function freshModule(): {
  mod: SignalHistoryModule;
  query: jest.Mock;
  queryOne: jest.Mock;
  fs: { existsSync: jest.Mock; readFileSync: jest.Mock; writeFileSync: jest.Mock };
} {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dbPool = require('../db-pool') as { query: jest.Mock; queryOne: jest.Mock };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockedFs = require('fs').default as {
    existsSync: jest.Mock;
    readFileSync: jest.Mock;
    writeFileSync: jest.Mock;
  };
  dbPool.query.mockReset();
  dbPool.queryOne.mockReset();
  mockedFs.existsSync.mockReset();
  mockedFs.readFileSync.mockReset();
  mockedFs.writeFileSync.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../signal-history') as SignalHistoryModule;
  return { mod, query: dbPool.query, queryOne: dbPool.queryOne, fs: mockedFs };
}

const paperSignal = {
  id: 'd1-slow-gate-paper:BTCUSD:ENTER_LONG:1786060800000',
  symbol: 'BTCUSD',
  timeframe: 'D1',
  direction: 'BUY' as const,
  confidence: 72,
  entry: 65_000,
  timestamp: '2026-08-08T00:00:00.000Z',
  stopLoss: 62_400,
  strategyId: 'd1-slow-gate-paper',
  mode: 'swing' as const,
  entryAtr: 900,
  atrMultiplier: 2.8888888889,
  isSimulated: true,
};

describe('simulated signal persistence', () => {
  it('binds is_simulated=TRUE explicitly in the PostgreSQL insert', async () => {
    process.env.DATABASE_URL = 'postgres://test/test';
    const { mod, query } = freshModule();
    query.mockResolvedValue([{ id: paperSignal.id }]);

    await expect(mod.recordSignalsAsync([paperSignal])).resolves.toBe(1);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('is_simulated');
    expect(params).toContain(true);
  });

  it('preserves isSimulated=true in the file fallback', () => {
    delete process.env.DATABASE_URL;
    const { mod, fs } = freshModule();
    fs.existsSync.mockReturnValue(false);

    expect(mod.recordSignals([paperSignal])).toBe(1);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(fs.writeFileSync.mock.calls[0][1] as string) as Array<{
      id: string;
      isSimulated?: boolean;
    }>;
    expect(stored).toEqual([
      expect.objectContaining({ id: paperSignal.id, isSimulated: true }),
    ]);
  });

  it('excludes simulated rows from file-fallback history reads just like PostgreSQL', async () => {
    delete process.env.DATABASE_URL;
    const { mod, fs } = freshModule();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([{
      id: paperSignal.id,
      pair: paperSignal.symbol,
      timeframe: paperSignal.timeframe,
      direction: paperSignal.direction,
      confidence: paperSignal.confidence,
      entryPrice: paperSignal.entry,
      timestamp: Date.parse(paperSignal.timestamp),
      isSimulated: true,
      outcomes: { '4h': null, '24h': null },
    }]));

    await expect(mod.readHistoryAsync()).resolves.toEqual([]);
  });

  it('keeps simulated file rows out of dedup, detail, and direction lookups', async () => {
    delete process.env.DATABASE_URL;
    const { mod, fs } = freshModule();
    const now = Date.now();
    const simulated = {
      id: paperSignal.id,
      pair: 'BTCUSD',
      timeframe: 'D1',
      direction: 'BUY' as const,
      confidence: 72,
      entryPrice: 65_000,
      timestamp: now - 100,
      isSimulated: true,
      outcomes: { '4h': null, '24h': null },
    };
    const live = {
      ...simulated,
      id: 'live-btc-sell',
      direction: 'SELL' as const,
      timestamp: now - 200,
      isSimulated: false,
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([simulated, live]));

    expect(mod.getRecentRecordForSymbol('BTCUSD', 'BUY', 60_000)).toBeUndefined();
    await expect(mod.getRecordByIdAsync(simulated.id)).resolves.toBeUndefined();
    await expect(mod.getPreviousDirectionAsync('BTCUSD', 'D1', now, 60_000))
      .resolves.toEqual({ direction: 'SELL', ageMs: 200 });
  });

  it('puts the simulated-row predicate on PostgreSQL dedup, detail, and direction lookups', async () => {
    process.env.DATABASE_URL = 'postgres://test/test';
    const { mod, queryOne } = freshModule();
    queryOne.mockResolvedValue(null);
    const now = Date.now();

    await mod.getRecentRecordForSymbolAsync('BTCUSD', 'BUY', 60_000);
    await mod.getRecordByIdAsync(paperSignal.id);
    await mod.getPreviousDirectionAsync('BTCUSD', 'D1', now, 60_000);

    expect(queryOne).toHaveBeenCalledTimes(3);
    for (const [sql] of queryOne.mock.calls as Array<[string, unknown[]]>) {
      expect(sql).toContain('is_simulated = FALSE');
    }
  });
});
