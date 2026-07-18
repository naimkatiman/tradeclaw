/**
 * fetchRegimeVolMap tests — reads features->>'vol20d' from the latest
 * market_regimes row per symbol (plan: docs/plans/2026-07-18-wire-vol-scaler.md).
 * Same fail-safe contract as fetchRegimeMap: any DB error yields an empty
 * map so the allocator runs unscaled, never throws.
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
}));

import { query } from '../db-pool';
import { fetchRegimeVolMap } from '../regime-filter';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('fetchRegimeVolMap', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns uppercased symbols with finite positive vols and skips null/garbage/non-positive', async () => {
    mockedQuery.mockResolvedValue([
      { symbol: 'btcusd', vol20d: '0.031' },
      { symbol: 'ETHUSD', vol20d: null },
      { symbol: 'XRPUSD', vol20d: 'not-a-number' },
      { symbol: 'SOLUSD', vol20d: '0' },
      { symbol: 'ADAUSD', vol20d: '-0.02' },
    ] as never);

    const map = await fetchRegimeVolMap();

    expect(map.get('BTCUSD')).toBeCloseTo(0.031, 10);
    expect(map.size).toBe(1);
  });

  it('returns an empty map when the DB query rejects', async () => {
    mockedQuery.mockRejectedValue(new Error('db down'));

    await expect(fetchRegimeVolMap()).resolves.toEqual(new Map());
  });
});
