'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DISMISSED_KEY = 'tc_demo_banner_dismissed';

export function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      try {
        if (!localStorage.getItem(DISMISSED_KEY)) {
          setVisible(true);
        }
      } catch { /* localStorage unavailable */ }
    }, 0);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div className="relative flex items-center justify-between px-4 h-10 bg-zinc-950 border-b border-emerald-500/30 z-[100] shrink-0">
      <div className="flex items-center gap-2 text-sm text-zinc-300 min-w-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="truncate">
          Live Demo — Explore TradeClaw with sample data. No signup required.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <Link
          href="/docs/installation"
          className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium whitespace-nowrap"
        >
          Deploy Your Own
        </Link>
        <button
          onClick={dismiss}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label="Dismiss banner"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
