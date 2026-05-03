import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink } from '../../../../../lib/magic-link';
import { upsertUserByEmail } from '../../../../../lib/db';
import { createSessionToken, sessionCookieOptions, USER_SESSION_COOKIE } from '../../../../../lib/user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.redirect(new URL('/signin?error=missing_token', req.url));

  const result = await consumeMagicLink(token);
  if (!result.ok || !result.email) {
    return NextResponse.redirect(new URL(`/signin?error=${result.reason ?? 'invalid'}`, req.url));
  }

  const user = await upsertUserByEmail(result.email);
  const sessionToken = createSessionToken(user.id);
  const res = NextResponse.redirect(new URL('/dashboard', req.url));
  res.cookies.set(USER_SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
