jest.mock('../db-pool', () => ({ query: jest.fn() }));

import { query } from '../db-pool';
import { getProviders } from '../marketplace-providers';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('marketplace providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty directory when the database has no providers', async () => {
    mockQuery.mockResolvedValue([]);

    await expect(getProviders()).resolves.toEqual([]);
  });

  it('maps only provider rows returned by the database', async () => {
    mockQuery.mockResolvedValue([
      {
        id: 'provider-1',
        slug: 'published-provider',
        name: 'Published Provider',
        bio: null,
        website: null,
        verified: false,
        created_at: '2026-07-15T00:00:00.000Z',
      },
    ]);

    await expect(getProviders()).resolves.toEqual([
      {
        id: 'provider-1',
        slug: 'published-provider',
        name: 'Published Provider',
        bio: null,
        website: null,
        verified: false,
        createdAt: '2026-07-15T00:00:00.000Z',
      },
    ]);
  });
});
