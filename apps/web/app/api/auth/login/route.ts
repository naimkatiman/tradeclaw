import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'tc_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

    if (!secret || secret !== adminSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
