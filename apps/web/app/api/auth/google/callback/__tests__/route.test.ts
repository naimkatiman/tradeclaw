/**
 * Google OAuth callback route tests. Covers the success path (token exchange
 * → userinfo → user upsert → session cookie issuance + state cookie deletion)
 * and the security gates that must NOT issue a session: state mismatch,
 * unverified email, and token exchange failure.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../../lib/db', () => ({
  upsertUserProfile: jest.fn(),
}));

jest.mock('../../../../../../lib/oauth-state', () => ({
  OAUTH_STATE_COOKIE: 'tc_oauth_state',
  decodeState: jest.fn(),
  // Pass-through: the route re-applies safeNext to state.next at read time.
  // Real implementation is in lib/oauth-state.ts; the unit test only needs a
  // stable identity function so the redirect-target logic exercises both
  // branches deterministically.
  safeNext: jest.fn((next: string | undefined | null) => next ?? null),
}));

jest.mock('../../../../../../lib/user-session', () => ({
  USER_SESSION_COOKIE: 'tc_user_session',
  createSessionToken: jest.fn().mockReturnValue('forged.session.token'),
  sessionCookieOptions: jest.fn().mockReturnValue({
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }),
}));

import { upsertUserProfile } from '../../../../../../lib/db';
import { decodeState } from '../../../../../../lib/oauth-state';
import { createSessionToken } from '../../../../../../lib/user-session';
import { GET } from '../route';

const mockedUpsertUser = upsertUserProfile as jest.MockedFunction<typeof upsertUserProfile>;
const mockedDecodeState = decodeState as jest.MockedFunction<typeof decodeState>;
const mockedCreateToken = createSessionToken as jest.MockedFunction<typeof createSessionToken>;

interface FakeFetchResponse {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}

function setFetch(responses: FakeFetchResponse[]): jest.Mock {
  let i = 0;
  const fn = jest.fn().mockImplementation(async () => {
    const r = responses[i++];
    if (!r) throw new Error('unexpected fetch');
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: r.json ?? (async () => ({})),
      text: async () => '',
    };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fn;
  return fn;
}

function makeRequest(opts: {
  url: string;
  cookies?: Record<string, string>;
}): NextRequest {
  const cookieHeader = opts.cookies
    ? Object.entries(opts.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    : '';
  return new NextRequest(opts.url, {
    method: 'GET',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

const ORIGINAL_ENV = process.env;

describe('GET /api/auth/google/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('happy path: exchanges code, fetches userinfo, upserts user, issues session cookie, redirects to /dashboard', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
    });
    mockedUpsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'naim@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const fetchMock = setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      {
        ok: true,
        json: async () => ({
          email: 'naim@example.com',
          email_verified: true,
          name: 'Naim Katiman',
          picture: 'https://lh3.googleusercontent.com/a/abc=s96-c',
        }),
      },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');

    // Token exchange POST shape
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe('https://oauth2.googleapis.com/token');
    expect(tokenCall[1].method).toBe('POST');
    const tokenBody = tokenCall[1].body as string;
    expect(tokenBody).toContain('code=auth_code');
    expect(tokenBody).toContain('client_id=test-client-id');
    expect(tokenBody).toContain('grant_type=authorization_code');

    // Userinfo GET shape
    const userinfoCall = fetchMock.mock.calls[1];
    expect(userinfoCall[0]).toBe('https://openidconnect.googleapis.com/v1/userinfo');
    expect(userinfoCall[1].headers.authorization).toBe('Bearer gat_xyz');

    // User row written with full profile
    expect(mockedUpsertUser).toHaveBeenCalledWith({
      email: 'naim@example.com',
      displayName: 'Naim Katiman',
      avatarUrl: 'https://lh3.googleusercontent.com/a/abc=s96-c',
      authProvider: 'google',
    });
    expect(mockedCreateToken).toHaveBeenCalledWith('user-1');

    // Session cookie set, state cookie deleted
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith('tc_user_session=forged.session.token'))).toBe(true);
    // State cookie deletion produces a `tc_oauth_state=;` directive with either
    // `Max-Age=0` or a past `Expires` date depending on Next.js version.
    expect(
      setCookies.some(
        (c) => c.startsWith('tc_oauth_state=') && (c.includes('Max-Age=0') || /Expires=.*1970/i.test(c)),
      ),
    ).toBe(true);
  });

  it('checkout-payload state bounces back through /signin with priceId/tier/interval preserved', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
      tier: 'pro',
      interval: 'monthly',
    });
    mockedUpsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'naim@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });
    setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      { ok: true, json: async () => ({ email: 'naim@example.com', email_verified: true }) },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/signin');
    expect(location.searchParams.get('tier')).toBe('pro');
    expect(location.searchParams.get('interval')).toBe('monthly');

    // Session cookie still issued — the /signin landing then reads it and
    // POSTs to /api/stripe/checkout from the client effect.
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith('tc_user_session='))).toBe(true);
  });

  it('honors state.next when there is no checkout payload', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
      next: '/track-record',
    });
    mockedUpsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'naim@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });
    setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      { ok: true, json: async () => ({ email: 'naim@example.com', email_verified: true }) },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/track-record');
  });

  it('redirects to /signin?error=oauth_not_configured when client id is missing (no Stripe call)', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    const fetchMock = setFetch([]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=x&state=y',
      }),
    );

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/signin');
    expect(loc.searchParams.get('error')).toBe('oauth_not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses missing code/state with missing_code_or_state error and no session cookie', async () => {
    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback',
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).searchParams.get('error')).toBe('missing_code_or_state');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('tc_user_session='))).toBe(false);
    expect(mockedUpsertUser).not.toHaveBeenCalled();
  });

  it('rejects state mismatch (cookie nonce ≠ URL state nonce) — never issues a session', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'url-side-nonce-aaaaaaaaaaaaaaaaa',
      issuedAt: Date.now(),
    });

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=x&state=y',
        cookies: { tc_oauth_state: 'cookie-side-nonce-bbbbbbbbbbbbbbb' },
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).searchParams.get('error')).toBe('state_mismatch');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('tc_user_session='))).toBe(false);
    expect(mockedUpsertUser).not.toHaveBeenCalled();
  });

  it('rejects email_verified=false — never issues a session', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
    });
    setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      { ok: true, json: async () => ({ email: 'spoof@example.com', email_verified: false }) },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).searchParams.get('error')).toBe('email_unverified');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('tc_user_session='))).toBe(false);
    expect(mockedUpsertUser).not.toHaveBeenCalled();
  });

  it('redirects to token_exchange_failed when Google returns 4xx on the token endpoint', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
    });
    setFetch([
      { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).searchParams.get('error')).toBe('token_exchange_failed');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('tc_user_session='))).toBe(false);
  });

  it('forwards provider error param as google_<error>', async () => {
    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?error=access_denied',
      }),
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).searchParams.get('error')).toBe('google_access_denied');
  });

  it('drops a non-allowlisted https avatar host (defends against hot-link of attacker domain)', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
    });
    mockedUpsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'naim@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: 'Naim',
      avatarUrl: null,
      authProvider: 'google',
      referralCode: null,
      referredBy: null,
    });
    setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      {
        ok: true,
        json: async () => ({
          email: 'naim@example.com',
          email_verified: true,
          name: 'Naim',
          // Valid https but not on the avatar host allowlist — must be dropped.
          picture: 'https://attacker.example.com/track.png',
        }),
      },
    ]);

    await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(mockedUpsertUser).toHaveBeenCalledWith({
      email: 'naim@example.com',
      displayName: 'Naim',
      avatarUrl: null,
      authProvider: 'google',
    });
  });

  it('drops a non-https picture URL and a missing name; persists nulls instead', async () => {
    mockedDecodeState.mockReturnValue({
      nonce: 'a'.repeat(32),
      issuedAt: Date.now(),
    });
    mockedUpsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'naim@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: 'google',
      referralCode: null,
      referredBy: null,
    });
    setFetch([
      { ok: true, json: async () => ({ access_token: 'gat_xyz' }) },
      {
        ok: true,
        json: async () => ({
          email: 'naim@example.com',
          email_verified: true,
          // attacker-controlled javascript: URL must NOT survive
          picture: 'javascript:alert(1)',
          // empty name → null, not empty string
          name: '',
        }),
      },
    ]);

    const res = await GET(
      makeRequest({
        url: 'http://localhost:3000/api/auth/google/callback?code=auth_code&state=fake_state',
        cookies: { tc_oauth_state: 'a'.repeat(32) },
      }),
    );

    expect(res.status).toBe(302);
    expect(mockedUpsertUser).toHaveBeenCalledWith({
      email: 'naim@example.com',
      displayName: null,
      avatarUrl: null,
      authProvider: 'google',
    });
  });
});
