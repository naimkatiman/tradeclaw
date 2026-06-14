'use client';

import { useMemo } from 'react';

interface ShareLinkedInProps {
  /** Win rate %, e.g. 62. Omit to use a generic message. */
  winRate?: number;
  /** Resolved-trade count over the same period as winRate. */
  resolved?: number;
  /** Period label (e.g. "7d", "30d") used in copy and as a UTM tag. */
  period?: string;
  /** Override label. */
  label?: string;
}

/**
 * Pre-filled LinkedIn share button for the public track-record. Opens the
 * LinkedIn feed composer with pre-filled text so visitors can share verified
 * performance stats with one click.
 */
export function ShareLinkedIn({
  winRate,
  resolved,
  period = 'recent',
  label = 'Share on LinkedIn',
}: ShareLinkedInProps) {
  const href = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win';
    const url = `${origin}/track-record?utm_source=linkedin&utm_medium=share&utm_campaign=track_record&period=${encodeURIComponent(period)}`;
    const text =
      typeof winRate === 'number' && typeof resolved === 'number' && resolved > 0
        ? `TradeClaw posted a ${winRate}% win rate across ${resolved} resolved signals — every trade is timestamped and verifiable.\n\nTransparent AI trading signals, open-source and self-hosted:\n${url}`
        : `I track every TradeClaw signal in public — wins, losses, and gate-refused setups. Verify it yourself:\n${url}`;
    return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  }, [winRate, resolved, period]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="share-on-linkedin"
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      aria-label="Share track record on LinkedIn"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        className="fill-current"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
