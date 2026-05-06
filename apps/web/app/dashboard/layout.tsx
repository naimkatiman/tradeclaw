import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { readSessionFromCookies } from '../../lib/user-session';

function safeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await readSessionFromCookies();
  if (session?.userId) return <>{children}</>;

  const cookieStore = await cookies();
  const adminSecret = process.env.ADMIN_SECRET;
  const cookieValue = cookieStore.get('tc_admin')?.value;
  if (adminSecret && cookieValue && safeStringEqual(cookieValue, adminSecret)) {
    return <>{children}</>;
  }

  redirect('/signin?next=%2Fdashboard');
}
