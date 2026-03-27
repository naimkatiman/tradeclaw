'use client';

import { useState } from 'react';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface HintBadgeProps {
  label: string;
  className?: string;
}

/**
 * A small "?" badge that shows a tooltip on hover.
 * Only renders when NEXT_PUBLIC_DEMO_MODE=true.
 */
export function HintBadge({ label, className = '' }: HintBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!DEMO_MODE) return null;

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold flex items-center justify-center hover:bg-emerald-500/25 transition-colors shrink-0"
        aria-label={label}
        type="button"
      >
        ?
      </button>
      {open && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 leading-snug pointer-events-none z-50 shadow-xl"
          role="tooltip"
        >
          {label}
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
        </span>
      )}
    </span>
  );
}

/**
 * Wrapper that only renders children in demo mode.
 */
export function DemoOnly({ children }: { children: React.ReactNode }) {
  if (!DEMO_MODE) return null;
  return <>{children}</>;
}

/**
 * A floating info strip shown at the top of a page in demo mode,
 * providing a quick explanation of what the page does.
 */
interface PageHintProps {
  message: string;
}

export function PageHint({ message }: PageHintProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!DEMO_MODE || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 mx-4 mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-zinc-400">
      <div className="flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>{message}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-700 hover:text-zinc-500 transition-colors shrink-0"
        aria-label="Dismiss hint"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
