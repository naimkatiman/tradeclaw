'use client';

import { useState } from 'react';
import { Check, Flame } from 'lucide-react';

export interface WinStreakCardProps {
  streak: number;
  totalPnlPct: number;
  onDismiss: () => void;
}

export function WinStreakCard({ streak, totalPnlPct, onDismiss }: WinStreakCardProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/track-record?utm_source=win-streak-${streak}`
    : 'https://tradeclaw.win/track-record';
  const tweet = `${streak} paper trades in a row, +${totalPnlPct.toFixed(2)}% combined.\n\nReceipts: ${url}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onDismiss}>
      <div className="max-w-md w-full bg-[#0d0d0d] border border-emerald-500/30 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-emerald-300 mb-3">
          <Flame className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{streak}-trade win streak</h2>
        </div>
        <div className="text-sm text-zinc-300 mb-4">+{totalPnlPct.toFixed(2)}% combined PnL. Share the receipt before the next trade.</div>
        <div className="flex gap-2">
          <a href={xHref} target="_blank" rel="noopener" className="flex-1 text-center py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/25">
            Share on X
          </a>
          <button onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-200 text-sm font-semibold hover:bg-white/10">
            {copied ? <><Check className="inline h-3.5 w-3.5" /> Copied</> : 'Copy link'}
          </button>
        </div>
        <button onClick={onDismiss} className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300">Dismiss</button>
      </div>
    </div>
  );
}
