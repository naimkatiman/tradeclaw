jest.mock('../../../../lib/signal-slice', () => {
  const actual = jest.requireActual('../../../../lib/signal-slice');
  return { ...actual, getResolvedSlice: jest.fn() };
});

import { isCountedResolved, type SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice } from '../../../../lib/signal-slice';
import { buildOpenApiSpec } from '../../../../lib/openapi';
import { GET } from '../route';

const mockedGetResolvedSlice = getResolvedSlice as jest.MockedFunction<typeof getResolvedSlice>;

function record(
  id: string,
  outcome: SignalHistoryRecord['outcomes']['24h'],
  overrides: Partial<SignalHistoryRecord> = {},
): SignalHistoryRecord {
  return {
    id,
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 75,
    entryPrice: 100,
    timestamp: 1_700_000_000_000,
    isSimulated: false,
    gateBlocked: false,
    outcomes: { '4h': outcome, '24h': outcome },
    ...overrides,
  };
}

function setHistory(rows: SignalHistoryRecord[]) {
  mockedGetResolvedSlice.mockResolvedValue({
    sourceRecordsLoaded: rows.length,
    sourceReadLimit: 10_000,
    sourceWindowPotentiallyTruncated: false,
    scopedRecords: rows,
    periodFiltered: rows,
    resolved: rows.filter(isCountedResolved),
    cutoffTs: null,
    earliestTimestamp: rows.length > 0 ? rows[rows.length - 1].timestamp : null,
  });
}

describe('GET /api/proof', () => {
  beforeEach(() => mockedGetResolvedSlice.mockReset());

  it('derives all performance fields from the canonical 24h population', async () => {
    setHistory([
      record('tp-win', { price: 102, pnlPct: 2, hit: true, target: 'TP1', source: 'binance' }),
      record('sl-loss', { price: 99, pnlPct: -1, hit: false, target: 'SL', source: 'binance' }),
      record('drift-win', { price: 100.5, pnlPct: 0.5, hit: true, target: 'expired', source: 'binance' }),
      record('drift-loss', { price: 99.75, pnlPct: -0.25, hit: false, target: 'expired', source: 'binance' }),
      record('force-expired', { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' }),
      record('simulated', { price: 110, pnlPct: 10, hit: true, target: 'TP1', source: 'binance' }, { isSimulated: true }),
      record('gate-blocked', { price: 110, pnlPct: 10, hit: true, target: 'TP1', source: 'binance' }, { gateBlocked: true }),
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.stats).toMatchObject({
      totalSignals: 7,
      realSignals: 6,
      resolvedSignals: 4,
      winRate4h: 50,
      winRate24h: 50,
      runningPnlPct: 0.31,
      totalWins: 2,
      totalLosses: 2,
    });
    expect(body.stats.totalWins + body.stats.totalLosses).toBe(body.stats.resolvedSignals);
    expect(mockedGetResolvedSlice).toHaveBeenCalledWith({ scope: 'pro' });
    expect(body.window).toEqual({
      sourceRecordsLoaded: 7,
      sourceReadLimit: 10_000,
      potentiallyTruncatedBeforeStart: false,
    });
    expect(body.methodology.runningPnlPct).toMatch(/not account or portfolio P&L/i);
    expect(body.signals.find((signal: { id: string }) => signal.id === 'force-expired').outcome24h).toEqual({
      resolved: false,
      hit: null,
      price: null,
      pnlPct: null,
    });
  });

  it('does not publish legacy outcomes whose OHLCV source is missing', async () => {
    setHistory([
      record('legacy', { price: 102, pnlPct: 2, hit: true, target: 'TP1' }),
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.stats.resolvedSignals).toBe(0);
    expect(body.signals[0].outcome24h).toEqual({
      resolved: false,
      hit: null,
      price: null,
      pnlPct: null,
    });
  });

  it('publishes proof methodology and source-window metadata in OpenAPI', () => {
    const spec = buildOpenApiSpec() as {
      components: { schemas: { ProofResponse: { required: string[]; properties: Record<string, unknown> } } };
    };
    const schema = spec.components.schemas.ProofResponse;

    expect(schema.required).toEqual(expect.arrayContaining(['stats', 'signals', 'methodology', 'window']));
    expect(schema.properties).toEqual(expect.objectContaining({
      methodology: expect.any(Object),
      window: expect.any(Object),
    }));
  });
});
