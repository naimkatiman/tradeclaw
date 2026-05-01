import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import { POST } from '../route';
import { verifyTelegramLinkToken } from '../../../../../lib/telegram-link-token';

const mockedRead = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;

describe('POST /api/telegram/link-token', () => {
  const ORIGINAL_SECRET = process.env.USER_SESSION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_SESSION_SECRET = 'a-very-long-test-secret-key-1234567890';
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = 'TestBot';
  });

  afterAll(() => {
    process.env.USER_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockedRead.mockReturnValueOnce(null);

    const res = await POST(new NextRequest('http://localhost/api/telegram/link-token', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('issues a verifiable token tied to the session userId', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-abc', issuedAt: Date.now() });

    const res = await POST(new NextRequest('http://localhost/api/telegram/link-token', { method: 'POST' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.token).toBe('string');
    expect(body.deepLink).toMatch(/^https:\/\/t\.me\/[^/]+\?start=/);
    expect(body.expiresInSeconds).toBeGreaterThan(0);

    const verified = verifyTelegramLinkToken(body.token);
    expect(verified?.userId).toBe('user-abc');
  });

  it('does not accept a body-supplied userId', async () => {
    // Even if a malicious caller supplies userId in the request body, the
    // route must rely solely on the signed session cookie.
    mockedRead.mockReturnValueOnce({ userId: 'real-user', issuedAt: Date.now() });

    const res = await POST(
      new NextRequest('http://localhost/api/telegram/link-token', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-target' }),
      }),
    );
    const body = await res.json();

    const verified = verifyTelegramLinkToken(body.token);
    expect(verified?.userId).toBe('real-user');
  });
});
