import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  encodeState,
  newNonce,
  stateCookieOptions,
} from '../../../../../lib/oauth-state';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function safeNext(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

function getRedirectUri(request: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(request.url).origin;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured on this server' },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const priceId = url.searchParams.get('priceId') ?? undefined;
  const tier = url.searchParams.get('tier') ?? undefined;
  const interval = url.searchParams.get('interval') ?? undefined;

  const nonce = newNonce();
  const state = encodeState({ nonce, next, priceId, tier, interval });

  const redirectUri = getRedirectUri(request);
  const authorize = new URL(GOOGLE_AUTH_URL);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('access_type', 'online');
  authorize.searchParams.set('include_granted_scopes', 'true');
  authorize.searchParams.set('prompt', 'select_account');
  authorize.searchParams.set('state', state);

  const res = NextResponse.redirect(authorize.toString(), { status: 302 });
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, stateCookieOptions());
  return res;
}
