'use client';

import { useState, useRef, useEffect } from 'react';
import type { TradingSignal } from '../lib/signals';

function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

type ExportFormat = 'telegram' | 'discord' | 'tradingview' | 'mt5' | 'webhook';

function generateTelegramMessage(s: TradingSignal): string {
  const emoji = s.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
  return [
    `${emoji} *${s.direction} ${s.symbol}*  \\[${s.confidence}%\\]`,
    `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
    `\u25B8 Entry    ${formatPrice(s.entry)}`,
    `\u25B8 SL       ${formatPrice(s.stopLoss)}`,
    `\u25B8 TP1      ${formatPrice(s.takeProfit1)}`,
    `\u25B8 TP2      ${formatPrice(s.takeProfit2)}`,
    `\u25B8 TP3      ${formatPrice(s.takeProfit3)}`,
    ``,
    `RSI: ${s.indicators.rsi.value.toFixed(0)} | MACD: ${s.indicators.macd.signal} | Trend: ${s.indicators.ema.trend}`,
    `TF: ${s.timeframe} | Confidence: ${s.confidence}%`,
    ``,
    `_via TradeClaw \u2014 tradeclaw.win_`,
  ].join('\n');
}

function generateDiscordEmbed(s: TradingSignal): string {
  return JSON.stringify({
    embeds: [{
      title: `${s.direction} ${s.symbol} — ${s.confidence}% confidence`,
      color: s.direction === 'BUY' ? 0x10b981 : 0xef4444,
      fields: [
        { name: 'Entry', value: formatPrice(s.entry), inline: true },
        { name: 'Stop Loss', value: formatPrice(s.stopLoss), inline: true },
        { name: 'TP1', value: formatPrice(s.takeProfit1), inline: true },
        { name: 'TP2', value: formatPrice(s.takeProfit2), inline: true },
        { name: 'TP3', value: formatPrice(s.takeProfit3), inline: true },
        { name: 'Timeframe', value: s.timeframe, inline: true },
        { name: 'RSI', value: String(s.indicators.rsi.value.toFixed(0)), inline: true },
        { name: 'MACD', value: s.indicators.macd.signal, inline: true },
        { name: 'Trend', value: s.indicators.ema.trend, inline: true },
      ],
      footer: { text: 'TradeClaw — tradeclaw.win' },
      timestamp: s.timestamp,
    }],
  }, null, 2);
}

function generateTradingViewAlert(s: TradingSignal): string {
  return JSON.stringify({
    symbol: s.symbol,
    action: s.direction,
    price: s.entry,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit1,
    confidence: s.confidence,
    timeframe: s.timeframe,
    message: `${s.direction} ${s.symbol} @ ${formatPrice(s.entry)} | SL ${formatPrice(s.stopLoss)} | TP ${formatPrice(s.takeProfit1)} | ${s.confidence}% conf`,
  }, null, 2);
}

function generateMT5Json(s: TradingSignal): string {
  return JSON.stringify({
    action: s.direction === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol: s.symbol,
    price: s.entry,
    sl: s.stopLoss,
    tp: s.takeProfit1,
    volume: 0.01,
    deviation: 10,
    magic: 202604,
    comment: `TC|${s.confidence}%|${s.timeframe}`,
    type_filling: 'ORDER_FILLING_IOC',
  }, null, 2);
}

function generateWebhookPayload(s: TradingSignal): string {
  return JSON.stringify({
    event: 'signal',
    signal: {
      id: s.id,
      symbol: s.symbol,
      direction: s.direction,
      confidence: s.confidence,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfit1: s.takeProfit1,
      takeProfit2: s.takeProfit2,
      takeProfit3: s.takeProfit3,
      timeframe: s.timeframe,
      indicators: {
        rsi: s.indicators.rsi.value,
        macd: s.indicators.macd.signal,
        trend: s.indicators.ema.trend,
      },
    },
    timestamp: s.timestamp,
  }, null, 2);
}

const FORMATS: { key: ExportFormat; label: string; icon: string; description: string }[] = [
  { key: 'telegram', label: 'Telegram', icon: '\u2708', description: 'Formatted message for Telegram bots/channels' },
  { key: 'discord', label: 'Discord', icon: '\u{1F3AE}', description: 'Discord webhook embed JSON' },
  { key: 'tradingview', label: 'TradingView', icon: '\u{1F4CA}', description: 'TradingView alert webhook JSON' },
  { key: 'mt5', label: 'MT5 JSON', icon: '\u{1F4B9}', description: 'MetaTrader 5 compatible order JSON' },
  { key: 'webhook', label: 'Webhook', icon: '\u{1F517}', description: 'Generic webhook payload' },
];

function getExportContent(format: ExportFormat, signal: TradingSignal): string {
  switch (format) {
    case 'telegram': return generateTelegramMessage(signal);
    case 'discord': return generateDiscordEmbed(signal);
    case 'tradingview': return generateTradingViewAlert(signal);
    case 'mt5': return generateMT5Json(signal);
    case 'webhook': return generateWebhookPayload(signal);
  }
}

interface SignalExportMenuProps {
  signal: TradingSignal;
}

export function SignalExportMenu({ signal }: SignalExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCopy = async (format: ExportFormat, e: React.MouseEvent) => {
    e.stopPropagation();
    const content = getExportContent(format, signal);
    await navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="Export signal"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border border-[var(--border)] bg-zinc-900/98 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-white/[0.05]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Export / Copy as</span>
          </div>
          {FORMATS.map(({ key, label, icon, description }) => (
            <button
              key={key}
              onClick={(e) => handleCopy(key, e)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors group"
            >
              <span className="text-sm w-5 text-center shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-[var(--foreground)] font-medium">
                  {copied === key ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    label
                  )}
                </div>
                <div className="text-[9px] text-zinc-600 truncate">{description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
