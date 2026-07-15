import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '../../lib/admin-gate';

export const metadata: Metadata = {
  title: 'Execution Ledger | TradeClaw Admin',
  description: 'Admin-only execution rows persisted by the configured execution adapter.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ExecutionPage() {
  await requireAdmin();
  redirect('/admin/executions');
}
