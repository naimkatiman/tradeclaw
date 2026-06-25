import type { Metadata } from 'next';
import { requireAdmin } from '../../../../lib/admin-gate';
import { MemoryClient } from './memory-client';

export const metadata: Metadata = {
  title: 'Operator Memory | TradeClaw Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OperatorMemoryPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-white">Operator Memory</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Key-value store scoped to the current admin user.
        </p>
        <div className="mt-6">
          <MemoryClient />
        </div>
      </div>
    </main>
  );
}
