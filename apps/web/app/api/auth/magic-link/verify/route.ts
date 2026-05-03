import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink } from '../../../../../lib/magic-link';
import { upsertUserByEmail } from '../../../../../lib/db';
import { createSessionToken, sessionCookieOptions, USER_SESSION_COOKIE } from '../../../../../lib/user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public origin for redirect targets. `req.url` inside Railway's container is
 * `http://0.0.0.0:3000/...` (the internal bind address), not the public
 * hostname Cloudflare proxies. Using it as the base for `new URL('/dashboard')`
 * sends users to a dead 0.0.0.0 page after they click the magic link.
 *
 * Mirror the helper in /api/auth/google/callback: prefer the explicit
 * OAUTH_REDIRECT_BASE_URL or NEXT_PUBLIC_BASE_URL env vars; fall back to
 * request origin only as a last resort (covers local dev where it works).
 */
function appOrigin(req: NextRequest): string {
  const base =
    process.env.OAUTH_REDIRECT_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    new URL(req.url).origin;
  return base.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.redirect(new URL('/signin?error=missing_token', origin));

  const result = await consumeMagicLink(token);
  if (!result.ok || !result.email) {
    return NextResponse.redirect(new URL(`/signin?error=${result.reason ?? 'invalid'}`, origin));
  }

  const user = await upsertUserByEmail(result.email);
  const sessionToken = createSessionToken(user.id);
  const res = NextResponse.redirect(new URL('/dashboard', origin));
  res.cookies.set(USER_SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
