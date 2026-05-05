'use client';

import { useMemo } from 'react';

interface ShareOnXProps {
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
 * Pre-filled X (Twitter) share button for the public track-record. Turns every
 * winning week into free acquisition by linking to the verifiable embed view.
 */
export function ShareOnX({ winRate, resolved, period = 'recent', label = 'Share on X' }: ShareOnXProps) {
  const href = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win';
    const url = `${origin}/track-record?utm_source=x&utm_medium=share&utm_campaign=track_record&period=${encodeURIComponent(period)}`;
    const text =
      typeof winRate === 'number' && typeof resolved === 'number' && resolved > 0
        ? `TradeClaw posted ${winRate}% win rate across ${resolved} resolved signals — every trade is timestamped and verifiable. Check the live record:`
        : 'I track every TradeClaw signal in public — wins, losses, and gate-refused setups. Verify it yourself:';
    const params = new URLSearchParams({ text, url });
    return `https://x.com/intent/post?${params.toString()}`;
  }, [winRate, resolved, period]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="share-on-x"
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      aria-label="Share track record on X"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        className="fill-current"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
