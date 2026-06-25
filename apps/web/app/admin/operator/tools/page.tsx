import type { Metadata } from 'next';
import { requireAdmin } from '../../../../lib/admin-gate';
import { ToolsClient } from './tools-client';

export const metadata: Metadata = {
  title: 'Tools Registry | TradeClaw Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ToolsRegistryPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-white">Tools Registry</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Indicators, signal engines, and connectors. Toggle enable/disable.
        </p>
        <div className="mt-6">
          <ToolsClient />
        </div>
      </div>
    </main>
  );
}
