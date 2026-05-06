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

  it('issues a verifiable deep link tied to the session userId', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-abc', issuedAt: Date.now() });

    const res = await POST(new NextRequest('http://localhost/api/telegram/link-token', { method: 'POST' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deepLink).toMatch(/^https:\/\/t\.me\/[^/]+\?start=/);
    expect(body.expiresInSeconds).toBeGreaterThan(0);
    // Token is no longer surfaced in the body — it lives only in the deep
    // link query string. This prevents the response body from becoming a
    // one-time credential that gets cached in dev tools / network logs.
    expect(body.token).toBeUndefined();

    // Extract the token from the deep link to verify it still binds to the
    // session userId (the bot route is what consumes it).
    const tokenInLink = decodeURIComponent(new URL(body.deepLink).searchParams.get('start') ?? '');
    const verified = verifyTelegramLinkToken(tokenInLink);
    expect(verified?.userId).toBe('user-abc');
  });

  it('does not accept a body-supplied userId', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'real-user', issuedAt: Date.now() });

    const res = await POST(
      new NextRequest('http://localhost/api/telegram/link-token', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-target' }),
      }),
    );
    const body = await res.json();

    const tokenInLink = decodeURIComponent(new URL(body.deepLink).searchParams.get('start') ?? '');
    const verified = verifyTelegramLinkToken(tokenInLink);
    expect(verified?.userId).toBe('real-user');
  });
});
