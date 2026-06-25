import type { Metadata } from 'next';
import { requireAdmin } from '../../../../lib/admin-gate';
import { InsightsClient } from './insights-client';

export const metadata: Metadata = {
  title: 'Signal Insights | TradeClaw Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-white">Signal Insights</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Accuracy trends, symbol breakdown, and improvement recommendations.
        </p>
        <InsightsClient />
      </div>
    </main>
  );
}
