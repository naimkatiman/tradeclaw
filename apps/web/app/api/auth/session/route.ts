import { NextRequest, NextResponse } from 'next/server';
import { upsertUserByEmail } from '../../../../lib/db';
import {
  USER_SESSION_COOKIE,
  createSessionToken,
  readSessionFromRequest,
  sessionCookieOptions,
} from '../../../../lib/user-session';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/session  { email }
 * Passwordless signin: finds or creates a user by email and issues an HMAC
 * session cookie. No email verification in this first pass — the gate is the
 * payment step at Stripe checkout.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  if (!emailRaw || emailRaw.length > 255 || !EMAIL_RE.test(emailRaw)) {
    return NextResponse.json(
      { success: false, error: 'Valid email is required' },
      { status: 400 },
    );
  }

  try {
    const user = await upsertUserByEmail(emailRaw);
    const token = createSessionToken(user.id);
    const res = NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email, tier: user.tier },
    });
    res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET /api/auth/session — returns the current user from the cookie. */
export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: true, data: null });
  }
  const { getUserById } = await import('../../../../lib/db');
  const user = await getUserById(session.userId);
  if (!user) {
    const res = NextResponse.json({ success: true, data: null });
    res.cookies.delete(USER_SESSION_COOKIE);
    return res;
  }
  return NextResponse.json({
    success: true,
    data: { userId: user.id, email: user.email, tier: user.tier },
  });
}

/** DELETE /api/auth/session — signs the user out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(USER_SESSION_COOKIE);
  return res;
}
