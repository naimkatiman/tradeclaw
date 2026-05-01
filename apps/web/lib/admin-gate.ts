import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readSessionFromCookies } from './user-session';
import { getUserById } from './db';
import { isAdminEmail } from './admin-emails';

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
  if (adminSecret && cookieStore.get('tc_admin')?.value === adminSecret) {
    return { via: 'secret' };
  }

  redirect('/admin/login');
}
