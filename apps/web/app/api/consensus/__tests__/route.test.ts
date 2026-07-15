jest.mock('../../../../lib/tracked-signals', () => ({
  getTrackedSignals: jest.fn(),
}));

import { GET } from '../route';
import { getTrackedSignals } from '../../../../lib/tracked-signals';

const mockedGetTrackedSignals = getTrackedSignals as jest.MockedFunction<typeof getTrackedSignals>;
type TrackedResult = Awaited<ReturnType<typeof getTrackedSignals>>;

function result(signals: unknown[]): TrackedResult {
  return { signals, syntheticSymbols: [] } as unknown as TrackedResult;
}

function signal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'signal-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    dataQuality: 'real',
    ...overrides,
  };
}

beforeEach(() => {
  mockedGetTrackedSignals.mockReset();
});

describe('GET /api/consensus', () => {
  it('returns an explicit empty state without neutral percentages or default rankings', async () => {
    mockedGetTrackedSignals.mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([]));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      entries: [],
      overallBullish: null,
      mostBullish: null,
      mostBearish: null,
      mostConflicted: null,
      totalBuySignals: 0,
      totalSellSignals: 0,
      status: 'empty',
    });
    expect(body.provenance).toMatchObject({
      source: 'observed-ohlcv-derived-signals',
      availableTimeframes: ['H1', 'H4'],
      unavailableTimeframes: [],
      syntheticExcluded: true,
    });
  });

  it('aggregates only real-data rows and preserves timeframe provenance', async () => {
    mockedGetTrackedSignals
      .mockResolvedValueOnce(result([
        signal(),
        signal({ id: 'synthetic', symbol: 'ETHUSD', dataQuality: 'synthetic' }),
      ]))
      .mockResolvedValueOnce(result([
        signal({ id: 'sell', timeframe: 'H4', direction: 'SELL', confidence: 60 }),
      ]));

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe('available');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]).toMatchObject({
      pair: 'BTCUSD',
      buyCount: 1,
      sellCount: 1,
      totalCount: 2,
      buyRatio: 0.5,
      avgBuyConfidence: 80,
      avgSellConfidence: 60,
      timeframes: ['H1', 'H4'],
      source: 'observed-ohlcv-derived',
    });
    expect(body.entries[0]).not.toHaveProperty('trend24h');
    expect(body.overallBullish).toBe(50);
  });

  it('labels a one-timeframe response as partial instead of filling the missing source', async () => {
    mockedGetTrackedSignals
      .mockResolvedValueOnce(result([signal()]))
      .mockRejectedValueOnce(new Error('H4 unavailable'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('partial');
    expect(body.provenance.availableTimeframes).toEqual(['H1']);
    expect(body.provenance.unavailableTimeframes).toEqual(['H4']);
    expect(body.entries).toHaveLength(1);
  });

  it('returns 503 with null metrics when both source calls fail', async () => {
    mockedGetTrackedSignals
      .mockRejectedValueOnce(new Error('H1 unavailable'))
      .mockRejectedValueOnce(new Error('H4 unavailable'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'unavailable',
      entries: [],
      overallBullish: null,
      mostBullish: null,
      mostBearish: null,
      mostConflicted: null,
    });
    expect(body.provenance.unavailableTimeframes).toEqual(['H1', 'H4']);
  });
});
