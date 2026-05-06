import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

// /api/telegram/link-token issues a short-lived deep-link token that the
// Telegram bot consumes to associate a TG user with our app userId. It's a
// pure server-side route — no Telegram network call — so the test is fast
// and deterministic.

function makeSessionToken(userId: string, secret: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET ?? '';
const sessionSecretAvailable = USER_SESSION_SECRET.length >= 16;
const PRO_TIER_STUB_AVAILABLE = process.env.E2E_FORCE_PRO_TIER === 'true';
const PRO_USER_ID = process.env.E2E_PRO_USER_ID ?? 'e2e-pro-user';

test.describe('telegram link-token API', () => {
  test('POST without session returns 401', async ({ request }) => {
    const res = await request.post('/api/telegram/link-token');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Not signed in/i);
  });

  test('POST with pro session returns deepLink and 600s TTL', async ({ request, baseURL }) => {
    test.skip(
      !sessionSecretAvailable || !PRO_TIER_STUB_AVAILABLE,
      'Needs USER_SESSION_SECRET and E2E_FORCE_PRO_TIER=true',
    );

    const token = makeSessionToken(PRO_USER_ID, USER_SESSION_SECRET);
    const cookieDomain = new URL(baseURL ?? 'http://localhost:3000').hostname;
    const cookieHeader = `tc_user_session=${encodeURIComponent(token)}`;

    const res = await request.post('/api/telegram/link-token', {
      headers: { Cookie: cookieHeader, Host: cookieDomain },
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      token: string;
      deepLink: string;
      expiresInSeconds: number;
    };

    // Token shape: <userId>.<issuedAtMs>.<hex-signature>
    expect(body.token).toMatch(/^[\w-]+\.\d+\.[a-f0-9]{64}$/);

    // Deep link shape: https://t.me/<bot>?start=<encoded-token>
    expect(body.deepLink).toMatch(/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=/);
    const linkUrl = new URL(body.deepLink);
    expect(linkUrl.hostname).toBe('t.me');
    const startParam = linkUrl.searchParams.get('start');
    expect(startParam).toBeTruthy();
    expect(startParam).toBe(body.token);

    // TTL is 10 minutes per TELEGRAM_LINK_TOKEN_TTL_SECONDS.
    expect(body.expiresInSeconds).toBe(600);
  });
});
