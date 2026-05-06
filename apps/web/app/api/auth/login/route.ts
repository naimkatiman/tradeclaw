import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'tc_admin';
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

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Strict — the admin cookie value IS the secret. Lax let cross-site
      // GET navigations carry it; with Strict the cookie only attaches to
      // same-site requests, which suits a top-level admin UI.
      sameSite: 'strict',
      path: '/',
      maxAge: MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
