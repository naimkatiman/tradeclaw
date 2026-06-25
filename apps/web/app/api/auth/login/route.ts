import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { secureCookieDefault } from '../../../../lib/cookie-flags';
import {
  createAdminSession,
  ADMIN_SESSION_COOKIE,
} from '../../../../lib/admin-session';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function safeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(request: NextRequest) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return NextResponse.json(
        { error: 'ADMIN_SECRET is not configured on the server' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { secret } = body as { secret?: string };

    if (!secret || !safeStringEqual(secret, adminSecret)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    // Issue a signed session token instead of storing the raw secret in the cookie
    const sessionToken = await createAdminSession(adminSecret);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: secureCookieDefault(),
      sameSite: 'strict',
      path: '/',
      maxAge: MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
