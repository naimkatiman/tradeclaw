'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export interface WinShareToastProps {
  symbol: string;
  pnlPct: number;
  onDismiss: () => void;
}

export function WinShareToast({ symbol, pnlPct, onDismiss }: WinShareToastProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const t = setTimeout(onDismiss, 12_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/track-record?utm_source=win-share`
    : 'https://tradeclaw.win/track-record';
  const tweet = `Just closed ${symbol} for +${pnlPct.toFixed(2)}% on TradeClaw\n\n${url}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 shadow-2xl backdrop-blur">
      <div className="text-sm font-semibold text-emerald-300 mb-1">Win — {symbol} +{pnlPct.toFixed(2)}%</div>
      <div className="text-xs text-zinc-300 mb-3">Brag about it. Free distribution.</div>
      <div className="flex gap-2">
        <a
          href={xHref}
          target="_blank"
          rel="noopener"
          className="flex-1 text-center text-xs font-mono py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25"
        >
          Share on X
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex-1 text-xs font-mono py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10"
        >
          {copied ? <><Check className="inline h-3 w-3" /> Copied</> : 'Copy link'}
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" className="px-2 text-zinc-500 hover:text-zinc-200">×</button>
      </div>
    </div>
  );
}
