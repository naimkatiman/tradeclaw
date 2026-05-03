'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useUserSession } from '../../lib/hooks/use-user-tier';
import { PAST_DUE_GRACE_DAYS } from '../../lib/tier-client';

/**
 * Red banner shown above the dashboard when the user's last invoice failed.
 *
 * Renders nothing unless `subscriptionStatus === 'past_due'`. During Stripe's
 * 7-day grace window the user keeps Pro access, so the tier banner still
 * shows their tier — this component layers a separate, more urgent prompt
 * on top.
 *
 * CTA opens the Stripe billing portal where the customer can update their
 * default payment method (the dunning email already gives them the
 * one-click hosted_invoice_url for the specific failed invoice).
 */
export function PastDueBanner() {
  const { status, session } = useUserSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'authenticated') return null;
  if (session?.subscriptionStatus !== 'past_due') return null;

  const graceDeadline = computeGraceDeadline(session.currentPeriodEnd);

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
    <div className="border-b border-red-500/30 bg-red-500/[0.08] px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle size={14} className="shrink-0 text-red-400" />
          <span className="font-semibold uppercase text-red-400">Payment failed</span>
          <span className="text-zinc-500 hidden sm:inline">·</span>
          <span className="text-zinc-300 hidden sm:inline">
            Update your card{graceDeadline ? ` before ${graceDeadline}` : ''} to keep Pro access.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-[11px] text-red-400">{error}</span>}
          <button
            type="button"
            onClick={openPortal}
            disabled={loading}
            className="rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-400 disabled:opacity-50"
          >
            {loading ? 'Opening…' : 'Update payment method'}
          </button>
        </div>
      </div>
    </div>
  );
}

function computeGraceDeadline(currentPeriodEndIso: string | null): string | null {
  if (!currentPeriodEndIso) return null;
  const periodEnd = new Date(currentPeriodEndIso);
  if (Number.isNaN(periodEnd.getTime())) return null;
  const deadline = new Date(periodEnd.getTime() + PAST_DUE_GRACE_DAYS * 86400 * 1000);
  return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
