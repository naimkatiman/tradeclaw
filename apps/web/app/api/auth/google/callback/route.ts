import { NextRequest, NextResponse } from 'next/server';
import { upsertUserByEmail } from '../../../../../lib/db';
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

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function getRedirectUri(request: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(request.url).origin;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
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

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return errorRedirect(request, 'oauth_not_configured');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return errorRedirect(request, `google_${oauthError}`);
  if (!code || !stateRaw) return errorRedirect(request, 'missing_code_or_state');

  const state = decodeState(stateRaw);
  if (!state) return errorRedirect(request, 'invalid_state');

  const cookieNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!cookieNonce || cookieNonce !== state.nonce) {
    return errorRedirect(request, 'state_mismatch');
  }

  let email: string | null = null;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) return errorRedirect(request, 'token_exchange_failed');
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) return errorRedirect(request, 'no_access_token');

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) return errorRedirect(request, 'userinfo_failed');
    const userJson = (await userRes.json()) as {
      email?: string;
      email_verified?: boolean;
    };
    if (!userJson.email || userJson.email_verified === false) {
      return errorRedirect(request, 'email_unverified');
    }
    email = userJson.email;
  } catch {
    return errorRedirect(request, 'oauth_network_error');
  }

  let userId: string;
  try {
    const user = await upsertUserByEmail(email);
    userId = user.id;
  } catch {
    return errorRedirect(request, 'user_upsert_failed');
  }

  // Decide where to send the browser. If the original signin URL carried a
  // checkout payload (priceId or tier=pro&interval=...), bounce back through
  // /signin so its existing auto-checkout effect runs (it sees the session
  // cookie and POSTs to /api/stripe/checkout). Otherwise go to next or /dashboard.
  const hasCheckoutPayload =
    !!state.priceId || (state.tier === 'pro' && (state.interval === 'monthly' || state.interval === 'annual'));

  // Re-apply safeNext on every read of state.next. The /start route
  // sanitized at write time, but a leaked or attacker-crafted state blob
  // could carry a `//evil.com/` value that would otherwise resolve to a
  // different origin via scheme-relative URL parsing.
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
