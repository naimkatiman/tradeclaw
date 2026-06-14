import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/broker', () => {
  const ORIGINAL_FETCH = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  function makeReq(body: unknown) {
    return new NextRequest('http://localhost/api/broker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 when token or accountId is missing', async () => {
    const res = await POST(makeReq({ token: 'abc' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 200 with account info and positions on success', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('account-information')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ balance: 10000, equity: 10200 }),
        } as Response);
      }
      if (url.includes('positions')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 'pos-1', symbol: 'XAUUSD', type: 'BUY' }],
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const res = await POST(makeReq({ token: 'test-token', accountId: 'acc-123' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accountInfo).toEqual({ balance: 10000, equity: 10200 });
    expect(json.positions).toEqual([{ id: 'pos-1', symbol: 'XAUUSD', type: 'BUY' }]);
    expect(json.timestamp).toBeDefined();
  });

  it('returns 502 when MetaApi account endpoint fails', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('account-information')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ id: 1, error: 'Unauthorized', message: 'Invalid token' }),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const res = await POST(makeReq({ token: 'bad-token', accountId: 'acc-123' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Invalid token');
  });

  it('returns 504 on timeout', async () => {
    const mockFetch = jest.fn().mockImplementation(() => {
      const err = new DOMException('The operation timed out.', 'TimeoutError');
      return Promise.reject(err);
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const res = await POST(makeReq({ token: 'test-token', accountId: 'acc-123' }));
    expect(res.status).toBe(504);
    const json = await res.json();
    expect(json.error).toContain('timed out');
  });

  it('returns 502 on network fetch failure', async () => {
    const mockFetch = jest.fn().mockImplementation(() => {
      return Promise.reject(new TypeError('fetch failed'));
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const res = await POST(makeReq({ token: 'test-token', accountId: 'acc-123' }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain('Unable to reach MetaApi');
  });
});
