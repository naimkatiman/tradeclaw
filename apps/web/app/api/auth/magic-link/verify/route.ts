import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink } from '../../../../../lib/magic-link';
import { resolveMagicLinkTarget } from '../../../../../lib/magic-link-redirect';
// TODO(magic-link): swap to upsertUserProfile once magic-link supports a
// display name on the verify form. Until then magic-link users get
// displayName/avatarUrl/authProvider all null, which the navbar handles
// (initials fallback, no provider chip).
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

  // Resume any checkout intent carried on the link instead of always landing on
  // /dashboard (mirrors the Google OAuth callback). Re-sanitized inside.
  const sp = req.nextUrl.searchParams;
  const target = resolveMagicLinkTarget(
    {
      priceId: sp.get('priceId'),
      tier: sp.get('tier'),
      interval: sp.get('interval'),
      next: sp.get('next'),
    },
    origin,
  );

  const res = NextResponse.redirect(target);
  res.cookies.set(USER_SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
