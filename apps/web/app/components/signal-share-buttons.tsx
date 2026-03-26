'use client';

import { useState } from 'react';
import type { TradingSignal } from '../lib/signals';

interface Props {
  signal: TradingSignal;
  signalPath: string;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

export function SignalShareButtons({ signal, signalPath }: Props) {
  const [copied, setCopied] = useState(false);

  const getFullUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}${signalPath}`
      : `https://tradeclaw.com${signalPath}`;

  const tweetText = [
    `${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
    `Entry: ${formatPrice(signal.entry)}`,
    `SL: ${formatPrice(signal.stopLoss)} | TP1: ${formatPrice(signal.takeProfit1)}`,
    ``,
    `Free AI trading signal via TradeClaw`,
  ].join('\n');

  const getTwitterUrl = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(getFullUrl())}`;

  const getTelegramUrl = () =>
    `https://t.me/share/url?url=${encodeURIComponent(getFullUrl())}&text=${encodeURIComponent(
      `${signal.symbol} ${signal.direction} ${signal.confidence}% confidence — TradeClaw AI Signal`
    )}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getFullUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">Share Signal</div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <a
          href={getTwitterUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors
            bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 text-[#1d9bf0] hover:bg-[#1d9bf0]/20"
        >
          Share on X
        </a>
        <a
          href={getTelegramUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors
            bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc]/20"
        >
          Share on Telegram
        </a>
        <button
          onClick={handleCopyLink}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors
            bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
