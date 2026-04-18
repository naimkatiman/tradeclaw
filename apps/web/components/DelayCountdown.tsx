'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Timer } from 'lucide-react';

export interface DelayCountdownProps {
  /** Signal timestamp in ms epoch (when the signal was generated). */
  signalTimestamp: number;
  /** Delay window in ms the free tier waits before the signal is revealed. */
  delayMs: number;
  /** Fires when the countdown reaches zero; parent can refetch. */
  onUnlock?: () => void;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Live countdown rendered when a free-tier user is waiting for the next
 * signal to clear the 15-min delay. Hides itself once unlocked and calls
 * onUnlock so the parent can refetch.
 */
export function DelayCountdown({
  signalTimestamp,
  delayMs,
  onUnlock,
}: DelayCountdownProps) {
  const unlockAt = signalTimestamp + delayMs;
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, unlockAt - Date.now()),
  );

  useEffect(() => {
    if (remaining <= 0) {
      onUnlock?.();
      return;
    }
    const id = window.setInterval(() => {
      const next = Math.max(0, unlockAt - Date.now());
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(id);
        onUnlock?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
    // onUnlock is stable from parents in our call sites; depending on it
    // would re-arm the interval on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockAt]);

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-emerald-300">
        <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Next free-tier signal unlocks in{' '}
          <span
            className="font-mono font-semibold tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatRemaining(remaining)}
          </span>
        </span>
      </div>
      <Link
        href="/pricing?from=delay"
        className="shrink-0 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
      >
        Upgrade for real-time
      </Link>
    </div>
  );
}
