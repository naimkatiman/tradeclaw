import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/db-pool', () => ({
  query: jest.fn(),
}));

import { query } from '../../../../../lib/db-pool';
import { GET } from '../route';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('v1 regime API truth boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns explicit nulls when no observed row exists', async () => {
    mockedQuery.mockResolvedValue([]);

    const response = await GET(new NextRequest('http://localhost/api/v1/regime?symbol=BTCUSD'));
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      available: false,
      data: {
        symbol: 'BTCUSD',
        regime: null,
        confidence: null,
        features: {
          rollingVol20d: null,
          returns5d: null,
          returns20d: null,
          volumeZScore: null,
        },
        detectedAt: null,
      },
      note: 'No observed regime row is available for this symbol.',
    });
  });

  it('keeps absent feature values null on an observed row', async () => {
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        symbol: 'BTCUSD',
        regime: 'trend',
        confidence: '0.82',
        features: { rollingVol20d: 0.12 },
        detected_at: '2026-07-15T00:00:00.000Z',
      },
    ] as never);

    const response = await GET(new NextRequest('http://localhost/api/v1/regime?symbol=BTCUSD'));
    const body = await response.json();

    expect(body.available).toBe(true);
    expect(body.data.confidence).toBe(0.82);
    expect(body.data.features).toEqual({
      rollingVol20d: 0.12,
      returns5d: null,
      returns20d: null,
      volumeZScore: null,
    });
  });
});
