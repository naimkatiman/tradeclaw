import { NextRequest, NextResponse } from 'next/server';
import { upsertUserProfile } from '../../../../../lib/db';
import { safeAvatarUrl } from '../../../../../lib/avatar-url';
import {
  USER_SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '../../../../../lib/user-session';
import {
  OAUTH_STATE_COOKIE,
  decodeState,
  safeNext,
} from '../../../../../lib/oauth-state';

export const dynamic = 'force-dynamic';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

function getRedirectUri(request: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(request.url).origin;
  return `${base.replace(/\/$/, '')}/api/auth/github/callback`;
}

function appOrigin(request: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(request.url).origin;
  return base.replace(/\/$/, '');
}

function errorRedirect(request: NextRequest, code: string): NextResponse {
  const url = new URL('/signin', appOrigin(request));
  url.searchParams.set('error', code);
  return NextResponse.redirect(url.toString(), { status: 302 });
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return errorRedirect(request, 'oauth_not_configured');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return errorRedirect(request, `github_${oauthError}`);
  if (!code || !stateRaw) return errorRedirect(request, 'missing_code_or_state');

  const state = decodeState(stateRaw);
  if (!state) return errorRedirect(request, 'invalid_state');

  const cookieNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!cookieNonce || cookieNonce !== state.nonce) {
    return errorRedirect(request, 'state_mismatch');
  }

  let email: string | null = null;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
      }).toString(),
    });
    if (!tokenRes.ok) return errorRedirect(request, 'token_exchange_failed');
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!tokenJson.access_token) return errorRedirect(request, 'no_access_token');

    const accessToken = tokenJson.access_token;
    const ghHeaders = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'tradeclaw-web',
    };

    const userRes = await fetch(GITHUB_USER_URL, { headers: ghHeaders });
    if (!userRes.ok) return errorRedirect(request, 'userinfo_failed');
    const userJson = (await userRes.json()) as {
      email?: string | null;
      name?: string | null;
      login?: string | null;
      avatar_url?: string | null;
    };

    const emailsRes = await fetch(GITHUB_EMAILS_URL, { headers: ghHeaders });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as GitHubEmail[];
      const primary = emails.find((e) => e.primary && e.verified);
      const anyVerified = emails.find((e) => e.verified);
      email = primary?.email ?? anyVerified?.email ?? userJson.email ?? null;
    } else {
      email = userJson.email ?? null;
    }

    if (!email) return errorRedirect(request, 'email_unverified');

    // GitHub `name` is optional; `login` (handle) is always present and
    // is a fine fallback for the navbar greeting.
    const rawName = (userJson.name ?? '').trim();
    const rawLogin = (userJson.login ?? '').trim();
    displayName = rawName || rawLogin || null;
    avatarUrl = safeAvatarUrl(userJson.avatar_url);
  } catch {
    return errorRedirect(request, 'oauth_network_error');
  }

  let userId: string;
  try {
    const user = await upsertUserProfile({
      email,
      displayName,
      avatarUrl,
      authProvider: 'github',
    });
    userId = user.id;
  } catch (err) {
    console.error('[auth/github/callback] upsertUserProfile failed:', err);
    return errorRedirect(request, 'user_upsert_failed');
  }

  const hasCheckoutPayload =
    !!state.priceId ||
    (state.tier === 'pro' && (state.interval === 'monthly' || state.interval === 'annual'));

  // Re-apply safeNext on every read of state.next. The /start route sanitized
  // at write time, but a leaked or attacker-crafted state blob could carry a
  // `//evil.com/` value that would otherwise resolve to a different origin
  // via scheme-relative URL parsing. Mirrors the posture in google/callback.
  const safeStateNext = safeNext(state.next);

  let target: URL;
  if (hasCheckoutPayload) {
    target = new URL('/signin', appOrigin(request));
    if (state.priceId) target.searchParams.set('priceId', state.priceId);
    if (state.tier) target.searchParams.set('tier', state.tier);
    if (state.interval) target.searchParams.set('interval', state.interval);
    if (safeStateNext) target.searchParams.set('next', safeStateNext);
  } else if (safeStateNext) {
    target = new URL(safeStateNext, appOrigin(request));
  } else {
    target = new URL('/dashboard', appOrigin(request));
  }

  const token = createSessionToken(userId);
  const res = NextResponse.redirect(target.toString(), { status: 302 });
  res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions());
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
