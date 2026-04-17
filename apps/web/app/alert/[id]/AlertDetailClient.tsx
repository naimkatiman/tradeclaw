'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy, Check, Share2, Bell, TrendingUp, TrendingDown,
  ChevronRight, Star,
} from 'lucide-react';
import type { TradingSignal } from '../../lib/signals';
import { QRCode } from './qr-code';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';

interface Props {
  signal: TradingSignal;
  id: string;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

export function AlertDetailClient({ signal, id }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const pageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/alert/${id}`
      : `https://tradeclaw.com/alert/${id}`;

  const signalText = [
    `📊 ${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
    `Entry: ${formatPrice(signal.entry)}`,
    `SL: ${formatPrice(signal.stopLoss)} | TP1: ${formatPrice(signal.takeProfit1)}`,
    `RSI: ${signal.indicators.rsi.value.toFixed(1)}`,
    ``,
    `Free AI signal via TradeClaw 🤖`,
    pageUrl,
  ].join('\n');

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(signalText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(
    `${signal.symbol} ${signal.direction} ${signal.confidence}% confidence — TradeClaw AI Signal`
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence\n\nFree AI trading signal via TradeClaw 🤖`
  )}&url=${encodeURIComponent(pageUrl)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBuy = signal.direction === 'BUY';

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-[#050505] text-white pb-24">
      <BackgroundDecor variant="minimal" />
      {/* Signal hero card */}
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Direction + pair header */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
                {signal.symbol}
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold tracking-wider ${
                  isBuy
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                }`}>
                  {isBuy ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {signal.direction}
                </span>
                <span className="text-zinc-500 text-sm font-mono">{signal.timeframe}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold font-mono tabular-nums ${
                signal.confidence >= 80 ? 'text-emerald-400'
                  : signal.confidence >= 65 ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {signal.confidence}%
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">confidence</div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="h-1 w-full rounded-full bg-white/5 mb-5">
            <div
              className="h-1 rounded-full transition-all duration-700"
              style={{
                width: `${signal.confidence}%`,
                background: signal.confidence >= 80 ? '#10B981'
                  : signal.confidence >= 65 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Entry', value: signal.entry, color: 'text-white' },
              { label: 'Stop Loss', value: signal.stopLoss, color: 'text-red-400' },
              { label: 'TP1', value: signal.takeProfit1, color: 'text-emerald-400' },
              { label: 'TP2', value: signal.takeProfit2, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl py-2.5 px-3 border border-white/5">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</div>
                <div className={`text-sm font-mono font-semibold tabular-nums ${color}`}>
                  {formatPrice(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Key indicators */}
          <div className="border-t border-white/5 pt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">RSI</div>
              <div className={`text-sm font-mono font-semibold ${
                signal.indicators.rsi.signal === 'oversold' ? 'text-emerald-400'
                  : signal.indicators.rsi.signal === 'overbought' ? 'text-red-400'
                  : 'text-zinc-300'
              }`}>
                {signal.indicators.rsi.value.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">MACD</div>
              <div className={`text-sm font-mono font-semibold ${
                signal.indicators.macd.signal === 'bullish' ? 'text-emerald-400'
                  : signal.indicators.macd.signal === 'bearish' ? 'text-red-400'
                  : 'text-zinc-300'
              }`}>
                {signal.indicators.macd.signal.slice(0, 4).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">EMA</div>
              <div className={`text-sm font-mono font-semibold ${
                signal.indicators.ema.trend === 'up' ? 'text-emerald-400'
                  : signal.indicators.ema.trend === 'down' ? 'text-red-400'
                  : 'text-zinc-300'
              }`}>
                {signal.indicators.ema.trend.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Share2 className="h-3 w-3" />
            Share Alert
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold
                bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
            >
              {/* WhatsApp icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold
                bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-[#2AABEE] hover:bg-[#2AABEE]/20 transition-colors"
            >
              {/* Telegram icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold
                bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 text-[#1d9bf0] hover:bg-[#1d9bf0]/20 transition-colors"
            >
              {/* X/Twitter icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold
                bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* QR Code section */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              {/* QR icon */}
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4m-4-4v4m-3-7h7"/>
              </svg>
              QR Code
            </span>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showQR ? 'rotate-90' : ''}`} />
          </button>

          {showQR && (
            <div className="mt-4 flex flex-col items-center">
              <p className="text-xs text-zinc-500 text-center mb-4">
                Scan to open this signal on any device
              </p>
              <QRCode url={pageUrl} size={200} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 mb-6">
          <Link
            href={`/alerts`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-xl
              bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
              hover:bg-emerald-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-semibold">Set Price Alert</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>

          <Link
            href={`/signal/${id}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-xl
              bg-white/5 border border-white/10 text-zinc-300
              hover:bg-white/10 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">Full Analysis</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* GitHub star CTA */}
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="text-xs text-zinc-500 mb-3">
            TradeClaw is free &amp; open source
          </div>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-white/5 border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10
              transition-colors"
          >
            <Star className="h-4 w-4 text-yellow-400" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
