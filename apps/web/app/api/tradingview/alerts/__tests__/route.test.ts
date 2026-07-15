import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

jest.mock('@/lib/tradingview-alerts', () => ({
  getAlerts: jest.fn(),
  getAlertStats: jest.fn(),
}));

import { assertAdminApi } from '@/lib/admin-gate';
import { getAlerts, getAlertStats } from '@/lib/tradingview-alerts';
import { GET } from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedAlerts = getAlerts as jest.MockedFunction<typeof getAlerts>;
const mockedStats = getAlertStats as jest.MockedFunction<typeof getAlertStats>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/tradingview/alerts', () => {
  it('rejects callers outside the admin session', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/tradingview/alerts'),
    );

    expect(response.status).toBe(401);
    expect(mockedAlerts).not.toHaveBeenCalled();
  });

  it('returns the persisted admin alert ledger without public CORS', async () => {
    mockedAdmin.mockResolvedValue(null);
    mockedAlerts.mockReturnValue([]);
    mockedStats.mockReturnValue({ total: 0, last24h: 0, byPair: {} });

    const response = await GET(
      new NextRequest('http://localhost/api/tradingview/alerts'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
