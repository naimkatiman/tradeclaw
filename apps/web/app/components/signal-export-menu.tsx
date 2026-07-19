'use client';

import { useState, useRef, useEffect } from 'react';
import type { TradingSignal } from '../lib/signals';
import { useLocale } from './locale-provider';
import { formatMessage } from '../../lib/product-i18n/format';
import {
  getDashboardEvidenceTranslations,
  type DashboardEvidenceTranslations,
} from '../../lib/product-i18n/dashboard-evidence';

function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

type ExportFormat = 'telegram' | 'discord' | 'tradingview' | 'mt5' | 'webhook';
type ExportCopy = DashboardEvidenceTranslations['export'];

function generateTelegramMessage(s: TradingSignal, copy: ExportCopy): string {
  const emoji = s.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
  return [
    `${emoji} *${s.direction} ${s.symbol}*  \\[${formatMessage(copy.message.headline, { score: s.confidence })}\\]`,
    `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
    `\u25B8 ${copy.message.entry}    ${formatPrice(s.entry)}`,
    `\u25B8 ${copy.message.stopLoss}       ${formatPrice(s.stopLoss)}`,
    `\u25B8 TP1      ${formatPrice(s.takeProfit1)}`,
    `\u25B8 TP2      ${formatPrice(s.takeProfit2)}`,
    `\u25B8 TP3      ${formatPrice(s.takeProfit3)}`,
    ``,
    `RSI: ${s.indicators.rsi.value.toFixed(0)} | MACD: ${s.indicators.macd.signal} | ${copy.message.trend}: ${s.indicators.ema.trend}`,
    `${copy.message.timeframe}: ${s.timeframe} | ${formatMessage(copy.message.scoreLine, { score: s.confidence })}`,
    ``,
    `_${copy.message.via}_`,
  ].join('\n');
}

function generateDiscordEmbed(s: TradingSignal, copy: ExportCopy): string {
  return JSON.stringify({
    embeds: [{
      title: `${s.direction} ${s.symbol} — ${formatMessage(copy.message.headline, { score: s.confidence })}`,
      color: s.direction === 'BUY' ? 0x10b981 : 0xef4444,
      fields: [
        { name: copy.message.entry, value: formatPrice(s.entry), inline: true },
        { name: copy.message.stopLoss, value: formatPrice(s.stopLoss), inline: true },
        { name: 'TP1', value: formatPrice(s.takeProfit1), inline: true },
        { name: 'TP2', value: formatPrice(s.takeProfit2), inline: true },
        { name: 'TP3', value: formatPrice(s.takeProfit3), inline: true },
        { name: copy.message.timeframe, value: s.timeframe, inline: true },
        { name: 'RSI', value: String(s.indicators.rsi.value.toFixed(0)), inline: true },
        { name: 'MACD', value: s.indicators.macd.signal, inline: true },
        { name: copy.message.trend, value: s.indicators.ema.trend, inline: true },
      ],
      footer: { text: 'TradeClaw — tradeclaw.win' },
      timestamp: s.timestamp,
    }],
  }, null, 2);
}

function generateTradingViewAlert(s: TradingSignal, copy: ExportCopy): string {
  return JSON.stringify({
    symbol: s.symbol,
    action: s.direction,
    price: s.entry,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit1,
    confidence: s.confidence,
    timeframe: s.timeframe,
    message: `${s.direction} ${s.symbol} @ ${formatPrice(s.entry)} | SL ${formatPrice(s.stopLoss)} | TP ${formatPrice(s.takeProfit1)} | ${formatMessage(copy.message.headline, { score: s.confidence })}`,
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
    comment: `TC|score=${s.confidence}/100|${s.timeframe}`,
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

const FORMATS: { key: ExportFormat; label: string; icon: string }[] = [
  { key: 'telegram', label: 'Telegram', icon: '\u2708' },
  { key: 'discord', label: 'Discord', icon: '\u{1F3AE}' },
  { key: 'tradingview', label: 'TradingView', icon: '\u{1F4CA}' },
  { key: 'mt5', label: 'MT5 JSON', icon: '\u{1F4B9}' },
  { key: 'webhook', label: 'Webhook', icon: '\u{1F517}' },
];

function getExportContent(format: ExportFormat, signal: TradingSignal, copy: ExportCopy): string {
  switch (format) {
    case 'telegram': return generateTelegramMessage(signal, copy);
    case 'discord': return generateDiscordEmbed(signal, copy);
    case 'tradingview': return generateTradingViewAlert(signal, copy);
    case 'mt5': return generateMT5Json(signal);
    case 'webhook': return generateWebhookPayload(signal);
  }
}

interface SignalExportMenuProps {
  signal: TradingSignal;
}

export function SignalExportMenu({ signal }: SignalExportMenuProps) {
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).export;
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
    const content = getExportContent(format, signal, copy);
    await navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title={copy.title}
        aria-label={copy.title}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
      >
        <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {copy.button}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-1 z-30 w-64 rounded-xl border border-[var(--border)] bg-zinc-900/98 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-white/[0.05]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-mono">{copy.heading}</span>
          </div>
          {FORMATS.map(({ key, label, icon }) => (
            <button
              key={key}
              role="menuitem"
              onClick={(e) => handleCopy(key, e)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-start hover:bg-white/[0.05] transition-colors group"
            >
              <span aria-hidden="true" className="text-sm w-5 text-center shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-[var(--foreground)] font-medium">
                  {copied === key ? (
                    <span className="text-emerald-400">{copy.copied}</span>
                  ) : (
                    <bdi dir="ltr">{label}</bdi>
                  )}
                </div>
                <div className="text-[9px] text-zinc-600 leading-snug">{copy.descriptions[key]}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
