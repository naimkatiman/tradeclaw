import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  encodeState,
  newNonce,
  stateCookieOptions,
} from '../../../../../lib/oauth-state';

export const dynamic = 'force-dynamic';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

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
  return `${base.replace(/\/$/, '')}/api/auth/github/callback`;
}

function appOrigin(request: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(request.url).origin;
  return base.replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    const url = new URL('/signin', appOrigin(request));
    url.searchParams.set('error', 'oauth_not_configured');
    return NextResponse.redirect(url.toString(), { status: 302 });
  }

  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const priceId = url.searchParams.get('priceId') ?? undefined;
  const tier = url.searchParams.get('tier') ?? undefined;
  const interval = url.searchParams.get('interval') ?? undefined;

  const nonce = newNonce();
  const state = encodeState({ nonce, next, priceId, tier, interval });

  const redirectUri = getRedirectUri(request);
  const authorize = new URL(GITHUB_AUTH_URL);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'read:user user:email');
  authorize.searchParams.set('allow_signup', 'true');
  authorize.searchParams.set('state', state);

  const res = NextResponse.redirect(authorize.toString(), { status: 302 });
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, stateCookieOptions());
  return res;
}
