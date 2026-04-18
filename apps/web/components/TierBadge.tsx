'use client';

import Link from 'next/link';
import { useUserTier } from '../lib/hooks/use-user-tier';

export interface TierBadgeProps {
  size?: 'sm' | 'md';
}

/**
 * Renders the signed-in user's tier as a pill. Returns null when the user
 * is not signed in. Pro/Elite/Custom link to /dashboard/billing; Free links
 * to /pricing so the CTA is always one click away.
 */
export function TierBadge({ size = 'sm' }: TierBadgeProps) {
  const tier = useUserTier();

  if (!tier) return null;

  const isFree = tier === 'free';
  const href = isFree ? '/pricing?from=badge' : '/dashboard/billing';

  const base =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider'
      : 'text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider';

  const style = isFree
    ? 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50'
    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]';

  return (
    <Link
      href={href}
      className={`${base} ${style} transition-colors`}
      aria-label={isFree ? 'Current plan: Free — upgrade' : `Current plan: ${tier}`}
    >
      {tier}
    </Link>
  );
}
