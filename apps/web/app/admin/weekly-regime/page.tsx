import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, ChevronLeft, Lock } from 'lucide-react';
import { requireAdmin } from '../../../lib/admin-gate';
import { getCurrentWeeklyRegime } from '../../../lib/weekly-regime/service';
import { WeeklyRegimeClient } from './WeeklyRegimeClient';

export const metadata: Metadata = {
  title: 'Weekly Regime | Admin | TradeClaw',
  description: 'Set the weekly directional bias per asset class.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

export default async function WeeklyRegimePage() {
  await requireAdmin();
  const card = await getCurrentWeeklyRegime().catch(() => null);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ChevronLeft size={14} />
          Back to admin
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <CalendarClock size={20} className="text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Set Weekly Regime</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Set a directional bias and conviction per asset class for the week. Each row is
          classified TRENDING or NEUTRAL live. Confirm before Monday 12:00 (Asia/Kuala_Lumpur);
          writes after the cutoff need an override with a reason.
        </p>

        {card && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-400">
            <span>
              Week of <span className="font-mono text-zinc-200">{card.week_start}</span>
            </span>
            <span>
              Set by <span className="font-mono text-zinc-200">{card.set_by}</span>
            </span>
            <span>
              At <span className="font-mono text-zinc-200">{formatTimestamp(card.set_at)}</span>
            </span>
            {card.locked && (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Lock size={12} />
                Locked
                {card.override_used && ' (override used)'}
              </span>
            )}
          </div>
        )}

        <div className="mt-6">
          <WeeklyRegimeClient initialCard={card} />
        </div>
      </div>
    </main>
  );
}
