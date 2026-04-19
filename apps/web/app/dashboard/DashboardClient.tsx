'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';
import { LiveTicker } from '../../components/live-ticker';
import { SignalToast } from '../../components/signal-toast';
import { ConnectionStatus } from '../../components/connection-status';
import { GuidedTourListener, TakeTourButton } from '../../components/guided-tour';
import { StarsWidget } from '../../components/stars-widget';
import { HintBadge } from '../../components/feature-highlights';
import { VisitStreak } from '../../components/visit-streak';
import { GateStateBadge } from '../../components/GateStateBadge';
import { ReEngagementBanner } from '../../components/re-engagement-banner';
import { SignalChart } from '../components/charts';
import { generateBars } from '../lib/chart-utils';
import { SYMBOLS } from '../lib/symbol-config';
import { DataSourceBadge, getDataSource, formatSignalTimestamp, shortSignalId } from '../components/data-source-badge';
import { AccuracyStatsBar } from '../components/accuracy-stats-bar';
import { AccuracyMeta } from '../components/accuracy-meta';
import { SignalExportMenu } from '../components/signal-export-menu';
import StrategyAccessBar from '../components/StrategyAccessBar';
import { LockedTP } from '../../components/LockedTP';
import { PremiumSignalFeed } from '../../components/PremiumSignalFeed';
import { fetchWithLicense } from '../../lib/license-client';
import { usePriceStream } from '../../lib/hooks/use-price-stream';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';
import type { TradingSignal } from '@tradeclaw/signals';
import type { TFDirection } from '../lib/signal-generator';
import { OnboardingOverlay } from '../components/onboarding-overlay';
import { markStepDone } from '@/lib/onboarding-state';

const TICKER_PAIRS = ['BTCUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'ETHUSD', 'XAGUSD'];

function OnboardingBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const dismissed = localStorage.getItem('tc_onboarding_dismissed');
      const tourDone = localStorage.getItem('tc_tour_done');
      return !dismissed && !tourDone;
    } catch { return false; }
  });

  if (!visible) return null;
  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem('tc_onboarding_dismissed', '1'); } catch { /* ignore */ }
  };
  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-400 mb-1.5">3 steps to start trading:</p>
          <ol className="text-xs text-[var(--text-secondary)] space-y-1 font-mono list-decimal list-inside">
            <li><span className="text-emerald-400">See live signals</span> — <span className="text-emerald-400">BUY</span>/<span className="text-red-400">SELL</span> with confidence score. 70%+ signals are shown first, 50–69% appear as potential setups.</li>
            <li><span className="text-emerald-400">Click any signal</span> — see entry, TP, SL, and full indicator breakdown (RSI, MACD, EMA, S/R).</li>
            <li><span className="text-emerald-400">Self-host in 2 min</span> — <code className="bg-white/5 px-1.5 py-0.5 rounded text-emerald-400">docker compose up -d</code> and run your own signal engine.</li>
          </ol>
        </div>
        <button onClick={dismiss} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const DEFAULT_TITLE = 'TradeClaw — Live Signals';
const BUY_CONFIDENCE_THRESHOLD = 70;

const TIMEFRAMES = ['ALL', 'M5', 'M15', 'H1', 'H4', 'D1'];


const ASSET_CLASSES = {
  ALL: [
    'XAUUSD', 'XAGUSD',
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD',
    'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'ATOMUSD',
    'UNIUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
    'OPUSD', 'FILUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'TIAUSD',
    'RENDERUSD', 'FETUSD', 'AAVEUSD', 'PEPEUSD', 'SHIBUSD', 'WIFUSD',
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
  ],
  CRYPTO: [
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD',
    'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'ATOMUSD',
    'UNIUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
    'OPUSD', 'FILUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'TIAUSD',
    'RENDERUSD', 'FETUSD', 'AAVEUSD', 'PEPEUSD', 'SHIBUSD', 'WIFUSD',
  ],
  FOREX: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'],
  METALS: ['XAUUSD', 'XAGUSD'],
};

type AssetClass = keyof typeof ASSET_CLASSES;

function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return direction === 'BUY' ? (
    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 tracking-wider">
      BUY
    </span>
  ) : (
    <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/20 tracking-wider">
      SELL
    </span>
  );
}

function ConfidenceBar({ value, showExplainer = false }: { value: number; showExplainer?: boolean }) {
  const color = value >= 80 ? '#10B981' : value >= 65 ? '#a1a1aa' : '#EF4444';
  const explainer = value >= 80
    ? 'Strong signal — high indicator confluence'
    : value >= 65
      ? 'Moderate signal — partial indicator agreement'
      : 'Weak signal — limited confluence';
  return (
    <div>
      <div className="relative h-1 w-full rounded-full bg-[var(--glass-bg)]">
        <div
          className="absolute h-1 rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      {showExplainer && (
        <p className="text-[9px] text-[var(--text-secondary)] mt-1 font-mono">{explainer}</p>
      )}
    </div>
  );
}

// ─── TF Badges ───────────────────────────────────────────────

function TFBadgeInline({ tf }: { tf: TFDirection }) {
  const arrow = tf.direction === 'BUY' ? '▲' : tf.direction === 'SELL' ? '▼' : '●';
  const color =
    tf.direction === 'BUY' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/8' :
    tf.direction === 'SELL' ? 'text-rose-400 border-rose-500/25 bg-rose-500/8' :
    'text-zinc-400 border-zinc-500/25 bg-zinc-500/8';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${color} tabular-nums`}>
      {tf.timeframe}{arrow}
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <span className="h-1 w-1 rounded-full bg-emerald-400 pulse-dot" />
      LIVE
    </span>
  );
}

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${value}`}
      className="relative inline-flex items-center justify-center w-4 h-4 rounded hover:bg-white/10 transition-colors group"
    >
      {copied ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l4 4 8-8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-zinc-600 group-hover:text-zinc-300 transition-colors">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap pointer-events-none">
          Copied!
        </span>
      )}
    </button>
  );
}

function WinRateBadge({ winRate }: { winRate: { wins: number; losses: number; total: number; win_rate: number } }) {
  if (winRate.total < 3) return null; // Not enough data
  const wr = winRate.win_rate;
  const color = wr >= 70 ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/8'
    : wr >= 50 ? 'text-zinc-400 border-zinc-500/25 bg-zinc-500/8'
    : 'text-red-400 border-red-500/25 bg-red-500/8';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${color}`}>
      <span className="opacity-60">WR</span>
      <span className="font-bold">{wr}%</span>
      <span className="opacity-40 text-[8px]">{winRate.wins}/{winRate.total}</span>
    </span>
  );
}

function ConfluencePills({ timeframe }: { timeframe: string }) {
  // Parse e.g. "3TF (M5, H1, H4)" or "4TF (M5, M15, H1, H4)"
  const match = timeframe.match(/(\d)TF\s*\(([^)]+)\)/);
  if (!match) return null;
  const count = parseInt(match[1]);
  const tfs = match[2].split(',').map(t => t.trim());
  const color = count === 4 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/8'
    : count === 3 ? 'text-zinc-400 border-zinc-500/30 bg-zinc-500/8'
    : 'text-zinc-400 border-zinc-500/30 bg-zinc-500/8';
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono border ${color}`}>
        {'●'.repeat(count)}{'○'.repeat(4 - count)}
        <span className="ml-0.5 opacity-60">{count}TF</span>
      </span>
      {tfs.map(tf => (
        <span key={tf} className="px-1 py-0.5 rounded text-[9px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-400">{tf}</span>
      ))}
    </div>
  );
}

function SignalExplanation({ signal }: { signal: TradingSignal }) {
  const reasons: string[] = [];
  const { rsi, macd, ema, stochastic } = signal.indicators;

  // Build 1-2 concise reasons from indicators
  if (signal.direction === 'BUY') {
    if (rsi.signal === 'oversold' || rsi.value < 35) reasons.push(`RSI at ${rsi.value.toFixed(0)} (oversold) — bounce likely`);
    else if (rsi.value < 50) reasons.push(`RSI at ${rsi.value.toFixed(0)} — momentum building`);
    if (macd.signal === 'bullish') reasons.push('MACD crossover bullish');
    if (ema.trend === 'up') reasons.push('Price above EMA20 — uptrend intact');
    if (stochastic.signal === 'oversold') reasons.push('Stochastic oversold — reversal setup');
  } else {
    if (rsi.signal === 'overbought' || rsi.value > 65) reasons.push(`RSI at ${rsi.value.toFixed(0)} (overbought) — pullback likely`);
    else if (rsi.value > 50) reasons.push(`RSI at ${rsi.value.toFixed(0)} — momentum fading`);
    if (macd.signal === 'bearish') reasons.push('MACD crossover bearish');
    if (ema.trend === 'down') reasons.push('Price below EMA20 — downtrend intact');
    if (stochastic.signal === 'overbought') reasons.push('Stochastic overbought — reversal setup');
  }

  if (signal.confidence >= 80) reasons.push(`${signal.confidence}% confidence — multi-indicator alignment`);

  const display = reasons.slice(0, 2);
  if (display.length === 0) return null;

  return (
    <div className="mt-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-semibold">Why this signal?</div>
      {display.map((r, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
          <span className="text-emerald-400 mt-0.5 shrink-0">&#x25B8;</span>
          <span>{r}</span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal, tfDirections, onSelect, isFavorite, onToggleFavorite }: { signal: TradingSignal; tfDirections?: TFDirection[]; onSelect?: (signal: TradingSignal) => void; isFavorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const signalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win'}/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(signalUrl);
    setShareCopied(true);
    setShareMenuOpen(false);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleShareX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
    const text = [
      `${emoji} ${signal.direction} ${signal.symbol} — ${signal.confidence}% confidence`,
      `Entry: $${formatPrice(signal.entry)}`,
      `TP1: $${formatPrice(signal.takeProfit1)} | SL: $${formatPrice(signal.stopLoss)}`,
      '',
      `Live signals at ${signalUrl}`,
      '#TradeClaw #Trading #Signals',
    ].join('\n');
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'width=550,height=420');
    setShareMenuOpen(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareMenuOpen(!shareMenuOpen);
  };

  return (
    <article className="glass-card rounded-2xl p-3.5 sm:p-5 cursor-pointer" onClick={() => { setExpanded(!expanded); onSelect?.(signal); }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[var(--foreground)] font-mono tracking-tight">{signal.symbol}</span>
              {signal.dataQuality === 'real' && <LiveBadge />}
              <DataSourceBadge source={getDataSource(signal.symbol)} />
              {signal.dataQuality === 'synthetic' && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">DEMO</span>
              )}
              {signal.atrCalibration && signal.atrCalibration.confidence !== 'low' && (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                  signal.atrCalibration.confidence === 'high'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  SL {signal.atrCalibration.multiplier}× ATR
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">{signal.timeframe} · {formatSignalTimestamp(signal.timestamp)}</div>
            {/* Confluence pills — show TF agreement visually */}
            <div className="mt-1.5">
              <ConfluencePills timeframe={signal.timeframe} />
            </div>
            {/* Win rate badge — only shows when we have enough data */}
            {(signal as TradingSignal & { win_rate?: { wins: number; losses: number; total: number; win_rate: number } }).win_rate && (
              <div className="mt-1">
                <WinRateBadge winRate={(signal as TradingSignal & { win_rate: { wins: number; losses: number; total: number; win_rate: number } }).win_rate} />
              </div>
            )}
            <AccuracyMeta symbol={signal.symbol} timeframe={signal.timeframe} />
            {tfDirections && tfDirections.length > 0 && (
              <div className="flex gap-1 mt-1.5 overflow-x-auto scrollbar-none">
                {tfDirections.map(tf => <TFBadgeInline key={tf.timeframe} tf={tf} />)}
              </div>
            )}
          </div>
          <DirectionBadge direction={signal.direction} />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(signal.id); }}
              title={isFavorite ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`flex items-center justify-center w-9 h-9 min-w-[36px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 rounded-lg transition-all duration-200 ${
                isFavorite ? 'text-zinc-400 bg-zinc-500/10' : 'text-[var(--text-secondary)] hover:text-zinc-400 hover:bg-[var(--glass-bg)]'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setChartVisible(!chartVisible); }}
            title={chartVisible ? 'Hide chart' : 'Show chart'}
            className={`flex items-center justify-center w-9 h-9 min-w-[36px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 rounded-lg transition-all duration-200 ${
              chartVisible ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={handleShare}
              title="Share signal"
              className="flex items-center justify-center w-9 h-9 min-w-[36px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-all duration-200"
            >
              {shareCopied ? (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l4 4 8-8" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 3.8L5.5 7.2M5.5 8.8l5 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
            </button>
            {shareMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-[var(--border)] bg-zinc-900/95 backdrop-blur-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <button onClick={handleShareX} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[var(--foreground)] hover:bg-white/[0.05] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Post on X
                </button>
                <button onClick={handleCopyLink} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[var(--foreground)] hover:bg-white/[0.05] transition-colors border-t border-white/[0.05]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy link
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold font-mono tabular-nums ${
              signal.confidence >= 80 ? 'text-emerald-400' : signal.confidence >= 65 ? 'text-zinc-400' : 'text-red-400'
            }`}>{signal.confidence}%</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <div className="text-[10px] text-[var(--text-secondary)]">confidence</div>
              <HintBadge label="Signal confidence (0–100%). ≥80% = high conviction. Combines RSI, MACD, EMA, Stochastic, and BB signals." />
            </div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={signal.confidence} showExplainer />

      {/* Why this signal? — 1-2 bullet reasons */}
      <SignalExplanation signal={signal} />

      {/* Price levels */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-4 text-center">
        {[
          { label: 'Entry', value: signal.entry, color: 'text-[var(--foreground)]', hint: 'Price when the signal was generated.' },
          { label: 'SL', value: signal.stopLoss, color: 'text-red-400', hint: 'Stop Loss = Entry ± (ATR × multiplier). ATR measures recent volatility — wider ATR means a wider stop to avoid noise.' },
          { label: 'TP1', value: signal.takeProfit1, color: 'text-emerald-400', hint: 'Take Profit 1 — closest target at ~1.5× the risk distance. Highest probability of being hit.' },
          { label: 'TP2', value: signal.takeProfit2, color: 'text-emerald-400', hint: 'Take Profit 2 — mid target at ~2.5× risk. Consider partial close at TP1 and let the rest run.' },
          { label: 'TP3', value: signal.takeProfit3, color: 'text-emerald-400', hint: 'Take Profit 3 — stretch target at ~3.5× risk. Only hit in strong moves.' },
        ].map(({ label, value, color, hint }) => {
          const isLockedTP =
            (label === 'TP2' || label === 'TP3') && (value === null || value === undefined);
          return (
            <div key={label} className="bg-white/[0.02] rounded-lg py-1.5 px-1">
              <div className="flex items-center justify-center gap-0.5 text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                {label}
                <HintBadge label={hint} />
              </div>
              {isLockedTP ? (
                <div className="flex items-center justify-center">
                  <LockedTP level={label === 'TP2' ? 2 : 3} from="signal-card" />
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-0.5 text-[10px] font-mono font-semibold tabular-nums ${color}`}>
                  {formatPrice(value)}
                  {(label === 'SL' || label.startsWith('TP')) && (
                    <CopyValueButton value={formatPrice(value)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick indicators */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: 'RSI', value: signal.indicators.rsi.value.toFixed(0), signal: signal.indicators.rsi.signal },
          { label: 'MACD', value: signal.indicators.macd.histogram > 0 ? `+${signal.indicators.macd.histogram}` : String(signal.indicators.macd.histogram), signal: signal.indicators.macd.signal },
          { label: 'Trend', value: signal.indicators.ema.trend.toUpperCase(), signal: signal.indicators.ema.trend },
          { label: 'Stoch', value: `${signal.indicators.stochastic.k}`, signal: signal.indicators.stochastic.signal },
        ].map(({ label, value, signal: sig }) => {
          const isBull = sig === 'bullish' || sig === 'oversold' || sig === 'up';
          const isBear = sig === 'bearish' || sig === 'overbought' || sig === 'down';
          return (
            <div key={label} className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className={isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-[var(--text-secondary)]'}>{value}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-auto">
          <SignalExportMenu signal={signal} />
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{expanded ? '▴' : '▾'} details</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[var(--text-secondary)] mb-2 uppercase text-[10px] tracking-wider">EMA Stack</div>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA20</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema20)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA50</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema50)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA200</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema200)}</span></div>
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)] mb-2 uppercase text-[10px] tracking-wider">S/R Levels</div>
            <div className="space-y-1 font-mono">
              {signal.indicators.support.map((s, i) => (
                <div key={i} className="flex justify-between"><span className="text-[var(--text-secondary)]">S{i + 1}</span><span className="text-emerald-400">{formatPrice(s)}</span></div>
              ))}
              {signal.indicators.resistance.map((r, i) => (
                <div key={i} className="flex justify-between"><span className="text-[var(--text-secondary)]">R{i + 1}</span><span className="text-red-400">{formatPrice(r)}</span></div>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
            <span title={signal.id}>{shortSignalId(signal.id)}</span>
            <div className="flex items-center gap-3">
              {signal.atrCalibration && (
                <span className={signal.atrCalibration.confidence === 'low' ? 'text-zinc-600' : 'text-blue-400'}>
                  ATR Stop: {signal.atrCalibration.multiplier}× {signal.atrCalibration.confidence === 'low' ? '(default)' : `(${signal.atrCalibration.confidence})`}
                </span>
              )}
              <span>BB Width: {signal.indicators.bollingerBands.bandwidth.toFixed(2)}%</span>
              <span className={signal.dataQuality === 'real' ? 'text-emerald-400' : 'text-zinc-400'}>
                {signal.dataQuality === 'real' ? 'real-tracked' : 'demo-seeded'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inline chart (toggle) — shows Entry / SL / TP levels overlaid */}
      {chartVisible && (() => {
        const symbolConfig = SYMBOLS.find(s => s.symbol === signal.symbol);
        const basePrice = symbolConfig?.basePrice ?? signal.entry;
        const ts = new Date(signal.timestamp).getTime();
        const bars = generateBars(basePrice, signal.direction, ts, 120);
        const signalTime = bars.length > 0 ? bars[Math.min(30, bars.length - 1)]?.time : undefined;
        return (
          <div className="mt-4 pt-4 border-t border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">{signal.symbol} · Entry / SL / TP</span>
              <Link href={`/chart/${signal.symbol}`} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors font-mono">
                Full screen →
              </Link>
            </div>
            <SignalChart
              bars={bars}
              direction={signal.direction}
              entry={signal.entry}
              stopLoss={signal.stopLoss}
              takeProfit1={signal.takeProfit1}
              takeProfit2={signal.takeProfit2}
              takeProfit3={signal.takeProfit3}
              signalTime={signalTime}
              height={240}
              pip={symbolConfig?.pip ?? 0.01}
            />
          </div>
        );
      })()}
    </article>
  );
}

interface HistoryRecord {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number;
  outcomes: {
    '4h': { hit: boolean; pnlPct: number } | null;
    '24h': { hit: boolean; pnlPct: number } | null;
  };
}

interface HistoryApiStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number;
  streak: number;
}

function SignalHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryApiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithLicense('/api/signals/history?limit=40&sort=resolved-first')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (data?.records) {
          // Show up to 10 resolved + up to 5 pending = 15 max
          const resolved = (data.records as HistoryRecord[]).filter((r: HistoryRecord) => r.outcomes['24h'] !== null).slice(0, 10);
          const pending = (data.records as HistoryRecord[]).filter((r: HistoryRecord) => r.outcomes['24h'] === null).slice(0, 5);
          setRecords([...resolved, ...pending]);
        }
        if (data?.stats) setHistoryStats(data.stats);
      })
      .catch(() => { /* history is supplementary — fail silently */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (records.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">Signal Track Record</h2>

      {/* Stats Banner */}
      {historyStats && historyStats.resolved > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 px-1 text-[10px] font-mono text-[var(--text-secondary)]">
          <span>
            <span className={historyStats.winRate >= 55 ? 'text-emerald-400' : historyStats.winRate >= 45 ? 'text-zinc-400' : 'text-red-400'}>
              {historyStats.winRate}%
            </span>{' '}
            win rate
          </span>
          <span className="text-[var(--border)]">|</span>
          <span>{historyStats.resolved} resolved</span>
          <span className="text-[var(--border)]">|</span>
          <span>
            <span className={historyStats.streak > 0 ? 'text-emerald-400' : historyStats.streak < 0 ? 'text-red-400' : ''}>
              {historyStats.streak > 0 ? '+' : ''}{historyStats.streak}
            </span>{' '}
            streak
          </span>
          <span className="text-[var(--border)]">|</span>
          <span>
            <span className={historyStats.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {historyStats.totalPnlPct >= 0 ? '+' : ''}{historyStats.totalPnlPct}%
            </span>{' '}
            total P&L
          </span>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th className="px-4 py-2.5 text-left font-medium">Pair</th>
                <th className="px-3 py-2.5 text-center font-medium">Dir</th>
                <th className="px-3 py-2.5 text-center font-medium">Conf</th>
                <th className="px-3 py-2.5 text-right font-medium hidden sm:table-cell">Entry</th>
                <th className="px-3 py-2.5 text-center font-medium">4h</th>
                <th className="px-3 py-2.5 text-center font-medium">24h</th>
                <th className="px-4 py-2.5 text-right font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const outcome24h = r.outcomes['24h'];
                const outcome4h = r.outcomes['4h'];
                const pnl = outcome24h?.pnlPct ?? outcome4h?.pnlPct ?? null;
                return (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-[var(--foreground)] font-semibold">{r.pair}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{r.direction}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{r.confidence}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)] hidden sm:table-cell">{formatPrice(r.entryPrice)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {outcome4h == null ? (
                        <span className="text-zinc-600">���</span>
                      ) : outcome4h.hit ? (
                        <span className="text-emerald-400">TP</span>
                      ) : (
                        <span className="text-red-400">SL</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {outcome24h == null ? (
                        <span className="text-zinc-600">pending</span>
                      ) : outcome24h.hit ? (
                        <span className="text-emerald-400">TP</span>
                      ) : (
                        <span className="text-red-400">SL</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                      pnl == null ? 'text-zinc-600' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[var(--border)]">
          <Link href="/track-record" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-mono">
            View Full Track Record →
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, color = 'text-[var(--foreground)]' }: { value: string; label: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

const SIGNAL_CACHE_KEY = 'tc_signals_cache';
const SIGNAL_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

function getCachedSignals(): TradingSignal[] {
  try {
    const raw = localStorage.getItem(SIGNAL_CACHE_KEY);
    if (!raw) return [];
    const { signals, ts } = JSON.parse(raw) as { signals: TradingSignal[]; ts: number };
    if (Date.now() - ts > SIGNAL_CACHE_MAX_AGE) return [];
    return signals;
  } catch { return []; }
}

function setCachedSignals(signals: TradingSignal[]) {
  try {
    if (signals.length > 0) {
      localStorage.setItem(SIGNAL_CACHE_KEY, JSON.stringify({ signals: signals.slice(0, 20), ts: Date.now() }));
    }
  } catch { /* quota exceeded — ignore */ }
}

export function DashboardClient({ initialSignals, initialSyntheticSymbols }: { initialSignals?: TradingSignal[]; initialSyntheticSymbols?: string[] }) {
  const { prices, state: connectionState } = usePriceStream(TICKER_PAIRS);
  const [signals, setSignals] = useState<TradingSignal[]>(() => {
    if (initialSignals && initialSignals.length > 0) return initialSignals;
    if (typeof window !== 'undefined') return getCachedSignals();
    return [];
  });
  const [syntheticSymbols, setSyntheticSymbols] = useState<string[]>(initialSyntheticSymbols || []);
  const [tfMap, setTfMap] = useState<Map<string, TFDirection[]>>(new Map());
  const [loading, setLoading] = useState(() => {
    if (initialSignals && initialSignals.length > 0) return false;
    if (typeof window !== 'undefined' && getCachedSignals().length > 0) return false;
    return true;
  });
  const [timeframe, setTimeframe] = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [assetClass, setAssetClass] = useState<AssetClass>('ALL');
  const [highConfOnly, setHighConfOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);

  const handleSelectSignal = useCallback((signal: TradingSignal) => {
    setSelectedSignal(signal);
    markStepDone('opened-detail');
  }, []);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      if (typeof window === 'undefined') return new Set<string>();
      const raw = localStorage.getItem('tc_favorites');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = useCallback((signalId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(signalId)) next.delete(signalId);
      else next.add(signalId);
      try { localStorage.setItem('tc_favorites', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (timeframe !== 'ALL') params.set('timeframe', timeframe);
      if (direction !== 'ALL') params.set('direction', direction);
      params.set('minConfidence', '50');

      const [signalsRes, mtfRes] = await Promise.allSettled([
        fetchWithLicense(`/api/signals?${params}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
        fetchWithLicense('/api/signals/multi-tf').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      ]);

      if (signalsRes.status === 'fulfilled') {
        setSignals(signalsRes.value.signals);
        setSyntheticSymbols(signalsRes.value.syntheticSymbols || []);
        setCachedSignals(signalsRes.value.signals);
      }
      if (mtfRes.status === 'fulfilled' && mtfRes.value.results) {
        const map = new Map<string, TFDirection[]>();
        for (const r of mtfRes.value.results) {
          map.set(r.symbol, r.timeframes);
        }
        setTfMap(map);
      }
      setLastUpdate(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [timeframe, direction]);

  // Set initial lastUpdate on mount (avoids hydration mismatch from new Date())
  useEffect(() => {
    if (initialSignals && initialSignals.length > 0) {
      setLastUpdate(new Date());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only fetch on mount if we don't have initial signals
  useEffect(() => {
    if (!initialSignals || initialSignals.length === 0) {
      fetchSignals();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change
  useEffect(() => {
    fetchSignals();
  }, [timeframe, direction, assetClass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll faster (15s) when no signals, normal rate (30s) when signals exist
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSignals, signals.length === 0 ? 15000 : 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignals, signals.length]);

  // Keyboard shortcut: Ctrl+R / Cmd+R triggers an in-app refresh instead of a full page reload.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRefreshKey =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'r' || event.key === 'R');
      if (!isRefreshKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      event.preventDefault();
      void fetchSignals();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchSignals]);

  // Update browser tab title with BUY signal count
  useEffect(() => {
    const highConfBuyCount = signals.filter(
      s => s.direction === 'BUY' && s.confidence >= BUY_CONFIDENCE_THRESHOLD
    ).length;

    document.title = highConfBuyCount > 0
      ? `(${highConfBuyCount} BUY) ${DEFAULT_TITLE}`
      : DEFAULT_TITLE;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [signals]);

  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const avgConfidence = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
    : 0;
  const bias = buyCount > sellCount ? 'BULL' : buyCount < sellCount ? 'BEAR' : 'NEUTRAL';
  const biasColor = bias === 'BULL' ? 'text-emerald-400' : bias === 'BEAR' ? 'text-red-400' : 'text-[var(--text-secondary)]';

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <GuidedTourListener />
      <PageNavBar />
      <OnboardingBanner />
      <ReEngagementBanner />

      {/* Strategy access bar */}
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <StrategyAccessBar />
      </div>

      {/* Premium live feed (renders only when a license key is stored) */}
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <PremiumSignalFeed />
      </div>

      {/* Dashboard controls */}
      <div data-tour-id="dashboard-controls" className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--background)]/50 overflow-x-auto scrollbar-none">
        <div className="hidden sm:contents">
          <VisitStreak />
          <StarsWidget />
          <GateStateBadge />
        </div>
        <TakeTourButton />
        <ConnectionStatus state={connectionState} />
        <button
          data-tour-id="auto-refresh-toggle"
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 shrink-0 ${
            autoRefresh
              ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8'
              : 'border-white/8 text-[var(--text-secondary)]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 pulse-dot' : 'bg-zinc-600'}`} />
          {autoRefresh ? 'Auto' : 'Paused'}
        </button>
        {lastUpdate && (
          <span className="hidden sm:block text-xs text-[var(--text-secondary)] font-mono shrink-0">
            {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Live ticker */}
      <LiveTicker prices={prices} pairs={TICKER_PAIRS} />

      {/* Data transparency bar — who powers the prices, where the fallback kicks in */}
      <div className="border-b border-[var(--border)] bg-emerald-500/[0.03]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            LIVE
          </span>
          <span>
            Prices streamed via{' '}
            <a
              href="https://twelvedata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline decoration-dotted underline-offset-2"
            >
              Twelve Data API
            </a>
            {' '}→ Redis cache (market-data-hub). Falls back to Binance / CoinGecko / synthetic bars if upstream is unreachable.
          </span>
          <span className="hidden md:inline text-white/20">·</span>
          <span className="italic text-[var(--text-secondary)]/80">
            Transparency is our motto — every signal is tagged with its real data source.
          </span>
        </div>
      </div>

      {/* Synthetic data warning banner */}
      {syntheticSymbols.length > 0 && syntheticSymbols.length / 12 > 0.3 && (
        <div className="border-b border-zinc-500/20 bg-zinc-500/5 px-4 py-2">
          <p className="max-w-7xl mx-auto text-xs text-zinc-400/80 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> {syntheticSymbols.length} of 12 symbols are using synthetic data (API unavailable) — signals suppressed for those pairs.
          </p>
        </div>
      )}

      {/* Hero chart — shows selected signal or highest-confidence */}
      {(() => {
        const topSignal = selectedSignal
          ?? (signals.length > 0
            ? [...signals].sort((a, b) => b.confidence - a.confidence)[0]
            : null);
        if (!topSignal) return null;
        const ts = new Date(topSignal.timestamp).getTime();
        const bars = generateBars(topSignal.entry, topSignal.direction, ts);
        const signalTime = bars.length > 0 ? bars[Math.min(30, bars.length - 1)]?.time : undefined;
        return (
          <div className="relative border-b border-[var(--border)]">
            <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                {selectedSignal ? 'SELECTED' : 'TOP SIGNAL'}
              </div>
              <span className="text-xs font-mono font-semibold text-[var(--foreground)]">{topSignal.symbol}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{topSignal.timeframe}</span>
              <DirectionBadge direction={topSignal.direction} />
              <span className={`text-xs font-mono font-bold ${topSignal.confidence >= 80 ? 'text-emerald-400' : topSignal.confidence >= 65 ? 'text-zinc-400' : 'text-red-400'}`}>
                {topSignal.confidence}%
              </span>
            </div>
            <SignalChart
              bars={bars}
              direction={topSignal.direction}
              entry={topSignal.entry}
              stopLoss={topSignal.stopLoss}
              takeProfit1={topSignal.takeProfit1}
              takeProfit2={topSignal.takeProfit2}
              takeProfit3={topSignal.takeProfit3}
              signalTime={signalTime}
              height={300}
              pip={SYMBOLS.find(s => s.symbol === topSignal.symbol)?.pip ?? 0.01}
            />
          </div>
        );
      })()}

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
{/* Hints removed for cleaner UI */}

        {/* Accuracy stats bar — prominent inline version */}
        <div data-tour-id="accuracy-stats" className="mb-4">
          <AccuracyStatsBar inline />
        </div>

        {/* Stats */}
        <div data-tour-id="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard value={String(signals.length)} label="Active signals" />
          <StatCard
            value={`${buyCount} / ${sellCount}`}
            label="Buy / Sell"
            color="text-[var(--foreground)]"
          />
          <StatCard value={`${avgConfidence}%`} label="Avg confidence" />
          <StatCard value={bias} label="Market bias" color={biasColor} />
        </div>

        {/* Filters */}
        <div data-tour-id="dashboard-filters" className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-0.5 bg-white/[0.03] border border-[var(--border)] rounded-xl p-1 shrink-0">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                  timeframe === tf
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-white/[0.03] border border-[var(--border)] rounded-xl p-1 shrink-0">
            {(['ALL', 'BUY', 'SELL'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                  direction === d
                    ? d === 'BUY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : d === 'SELL' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : 'bg-[var(--glass-bg)] text-[var(--foreground)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-white/[0.03] border border-[var(--border)] rounded-xl p-1 shrink-0">
            {(Object.keys(ASSET_CLASSES) as AssetClass[]).map(ac => (
              <button
                key={ac}
                onClick={() => setAssetClass(ac)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                  assetClass === ac
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {ac}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSignals}
            className="px-4 py-1.5 rounded-xl text-xs border border-white/8 text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-all duration-200 font-mono shrink-0"
          >
            Refresh
          </button>
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setHighConfOnly(!highConfOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border shrink-0 ${
              highConfOnly
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'text-[var(--text-secondary)] border-white/[0.06] hover:text-[var(--foreground)]'
            }`}
          >
            High Confidence (&gt;80%)
          </button>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border shrink-0 flex items-center gap-1 ${
              showFavoritesOnly
                ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                : 'text-[var(--text-secondary)] border-white/[0.06] hover:text-[var(--foreground)]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Watchlist {favorites.size > 0 ? `(${favorites.size})` : ''}
          </button>
        </div>

        {/* Signal grid */}
        {(() => {
          let filteredSignals = signals.filter(s => ASSET_CLASSES[assetClass].includes(s.symbol));
          if (highConfOnly) filteredSignals = filteredSignals.filter(s => s.confidence >= 80);
          if (showFavoritesOnly) filteredSignals = filteredSignals.filter(s => favorites.has(s.id));
          const mainSignals = filteredSignals.filter(s => s.confidence >= 70);
          const potentialSignals = filteredSignals.filter(s => s.confidence >= 50 && s.confidence < 70);

          if (loading) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                    <div className="h-4 bg-[var(--glass-bg)] rounded mb-4 w-1/2" />
                    <div className="h-1 bg-[var(--glass-bg)] rounded mb-4" />
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="h-10 bg-[var(--glass-bg)] rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (filteredSignals.length === 0 && signals.length > 0) {
            // Signals exist but the current asset class filter hides all
            return (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--glass-bg)] border border-[var(--border)] mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
                    <path d="M3 3h7l2 2h9v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3z" />
                    <path d="M12 11v4" /><path d="M12 17h.01" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                  No {assetClass !== 'ALL' ? assetClass.toLowerCase() : ''} signals right now
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
                  {signals.length} signal{signals.length !== 1 ? 's' : ''} active in other categories. Try switching asset class or check back when {assetClass === 'FOREX' ? 'forex sessions are open' : assetClass === 'METALS' ? 'metals markets are active' : 'more setups trigger'}.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {assetClass !== 'ALL' && (
                    <button
                      onClick={() => setAssetClass('ALL' as AssetClass)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                    >
                      Show all assets
                    </button>
                  )}
                  <button onClick={fetchSignals} className="px-4 py-2 rounded-xl text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-all duration-200 font-mono">
                    Refresh
                  </button>
                </div>
              </div>
            );
          }
          if (filteredSignals.length === 0) {
            return (
              <div className="text-center py-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 mb-4">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
                  <span className="text-emerald-400 text-sm font-mono">Generating signals...</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-1">
                  The TA engine is analyzing live market data. This takes up to 30 seconds on first load.
                </p>
                <p className="text-[var(--text-secondary)] text-xs mb-4">
                  Auto-retrying every 15s. Signals appear when the market is active and setups meet the quality threshold.
                </p>
                <button onClick={fetchSignals} className="px-4 py-2 rounded-xl text-xs border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 font-mono">
                  Retry now
                </button>
              </div>
            );
          }
          return (
            <>
              {/* Main signals (70%+) */}
              {mainSignals.length > 0 && (
                <div data-tour-id="signal-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {mainSignals.map(signal => (
                    <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} onSelect={handleSelectSignal} isFavorite={favorites.has(signal.id)} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
              )}
              {mainSignals.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-[var(--text-secondary)] mb-2 font-mono">No high-confidence (70%+) signals right now</p>
                  {potentialSignals.length > 0 && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {potentialSignals.length} potential setup{potentialSignals.length !== 1 ? 's' : ''} (50-69%) below — these have partial indicator agreement and may strengthen.
                    </p>
                  )}
                </div>
              )}

              {/* Telegram CTA */}
              <div className="mt-6 mb-2 flex items-center justify-center">
                <a
                  href="https://t.me/tradeclawwin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/25 text-[#229ED9] hover:bg-[#229ED9]/20 transition-all duration-200 text-sm font-medium"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Join our Telegram for live signals
                </a>
              </div>

              {/* Potential signals (50-69%) */}
              {potentialSignals.length > 0 && (
                <section className="mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs uppercase tracking-wider text-zinc-400/80 font-mono font-semibold">Potential Signals</h2>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono px-2 py-0.5 rounded-full bg-zinc-500/8 border border-zinc-500/15">50–69% confidence</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{potentialSignals.length} setup{potentialSignals.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Early-stage setups that haven&apos;t reached full confluence yet. Watch for confirmation before acting.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-80">
                    {potentialSignals.map(signal => (
                      <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} onSelect={handleSelectSignal} isFavorite={favorites.has(signal.id)} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()}

        {/* Signal history / track record */}
        <SignalHistory />

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs text-zinc-800 font-mono">TradeClaw Signal Scanner · Open Source · Self-Hosted</p>
          <p className="text-xs text-zinc-800 mt-1">Signal analysis is for educational purposes only. Not financial advice.</p>
        </footer>
      </div>
      <OnboardingOverlay signalsLoaded={signals.length > 0} />
      {/* Signal toasts */}
      <SignalToast />
    </div>
  );
}

export default DashboardClient;
