'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SetAlertButtonProps {
  symbol: string;
  currentPrice: number;
}

export function SetAlertButton({ symbol, currentPrice }: SetAlertButtonProps) {
  const [saved, setSaved] = useState(false);

  function handleClick() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const href = `/alerts?symbol=${encodeURIComponent(symbol)}&price=${currentPrice}`;

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-xs font-semibold hover:bg-zinc-500/15 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {saved ? 'Going to Alerts…' : 'Set Alert'}
    </Link>
  );
}
