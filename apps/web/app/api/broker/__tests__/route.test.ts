jest.mock('../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn().mockResolvedValue(null),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

describe('/api/broker', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.METAAPI_TOKEN;
  const originalAccount = process.env.METAAPI_ACCOUNT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METAAPI_TOKEN = 'server-token';
    process.env.METAAPI_ACCOUNT_ID = 'account-123';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.METAAPI_TOKEN = originalToken;
    process.env.METAAPI_ACCOUNT_ID = originalAccount;
  });

  const request = () => new NextRequest('http://localhost/api/broker');

  it('fails closed when server credentials are not configured', async () => {
    delete process.env.METAAPI_TOKEN;
    const response = await GET(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ available: false });
  });

  it('uses server credentials and returns observed MetaApi data', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init: RequestInit) => Promise.resolve({
      ok: true,
      json: async () => url.includes('account-information')
        ? { balance: 10_000, currency: 'USD' }
        : [{ id: 'position-1', symbol: 'XAUUSD' }],
      status: 200,
      requestHeaders: init.headers,
    } as unknown as Response));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ available: true, source: 'MetaApi' });
    expect(body.positions).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('account-123/account-information'),
      expect.objectContaining({ headers: expect.objectContaining({ 'auth-token': 'server-token' }) }),
    );
  });

  it('does not accept browser-submitted credentials', async () => {
    const response = await POST();
    expect(response.status).toBe(405);
  });
});
