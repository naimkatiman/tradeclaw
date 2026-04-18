'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

export interface LockedTPProps {
  /** TP level being masked (2 or 3). */
  level: 2 | 3;
  /** Optional call-site tag, appended to the upgrade CTA for analytics. */
  from?: string;
}

/**
 * Inline row stub shown in place of a hidden TP2/TP3 value for free users.
 * Clicks through to /pricing with a source tag.
 */
export function LockedTP({ level, from }: LockedTPProps) {
  const qs = new URLSearchParams({ from: from ? `tp${level}-${from}` : `tp${level}` });
  return (
    <Link
      href={`/pricing?${qs.toString()}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/15 transition-colors"
      aria-label={`Take profit ${level} requires Pro — upgrade`}
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      <span>Pro — unlock TP{level}</span>
    </Link>
  );
}
