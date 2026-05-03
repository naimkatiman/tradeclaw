'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useUserSession } from '../../lib/hooks/use-user-tier';

/**
 * Amber banner shown above the dashboard during a Stripe trial. Tells the
 * user how many days remain before the auto-charge fires and links into the
 * billing portal. Pairs with the day-6 reminder email — the email catches
 * users who don't open the app, this surface catches users who do.
 *
 * Renders nothing unless `subscriptionStatus === 'trialing'` and `trialEnd`
 * is in the future.
 */
export function TrialCountdown() {
  const { status, session } = useUserSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'authenticated') return null;
  if (session?.subscriptionStatus !== 'trialing' || !session.trialEnd) return null;

  const trialEnd = new Date(session.trialEnd);
  const remaining = describeRemaining(trialEnd);
  if (!remaining) return null;

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not open billing portal');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not open billing portal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Clock size={14} className="shrink-0 text-amber-400" />
          <span className="font-semibold uppercase text-amber-400">Trial</span>
          <span className="text-zinc-500 hidden sm:inline">·</span>
          <span className="text-zinc-300 hidden sm:inline">
            {remaining}. Auto-converts to paid — cancel anytime.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-[11px] text-red-400">{error}</span>}
          <button
            type="button"
            onClick={openPortal}
            disabled={loading}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function describeRemaining(trialEnd: Date): string | null {
  const ms = trialEnd.getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Trial ends today';
  const days = Math.round(hours / 24);
  if (days === 1) return 'Trial ends tomorrow';
  return `Trial ends in ${days} days`;
}
