import { NextRequest, NextResponse } from 'next/server';
import {
  USER_SESSION_COOKIE,
  readSessionFromRequest,
} from '../../../../lib/user-session';

export const dynamic = 'force-dynamic';

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

/**
 * POST is intentionally not implemented. The previous email-passwordless flow
 * created sessions without verifying the email address (no confirmation
 * link). Sign-in is now Google OAuth only — start at /api/auth/google/start.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Email sign-in is disabled. Use Google: /api/auth/google/start',
    },
    { status: 410 },
  );
}
