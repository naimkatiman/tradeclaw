import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSessionFromCookies, readSessionFromRequest } from './user-session';
import { getUserById } from './db';
import { isAdminEmail } from './admin-emails';
import { verifyAdminSession } from './admin-session';

/**
 * Server-component guard for admin pages. Allows either:
 *  - a Google-OAuth user whose email is in `ADMIN_EMAILS`, or
 *  - a browser carrying the `tc_admin` cookie matching `ADMIN_SECRET`.
 *
 * On failure: redirects to `/admin/login`. Call at the top of every
 * admin-only server component (page or layout) — we deliberately avoid a
 * shared admin layout because `/admin/login` lives under the same path
 * and a layout-level redirect would loop on the login screen itself.
 */
export async function requireAdmin(): Promise<{ via: 'email' | 'secret'; email?: string }> {
  const session = await readSessionFromCookies();
  if (session?.userId) {
    const user = await getUserById(session.userId);
    if (user?.email && isAdminEmail(user.email)) {
      return { via: 'email', email: user.email };
    }
  }

  const cookieStore = await cookies();
  const adminSecret = process.env.ADMIN_SECRET;
  const cookieValue = cookieStore.get('tc_admin')?.value;
  if (adminSecret && (await verifyAdminSession(cookieValue, adminSecret))) {
    return { via: 'secret' };
  }

  redirect('/admin/login');
}

/**
 * API-route variant of `requireAdmin`: returns 401 instead of redirecting.
 * Accepts the same two grants (Google-OAuth admin email or `tc_admin`
 * cookie matching `ADMIN_SECRET`). Use from POST/GET handlers that the
 * admin browser hits directly.
 */
export async function assertAdminApi(request: Request): Promise<NextResponse | null> {
  const session = readSessionFromRequest(request);
  if (session?.userId) {
    const user = await getUserById(session.userId);
    if (user?.email && isAdminEmail(user.email)) return null;
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('tc_admin='));
    if (match) {
      try {
        const value = decodeURIComponent(match.slice('tc_admin='.length));
        if (await verifyAdminSession(value, adminSecret)) return null;
      } catch { /* malformed encoded cookie — fall through to 401 */ }
    }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Why: non-redirecting identity for audit attribution from API routes (middleware already gated).
export async function getAdminIdentityFromRequest(
  request: Request,
): Promise<{ via: 'email' | 'secret'; email?: string } | null> {
  const session = readSessionFromRequest(request);
  if (session?.userId) {
    const user = await getUserById(session.userId);
    if (user?.email && isAdminEmail(user.email)) {
      return { via: 'email', email: user.email };
    }
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('tc_admin='));
    if (match) {
      try {
        const value = decodeURIComponent(match.slice('tc_admin='.length));
        if (await verifyAdminSession(value, adminSecret)) return { via: 'secret' };
      } catch { /* malformed encoded cookie — fall through to null */ }
    }
  }

  return null;
}
