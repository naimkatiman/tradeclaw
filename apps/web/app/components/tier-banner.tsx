'use client';

import Link from 'next/link';
import { ShieldCheck, Crown, Lock, Sparkles } from 'lucide-react';
import { useUserSession } from '../../lib/hooks/use-user-tier';

/**
 * Compact, dismissible-free tier banner shown at the top of the dashboard.
 * Renders three faces:
 *  - Admin (email allowlist): shield + link to /admin
 *  - Pro (active sub or email grant): crown, no upgrade CTA
 *  - Free / anonymous: lock + upgrade CTA to /pricing
 *
 * The server has already filtered the signal payload by tier — this banner is
 * UX signal, not a gate. Loading state renders nothing to avoid layout shift.
 */
export function TierBanner() {
  const { status, session } = useUserSession();

  if (status === 'loading') return null;

  if (status === 'authenticated' && session?.isAdmin) {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="font-semibold text-emerald-400">ADMIN</span>
            <span className="text-zinc-500 hidden sm:inline">·</span>
            <span className="font-mono text-zinc-400 hidden sm:inline">{session.email}</span>
          </div>
          <Link
            href="/admin"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            Open Admin →
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && session?.tier && session.tier !== 'free') {
    return (
      <div className="border-b border-amber-500/20 bg-amber-500/[0.04] px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Crown size={14} className="text-amber-400" />
            <span className="font-semibold uppercase text-amber-400">{session.tier}</span>
            <span className="text-zinc-500 hidden sm:inline">·</span>
            <span className="text-zinc-400 hidden sm:inline">
              Real-time signals, all symbols, premium strategies unlocked
            </span>
          </div>
          <Link
            href="/dashboard/billing"
            className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/5"
          >
            Manage billing
          </Link>
        </div>
      </div>
    );
  }

  // Free or anonymous — same UX since both share the free signal payload.
  return (
    <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Lock size={14} className="text-zinc-500" />
          <span className="font-semibold text-zinc-400">FREE</span>
          <span className="text-zinc-600 hidden sm:inline">·</span>
          <span className="text-zinc-500 hidden sm:inline">
            Locked 15 min after publish, 6 symbols, last 7 days. Real-time on Pro.
          </span>
        </div>
        <Link
          href="/pricing?from=tier-banner"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400"
        >
          <Sparkles size={11} />
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
