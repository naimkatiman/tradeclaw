import { NextRequest } from 'next/server';

jest.mock('../../../../lib/tracked-signals', () => ({
  getTrackedSignalsForRequest: jest.fn(),
}));

import { getTrackedSignalsForRequest } from '../../../../lib/tracked-signals';
import { GET } from '../route';

const mockedGetTrackedSignals = getTrackedSignalsForRequest as jest.MockedFunction<
  typeof getTrackedSignalsForRequest
>;

describe('GET /api/heatmap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('omits symbols without an observed signal instead of fabricating neutral indicators', async () => {
    mockedGetTrackedSignals.mockResolvedValue({
      signals: [{
        id: 'btc-h1',
        symbol: 'BTCUSD',
        direction: 'BUY',
        confidence: 72,
        entry: 65_000,
        stopLoss: 64_000,
        takeProfit1: 67_000,
        takeProfit2: 68_000,
        takeProfit3: 69_000,
        timeframe: 'H1',
        timestamp: new Date().toISOString(),
        status: 'active',
        indicators: {
          rsi: { value: 57, signal: 'neutral' },
          macd: { histogram: 1, signal: 'bullish' },
          ema: { ema20: 1, ema50: 1, ema200: 1, trend: 'up' },
          bollingerBands: { bandwidth: 1, position: 'middle', squeeze: false },
          stochastic: { k: 50, d: 45, signal: 'neutral' },
          adx: { value: 25, plusDI: 30, minusDI: 20, trending: true },
          support: [],
          resistance: [],
        },
      }],
      syntheticSymbols: [],
    } as Awaited<ReturnType<typeof getTrackedSignalsForRequest>>);

    const response = await GET(new NextRequest('http://localhost/api/heatmap'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]).toMatchObject({
      pair: 'BTCUSD',
      direction: 'BUY',
      confidence: 72,
      price: 65_000,
      rsi: 57,
      macd: 1,
    });
    expect(body.entries.some((entry: { confidence: number }) => entry.confidence === 0)).toBe(false);
  });
});
