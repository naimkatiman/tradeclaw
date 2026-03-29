'use client';

<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
=======
import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';
>>>>>>> origin/main
import { LiveTicker } from '../../components/live-ticker';
import { SignalToast } from '../../components/signal-toast';
import { ConnectionStatus } from '../../components/connection-status';
import { GuidedTourListener, TakeTourButton } from '../../components/guided-tour';
import { StarsWidget } from '../../components/stars-widget';
import { HintBadge, PageHint } from '../../components/feature-highlights';
<<<<<<< HEAD
import { AnimatedChartHero } from '../../components/animated-chart-hero';
=======
import { SignalChart } from '../components/charts';
import { generateBars } from '../lib/chart-utils';
import { DataSourceBadge, getDataSource, formatSignalTimestamp, shortSignalId } from '../components/data-source-badge';
import { MarketContextPanel } from '../components/market-context-panel';
import { AccuracyStatsBar } from '../components/accuracy-stats-bar';
import { SignalLedger } from '../components/signal-ledger';
import { LatestOutcomes } from '../components/latest-outcomes';
import { EquityCurve } from '../components/equity-curve';
>>>>>>> origin/main
import { usePriceStream } from '../../lib/hooks/use-price-stream';
import type { TradingSignal } from '../lib/signals';
import type { TFDirection } from '../lib/signal-generator';

const TICKER_PAIRS = ['BTCUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'ETHUSD', 'XAGUSD'];

<<<<<<< HEAD
const TIMEFRAMES = ['ALL', 'M5', 'M15', 'H1', 'H4', 'D1'];

const NAV_PAGES = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/paper-trading', label: 'Paper Trade' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/strategy-builder', label: 'Strategy' },
  { href: '/multi-timeframe', label: 'Multi-TF' },
];
=======
function OnboardingBanner() {
  const [visible, setVisible] = useState(() => {
    try {
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
          <p className="text-sm font-semibold text-emerald-400 mb-1">Welcome to TradeClaw! Here&apos;s how to read signals:</p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-0.5 font-mono">
            <li><span className="text-emerald-400">Green = BUY</span>, <span className="text-red-400">Red = SELL</span> — direction of the trade</li>
            <li>Confidence above <span className="text-emerald-400 font-bold">70%</span> = strong signal with high indicator agreement</li>
            <li>Click any signal card for full indicator breakdown (EMA, RSI, MACD, S/R levels)</li>
          </ul>
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
  ALL: ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'],
  CRYPTO: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD'],
  FOREX: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'],
  METALS: ['XAUUSD', 'XAGUSD'],
};

type AssetClass = keyof typeof ASSET_CLASSES;
>>>>>>> origin/main

function formatPrice(p: number): string {
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

<<<<<<< HEAD
function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#10B981' : value >= 65 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative h-1 w-full rounded-full bg-white/5">
      <div
        className="absolute h-1 rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
=======
function ConfidenceBar({ value, showExplainer = false }: { value: number; showExplainer?: boolean }) {
  const color = value >= 80 ? '#10B981' : value >= 65 ? '#F59E0B' : '#EF4444';
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
>>>>>>> origin/main
    </div>
  );
}

// ─── TF Badges ───────────────────────────────────────────────

function TFBadgeInline({ tf }: { tf: TFDirection }) {
  const arrow = tf.direction === 'BUY' ? '▲' : tf.direction === 'SELL' ? '▼' : '●';
  const color =
    tf.direction === 'BUY' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/8' :
    tf.direction === 'SELL' ? 'text-rose-400 border-rose-500/25 bg-rose-500/8' :
    'text-amber-400 border-amber-500/25 bg-amber-500/8';
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

<<<<<<< HEAD
=======
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

>>>>>>> origin/main
function SignalCard({ signal, tfDirections }: { signal: TradingSignal; tfDirections?: TFDirection[] }) {
  const [expanded, setExpanded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <article className="glass-card rounded-2xl p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
<<<<<<< HEAD
              <span className="text-sm font-semibold text-white font-mono tracking-tight">{signal.symbol}</span>
              {signal.dataQuality === 'real' && <LiveBadge />}
            </div>
            <div className="text-[11px] text-zinc-600 font-mono mt-0.5">{signal.timeframe} · {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
=======
              <span className="text-sm font-semibold text-[var(--foreground)] font-mono tracking-tight">{signal.symbol}</span>
              {signal.dataQuality === 'real' && <LiveBadge />}
              <DataSourceBadge source={getDataSource(signal.symbol)} />
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">{signal.timeframe} · {formatSignalTimestamp(signal.timestamp)}</div>
>>>>>>> origin/main
            {tfDirections && tfDirections.length > 0 && (
              <div className="flex gap-1 mt-1.5 overflow-x-auto scrollbar-none">
                {tfDirections.map(tf => <TFBadgeInline key={tf.timeframe} tf={tf} />)}
              </div>
            )}
          </div>
          <DirectionBadge direction={signal.direction} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            title="Copy signal link"
<<<<<<< HEAD
            className="flex items-center justify-center min-w-[44px] min-h-[44px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200"
=======
            className="flex items-center justify-center min-w-[44px] min-h-[44px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-all duration-200"
>>>>>>> origin/main
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
          <div className="text-right">
            <div className={`text-sm font-bold font-mono tabular-nums ${
              signal.confidence >= 80 ? 'text-emerald-400' : signal.confidence >= 65 ? 'text-yellow-400' : 'text-red-400'
            }`}>{signal.confidence}%</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
<<<<<<< HEAD
              <div className="text-[10px] text-zinc-600">confidence</div>
=======
              <div className="text-[10px] text-[var(--text-secondary)]">confidence</div>
>>>>>>> origin/main
              <HintBadge label="Signal confidence (0–100%). ≥80% = high conviction. Combines RSI, MACD, EMA, Stochastic, and BB signals." />
            </div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
<<<<<<< HEAD
      <ConfidenceBar value={signal.confidence} />
=======
      <ConfidenceBar value={signal.confidence} showExplainer />
>>>>>>> origin/main

      {/* Price levels */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-4 text-center">
        {[
<<<<<<< HEAD
          { label: 'Entry', value: signal.entry, color: 'text-white' },
=======
          { label: 'Entry', value: signal.entry, color: 'text-[var(--foreground)]' },
>>>>>>> origin/main
          { label: 'SL', value: signal.stopLoss, color: 'text-red-400' },
          { label: 'TP1', value: signal.takeProfit1, color: 'text-emerald-400' },
          { label: 'TP2', value: signal.takeProfit2, color: 'text-emerald-400' },
          { label: 'TP3', value: signal.takeProfit3, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.02] rounded-lg py-1.5 px-1">
<<<<<<< HEAD
            <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">{label}</div>
            <div className={`text-[10px] font-mono font-semibold tabular-nums ${color}`}>{formatPrice(value)}</div>
=======
            <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">{label}</div>
            <div className={`flex items-center justify-center gap-0.5 text-[10px] font-mono font-semibold tabular-nums ${color}`}>
              {formatPrice(value)}
              {(label === 'SL' || label.startsWith('TP')) && (
                <CopyValueButton value={formatPrice(value)} />
              )}
            </div>
>>>>>>> origin/main
          </div>
        ))}
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
<<<<<<< HEAD
              <span className="text-zinc-600">{label}</span>
              <span className={isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-zinc-400'}>{value}</span>
=======
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className={isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-[var(--text-secondary)]'}>{value}</span>
>>>>>>> origin/main
            </div>
          );
        })}
        <div className="flex items-center gap-1 text-[10px] font-mono ml-auto">
<<<<<<< HEAD
          <span className="text-zinc-700">{expanded ? '▴' : '▾'} details</span>
=======
          <span className="text-[var(--text-secondary)]">{expanded ? '▴' : '▾'} details</span>
>>>>>>> origin/main
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
<<<<<<< HEAD
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-zinc-600 mb-2 uppercase text-[10px] tracking-wider">EMA Stack</div>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between"><span className="text-zinc-600">EMA20</span><span className="text-zinc-300">{formatPrice(signal.indicators.ema.ema20)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-600">EMA50</span><span className="text-zinc-300">{formatPrice(signal.indicators.ema.ema50)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-600">EMA200</span><span className="text-zinc-300">{formatPrice(signal.indicators.ema.ema200)}</span></div>
            </div>
          </div>
          <div>
            <div className="text-zinc-600 mb-2 uppercase text-[10px] tracking-wider">S/R Levels</div>
            <div className="space-y-1 font-mono">
              {signal.indicators.support.map((s, i) => (
                <div key={i} className="flex justify-between"><span className="text-zinc-600">S{i + 1}</span><span className="text-emerald-400">{formatPrice(s)}</span></div>
              ))}
              {signal.indicators.resistance.map((r, i) => (
                <div key={i} className="flex justify-between"><span className="text-zinc-600">R{i + 1}</span><span className="text-red-400">{formatPrice(r)}</span></div>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between text-[10px] font-mono text-zinc-700 pt-2 border-t border-white/5">
            <span>{signal.id}</span>
=======
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
          <div className="col-span-2 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
            <span title={signal.id}>{shortSignalId(signal.id)}</span>
>>>>>>> origin/main
            <span>BB Width: {signal.indicators.bollingerBands.bandwidth}%</span>
          </div>
        </div>
      )}
    </article>
  );
}

<<<<<<< HEAD
function StatCard({ value, label, color = 'text-white' }: { value: string; label: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-zinc-600 uppercase tracking-wider mt-1">{label}</div>
=======
function StatCard({ value, label, color = 'text-[var(--foreground)]' }: { value: string; label: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mt-1">{label}</div>
>>>>>>> origin/main
    </div>
  );
}

export function DashboardClient({ initialSignals, initialSyntheticSymbols }: { initialSignals?: TradingSignal[]; initialSyntheticSymbols?: string[] }) {
  const { prices, state: connectionState } = usePriceStream(TICKER_PAIRS);
  const [signals, setSignals] = useState<TradingSignal[]>(initialSignals || []);
  const [syntheticSymbols, setSyntheticSymbols] = useState<string[]>(initialSyntheticSymbols || []);
  const [tfMap, setTfMap] = useState<Map<string, TFDirection[]>>(new Map());
  const [loading, setLoading] = useState(!initialSignals || initialSignals.length === 0);
  const [timeframe, setTimeframe] = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
<<<<<<< HEAD
=======
  const [assetClass, setAssetClass] = useState<AssetClass>('ALL');
>>>>>>> origin/main
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(initialSignals && initialSignals.length > 0 ? new Date() : null);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (timeframe !== 'ALL') params.set('timeframe', timeframe);
      if (direction !== 'ALL') params.set('direction', direction);
<<<<<<< HEAD
      params.set('minConfidence', '50');
=======
      params.set('minConfidence', '70');
>>>>>>> origin/main

      const [signalsRes, mtfRes] = await Promise.allSettled([
        fetch(`/api/signals?${params}`).then(r => r.json()),
        fetch('/api/signals/multi-tf').then(r => r.json()),
      ]);

      if (signalsRes.status === 'fulfilled') {
        setSignals(signalsRes.value.signals);
        setSyntheticSymbols(signalsRes.value.syntheticSymbols || []);
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

  // Only fetch on mount if we don't have initial signals
  useEffect(() => {
    if (!initialSignals || initialSignals.length === 0) {
      fetchSignals();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change
  useEffect(() => {
    fetchSignals();
<<<<<<< HEAD
  }, [timeframe, direction]); // eslint-disable-line react-hooks/exhaustive-deps
=======
  }, [timeframe, direction, assetClass]); // eslint-disable-line react-hooks/exhaustive-deps
>>>>>>> origin/main

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSignals, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignals]);

<<<<<<< HEAD
=======
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

>>>>>>> origin/main
  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const avgConfidence = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
    : 0;
  const bias = buyCount > sellCount ? 'BULL' : buyCount < sellCount ? 'BEAR' : 'NEUTRAL';
<<<<<<< HEAD
  const biasColor = bias === 'BULL' ? 'text-emerald-400' : bias === 'BEAR' ? 'text-red-400' : 'text-zinc-400';

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <GuidedTourListener />
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>

          {/* Page nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_PAGES.map(page => (
              <Link
                key={page.href}
                href={page.href}
                data-tour-id={`nav-${page.href.slice(1)}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  page.href === '/dashboard'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {page.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <StarsWidget />
            <TakeTourButton />
            <ConnectionStatus state={connectionState} />
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                autoRefresh
                  ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8'
                  : 'border-white/8 text-zinc-600'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 pulse-dot' : 'bg-zinc-600'}`} />
              {autoRefresh ? 'Auto' : 'Paused'}
            </button>
            {lastUpdate && (
              <span className="hidden sm:block text-xs text-zinc-700 font-mono">
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </nav>
=======
  const biasColor = bias === 'BULL' ? 'text-emerald-400' : bias === 'BEAR' ? 'text-red-400' : 'text-[var(--text-secondary)]';

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <GuidedTourListener />
      <PageNavBar />
      <OnboardingBanner />

      {/* Dashboard controls */}
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--background)]/50">
        <StarsWidget />
        <TakeTourButton />
        <ConnectionStatus state={connectionState} />
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            autoRefresh
              ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8'
              : 'border-white/8 text-[var(--text-secondary)]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 pulse-dot' : 'bg-zinc-600'}`} />
          {autoRefresh ? 'Auto' : 'Paused'}
        </button>
        {lastUpdate && (
          <span className="hidden sm:block text-xs text-[var(--text-secondary)] font-mono">
            {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
>>>>>>> origin/main

      {/* Live ticker */}
      <LiveTicker prices={prices} pairs={TICKER_PAIRS} />

      {/* Synthetic data warning banner */}
      {syntheticSymbols.length > 0 && syntheticSymbols.length / 12 > 0.3 && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2">
          <p className="max-w-7xl mx-auto text-xs text-amber-400/80 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> {syntheticSymbols.length} of 12 symbols are using synthetic data (API unavailable) — signals suppressed for those pairs.
          </p>
        </div>
      )}

<<<<<<< HEAD
      {/* Animated chart banner */}
      <div className="relative overflow-hidden border-b border-white/5" style={{ height: 300 }}>
        <AnimatedChartHero height={300} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/30 via-transparent to-[#050505]/70" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            LIVE SIGNAL ENGINE
          </div>
          <p className="text-white/50 text-xs font-mono">AI-powered · Multi-timeframe · Real-time</p>
        </div>
      </div>
=======
      {/* Hero chart — shows highest-confidence signal */}
      {(() => {
        const topSignal = signals.length > 0
          ? [...signals].sort((a, b) => b.confidence - a.confidence)[0]
          : null;
        if (!topSignal) return null;
        const ts = new Date(topSignal.timestamp).getTime();
        const bars = generateBars(topSignal.entry, topSignal.direction, ts);
        const signalTime = bars[Math.min(30, bars.length - 1)]?.time;
        return (
          <div className="relative border-b border-[var(--border)]">
            <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                TOP SIGNAL
              </div>
              <span className="text-xs font-mono font-semibold text-[var(--foreground)]">{topSignal.symbol}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{topSignal.timeframe}</span>
              <DirectionBadge direction={topSignal.direction} />
              <span className={`text-xs font-mono font-bold ${topSignal.confidence >= 80 ? 'text-emerald-400' : topSignal.confidence >= 65 ? 'text-yellow-400' : 'text-red-400'}`}>
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
            />
          </div>
        );
      })()}
>>>>>>> origin/main

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <PageHint message="Demo mode: all signals use live-simulated market data. Explore freely — no account needed." />

<<<<<<< HEAD
=======
        {/* Accuracy stats bar — prominent inline version */}
        <div className="mb-4">
          <AccuracyStatsBar inline />
        </div>

        {/* Market context — sentiment, BTC on-chain, DeFi TVL */}
        <MarketContextPanel />

>>>>>>> origin/main
        {/* Stats */}
        <div data-tour-id="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard value={String(signals.length)} label="Active signals" />
          <StatCard
            value={`${buyCount} / ${sellCount}`}
            label="Buy / Sell"
<<<<<<< HEAD
            color="text-white"
=======
            color="text-[var(--foreground)]"
>>>>>>> origin/main
          />
          <StatCard value={`${avgConfidence}%`} label="Avg confidence" />
          <StatCard value={bias} label="Market bias" color={biasColor} />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-none">
<<<<<<< HEAD
          <div className="flex gap-0.5 bg-white/[0.03] border border-white/5 rounded-xl p-1 shrink-0">
=======
          <div className="flex gap-0.5 bg-white/[0.03] border border-[var(--border)] rounded-xl p-1 shrink-0">
>>>>>>> origin/main
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                  timeframe === tf
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
<<<<<<< HEAD
                    : 'text-zinc-600 hover:text-zinc-300'
=======
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
>>>>>>> origin/main
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
<<<<<<< HEAD
          <div className="flex gap-0.5 bg-white/[0.03] border border-white/5 rounded-xl p-1 shrink-0">
=======
          <div className="flex gap-0.5 bg-white/[0.03] border border-[var(--border)] rounded-xl p-1 shrink-0">
>>>>>>> origin/main
            {(['ALL', 'BUY', 'SELL'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                  direction === d
                    ? d === 'BUY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : d === 'SELL' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
<<<<<<< HEAD
                    : 'bg-white/5 text-white border border-white/10'
                    : 'text-zinc-600 hover:text-zinc-300'
=======
                    : 'bg-[var(--glass-bg)] text-[var(--foreground)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
>>>>>>> origin/main
                }`}
              >
                {d}
              </button>
            ))}
          </div>
<<<<<<< HEAD
          <button
            onClick={fetchSignals}
            className="px-4 py-1.5 rounded-xl text-xs border border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15 transition-all duration-200 font-mono shrink-0"
=======
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
>>>>>>> origin/main
          >
            Refresh
          </button>
        </div>

        {/* Signal grid */}
<<<<<<< HEAD
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-white/5 rounded mb-4 w-1/2" />
                <div className="h-1 bg-white/5 rounded mb-4" />
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-10 bg-white/5 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-zinc-700 text-sm">No signals match the current filters</div>
            <button onClick={fetchSignals} className="mt-4 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
              Refresh signals
            </button>
          </div>
        ) : (
          <div data-tour-id="signal-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.map(signal => (
              <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} />
            ))}
          </div>
        )}
=======
        {(() => {
          const filteredSignals = signals.filter(s => ASSET_CLASSES[assetClass].includes(s.symbol));
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
          if (filteredSignals.length === 0) {
            return (
              <div className="text-center py-24">
                <div className="text-[var(--text-secondary)] text-sm">No signals match the current filters</div>
                <button onClick={fetchSignals} className="mt-4 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                  Refresh signals
                </button>
              </div>
            );
          }
          return (
            <div data-tour-id="signal-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSignals.map(signal => (
                <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} />
              ))}
            </div>
          );
        })()}

        {/* Equity curve chart */}
        <div className="mt-8">
          <EquityCurve />
        </div>

        {/* Signal ledger */}
        <div className="mt-8">
          <SignalLedger />
        </div>

        {/* Signal outcome verification */}
        <LatestOutcomes limit={5} />
>>>>>>> origin/main

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs text-zinc-800 font-mono">TradeClaw Signal Scanner · Open Source · Self-Hosted</p>
          <p className="text-xs text-zinc-800 mt-1">Signal analysis is for educational purposes only. Not financial advice.</p>
        </footer>
      </div>
      {/* Signal toasts */}
      <SignalToast />
    </div>
  );
}

export default DashboardClient;
