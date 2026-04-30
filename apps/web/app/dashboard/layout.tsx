import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readSessionFromCookies } from '../../lib/user-session';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await readSessionFromCookies();
  if (session?.userId) return <>{children}</>;

  const cookieStore = await cookies();
  const adminSecret = process.env.ADMIN_SECRET;
  const hasAdminCookie =
    !!adminSecret && cookieStore.get('tc_admin')?.value === adminSecret;
  if (hasAdminCookie) return <>{children}</>;

  redirect('/signin?next=%2Fdashboard');
}
