import { Lock } from 'lucide-react';

export interface LockedTPProps {
  /** TP level being masked (2 or 3). */
  level: 2 | 3;
  /** Legacy call-site tag; kept so existing call sites compile until Phase 2. */
  from?: string;
}

/**
 * Inline row stub shown in place of a hidden TP2/TP3 value for free users.
 * Static — nothing is for sale, so it no longer links to a checkout flow.
 */
export function LockedTP({ level }: LockedTPProps) {
  return (
    <span
      aria-label={`Take profit ${level} is locked`}
      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-400"
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      <span>{`TP${level} locked`}</span>
    </span>
  );
}
