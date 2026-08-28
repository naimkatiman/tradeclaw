'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';
import { ConnectionStatus } from '../../components/connection-status';
import { HintBadge } from '../../components/feature-highlights';
import { GateStateBadge } from '../../components/GateStateBadge';
import { SYMBOLS } from '../lib/symbol-config';
import { DataSourceBadge, getDataSource, shortSignalId } from '../components/data-source-badge';
import { usePriceStream } from '../../lib/hooks/use-price-stream';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';
import { isPendingHistoricalSignal } from '../../lib/signal-history-status';
import type { TradingSignal } from '@tradeclaw/signals';
import type { TFDirection } from '../lib/signal-generator';
import { useLocale } from '../components/locale-provider';
import { getDashboardTranslations, type DashboardTranslations } from '../../lib/product-i18n/dashboard';
import { formatMessage } from '../../lib/product-i18n/format';
import { getHtmlLanguage } from '../../lib/translations';
import { isHighRuleScore } from '../../lib/signal-thresholds';

const TICKER_PAIRS = ['BTCUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'ETHUSD', 'XAGUSD'];

function useDashboardCopy() {
  const { locale } = useLocale();
  return {
    locale,
    language: getHtmlLanguage(locale),
    t: getDashboardTranslations(locale),
  };
}

const TIMEFRAMES = ['ALL', 'M5', 'M15', 'H1', 'H4', 'D1'];


// US mega-caps + index ETFs (issue #42). Symbols mirror apps/web/app/lib/symbol-config.ts.
const STOCK_SYMBOLS = [
  'NVDAUSD', 'TSLAUSD', 'AAPLUSD', 'MSFTUSD', 'GOOGLUSD', 'AMZNUSD', 'METAUSD',
  'SPYUSD', 'QQQUSD', 'AMDUSD', 'JPMUSD', 'JNJUSD', 'VUSD', 'WMTUSD', 'PGUSD',
  'UNHUSD', 'HDUSD', 'BACUSD', 'MAUSD', 'XOMUSD',
];

const ASSET_CLASSES = {
  ALL: [
    'XAUUSD', 'XAGUSD',
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD',
    'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'ATOMUSD',
    'UNIUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
    'OPUSD', 'FILUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'TIAUSD',
    'RENDERUSD', 'FETUSD', 'AAVEUSD', 'PEPEUSD', 'SHIBUSD', 'WIFUSD',
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
    ...STOCK_SYMBOLS,
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
  STOCKS: STOCK_SYMBOLS,
};

type AssetClass = keyof typeof ASSET_CLASSES;

function assetClassLabel(t: DashboardTranslations, assetClass: AssetClass): string {
  const labels: Record<AssetClass, string> = {
    ALL: t.common.assets.all,
    CRYPTO: t.common.assets.crypto,
    FOREX: t.common.assets.forex,
    METALS: t.common.assets.metals,
    STOCKS: t.common.assets.stocks,
  };
  return labels[assetClass];
}

function directionLabel(t: DashboardTranslations, direction: 'BUY' | 'SELL'): string {
  return direction === 'BUY' ? t.common.bias.bull : t.common.bias.bear;
}

function formatDashboardTimestamp(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  const { t } = useDashboardCopy();
  return direction === 'BUY' ? (
    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 tracking-wider">
      {t.common.bias.bull}
    </span>
  ) : (
    <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/20 tracking-wider">
      {t.common.bias.bear}
    </span>
  );
}

function ConfidenceBar({ value, showExplainer = false }: { value: number; showExplainer?: boolean }) {
  const { t } = useDashboardCopy();
  const color = isHighRuleScore(value) ? '#10B981' : value >= 65 ? '#a1a1aa' : '#EF4444';
  const explainer = isHighRuleScore(value)
    ? t.confidence.high
    : value >= 65
      ? t.confidence.medium
      : t.confidence.low;
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
  const { t } = useDashboardCopy();
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <span className="h-1 w-1 rounded-full bg-emerald-400" />
      {t.common.live}
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
        <span className="ms-0.5 opacity-60">{count}TF</span>
      </span>
      {tfs.map(tf => (
        <span key={tf} className="px-1 py-0.5 rounded text-[9px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-400">{tf}</span>
      ))}
    </div>
  );
}

function SignalExplanation({ signal }: { signal: TradingSignal }) {
  const { t } = useDashboardCopy();
  const reasons: string[] = [];
  const { rsi, macd, ema, stochastic } = signal.indicators;

  // Build 1-2 concise reasons from indicators
  if (signal.direction === 'BUY') {
    if (rsi.signal === 'oversold' || rsi.value < 35) reasons.push(formatMessage(t.explanation.rsiOversold, { value: rsi.value.toFixed(0) }));
    else if (rsi.value < 50) reasons.push(formatMessage(t.explanation.rsiBelowNeutral, { value: rsi.value.toFixed(0) }));
    if (macd.signal === 'bullish') reasons.push(t.explanation.macdBullish);
    if (ema.trend === 'up') reasons.push(t.explanation.priceAboveEma);
    if (stochastic.signal === 'oversold') reasons.push(t.explanation.stochasticOversold);
  } else {
    if (rsi.signal === 'overbought' || rsi.value > 65) reasons.push(formatMessage(t.explanation.rsiOverbought, { value: rsi.value.toFixed(0) }));
    else if (rsi.value > 50) reasons.push(formatMessage(t.explanation.rsiAboveNeutral, { value: rsi.value.toFixed(0) }));
    if (macd.signal === 'bearish') reasons.push(t.explanation.macdBearish);
    if (ema.trend === 'down') reasons.push(t.explanation.priceBelowEma);
    if (stochastic.signal === 'overbought') reasons.push(t.explanation.stochasticOverbought);
  }

  if (isHighRuleScore(signal.confidence)) reasons.push(formatMessage(t.explanation.multiIndicatorAlignment, { score: signal.confidence }));

  const display = reasons.slice(0, 2);
  if (display.length === 0) return null;

  return (
    <div className="mt-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-semibold">{t.explanation.title}</div>
      {display.map((r, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
          <span className="text-emerald-400 mt-0.5 shrink-0">&#x25B8;</span>
          <span>{r}</span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal, tfDirections }: { signal: TradingSignal; tfDirections?: TFDirection[] }) {
  const { t, language } = useDashboardCopy();
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="glass-card rounded-2xl p-3.5 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <bdi dir="ltr" className="text-sm font-semibold text-[var(--foreground)] font-mono tracking-tight">{signal.symbol}</bdi>
              {signal.dataQuality === 'real' && <LiveBadge />}
              <DataSourceBadge source={getDataSource(signal.symbol)} />
              {signal.dataQuality === 'synthetic' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{t.common.demo}</span>
              )}
            </div>
            <div dir="ltr" className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">{signal.timeframe} · {formatDashboardTimestamp(signal.timestamp, language)}</div>
            {/* Confluence pills — show TF agreement visually */}
            <div className="mt-1.5">
              <ConfluencePills timeframe={signal.timeframe} />
            </div>
            {tfDirections && tfDirections.length > 0 && (
              <div className="flex gap-1 mt-1.5 overflow-x-auto scrollbar-none">
                {tfDirections.map(tf => <TFBadgeInline key={tf.timeframe} tf={tf} />)}
              </div>
            )}
          </div>
          <DirectionBadge direction={signal.direction} />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ms-auto">
          <div className="text-end">
            <div className={`text-sm font-bold font-mono tabular-nums ${
              isHighRuleScore(signal.confidence) ? 'text-emerald-400' : signal.confidence >= 65 ? 'text-zinc-400' : 'text-red-400'
            }`}>{signal.confidence}/100</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <div className="text-[10px] text-[var(--text-secondary)]">{t.signal.scoreHint}</div>
              <HintBadge label={t.confidence.hint} />
            </div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={signal.confidence} showExplainer />

      {/* Explain the mechanical candidate score in one or two facts. */}
      <SignalExplanation signal={signal} />

      {/* Only the observed input price is public while the evidence gate is failed. */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2">
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">{t.levels.entry}</span>
        <bdi dir="ltr" className="text-[11px] font-mono font-semibold tabular-nums text-[var(--foreground)]">{formatPrice(signal.entry)}</bdi>
        <HintBadge label={t.levels.entryHint} />
      </div>

      {/* Quick indicators */}
      <div className="flex flex-wrap gap-2 mt-3">
        {(() => {
          const items = [
            { label: 'RSI', value: signal.indicators.rsi.value.toFixed(0), signal: signal.indicators.rsi.signal },
            { label: 'MACD', value: signal.indicators.macd.histogram > 0 ? `+${signal.indicators.macd.histogram}` : String(signal.indicators.macd.histogram), signal: signal.indicators.macd.signal },
            { label: t.indicators.trend, value: signal.indicators.ema.trend === 'up' ? t.indicators.up : signal.indicators.ema.trend === 'down' ? t.indicators.down : t.indicators.flat, signal: signal.indicators.ema.trend },
            { label: t.indicators.stochastic, value: `${signal.indicators.stochastic.k}`, signal: signal.indicators.stochastic.signal },
          ];
          return items.map(({ label, value, signal: sig }) => {
            const isBull = sig === 'bullish' || sig === 'oversold' || sig === 'up';
            const isBear = sig === 'bearish' || sig === 'overbought' || sig === 'down';
            return (
              <div key={label} className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span className={isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-[var(--text-secondary)]'}>{value}</span>
              </div>
            );
          });
        })()}
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          className="ms-auto text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--foreground)]"
        >
          {expanded ? '▴' : '▾'} {t.common.details}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[var(--text-secondary)] mb-2 uppercase text-[10px] tracking-wider">{t.indicators.emaStack}</div>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA20</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema20)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA50</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema50)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EMA200</span><span className="text-[var(--foreground)]">{formatPrice(signal.indicators.ema.ema200)}</span></div>
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)] mb-2 uppercase text-[10px] tracking-wider">{t.indicators.supportResistance}</div>
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
              <span>{formatMessage(t.indicators.bbWidth, { width: signal.indicators.bollingerBands.bandwidth.toFixed(2) })}</span>
              <span className={signal.dataQuality === 'real' ? 'text-emerald-400' : 'text-zinc-400'}>
                {signal.dataQuality === 'real' ? t.indicators.realTracked : t.indicators.demoSeeded}
              </span>
            </div>
          </div>
        </div>
      )}

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

function SignalHistory() {
  const { t } = useDashboardCopy();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/signals/history?limit=40&sort=resolved-first')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (data?.records) {
          const now = Date.now();
          // Show up to 10 resolved + up to 5 pending = 15 max
          const resolved = (data.records as HistoryRecord[]).filter((r: HistoryRecord) => r.outcomes['24h'] !== null).slice(0, 10);
          const pending = (data.records as HistoryRecord[]).filter((r: HistoryRecord) => isPendingHistoricalSignal(r, now)).slice(0, 5);
          setRecords([...resolved, ...pending]);
        }
      })
      .catch(() => { /* history is supplementary — fail silently */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (records.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">{t.history.heading}</h2>
      <p className="mb-3 max-w-3xl text-[11px] leading-5 text-[var(--text-secondary)]">
        {t.history.priceMoveSumHint}
      </p>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th className="px-4 py-2.5 text-start font-medium">{t.history.pair}</th>
                <th className="px-3 py-2.5 text-center font-medium">{t.history.direction}</th>
                <th className="px-3 py-2.5 text-center font-medium">{t.history.ruleScore}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t.history.directionalMove}</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const outcome24h = r.outcomes['24h'];
                const outcome4h = r.outcomes['4h'];
                const pnl = outcome24h?.pnlPct ?? outcome4h?.pnlPct ?? null;
                return (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td dir="ltr" className="px-4 py-2.5 text-[var(--foreground)] font-semibold">{r.pair}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{directionLabel(t, r.direction)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{r.confidence}/100</td>
                    <td dir="ltr" className={`px-4 py-2.5 text-end tabular-nums font-semibold ${
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
          <Link href="/track-record" data-evidence-event="record_inspected" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-mono">
            {t.history.viewRecord}
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, color = 'text-[var(--foreground)]' }: { value: string; label: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}><bdi dir="ltr">{value}</bdi></div>
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
  const { language, t } = useDashboardCopy();
  const { state: connectionState } = usePriceStream(TICKER_PAIRS);
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

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (timeframe !== 'ALL') params.set('timeframe', timeframe);
      if (direction !== 'ALL') params.set('direction', direction);
      params.set('minConfidence', '50');

      const [signalsRes, mtfRes] = await Promise.allSettled([
        fetch(`/api/signals?${params}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
        fetch('/api/signals/multi-tf').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
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

  // Keep the tab title in the active locale without turning hypotheses into alerts.
  useEffect(() => {
    document.title = t.document.title;

    return () => {
      document.title = t.document.title;
    };
  }, [t.document.title]);

  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const avgConfidence = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
    : 0;
  const bias = buyCount > sellCount ? 'BULL' : buyCount < sellCount ? 'BEAR' : 'NEUTRAL';
  const biasColor = bias === 'BULL' ? 'text-emerald-400' : bias === 'BEAR' ? 'text-red-400' : 'text-[var(--text-secondary)]';
  const biasLabel = bias === 'BULL' ? t.common.bias.bull : bias === 'BEAR' ? t.common.bias.bear : t.common.bias.neutral;

  return (
    <div className="premium-product-shell relative isolate min-h-[100dvh] overflow-hidden text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />

      <section className="border-b border-rose-500/20 bg-rose-500/[0.045] px-4 py-5" aria-labelledby="candidate-verdict-title">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Failed evidence gate
            </p>
            <h1 id="candidate-verdict-title" className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              Research candidates — not deployable
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The current cost-adjusted record is negative. These rows are rule-generated
              observations for inspection, not trade instructions. Broadcast and broker
              execution remain blocked.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <GateStateBadge />
            <Link href="/track-record" data-evidence-event="record_inspected" className="text-xs font-semibold text-[var(--foreground)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--brand)]">
              Inspect the record
            </Link>
            <Link href="/methodology" data-evidence-event="methodology_viewed" className="text-xs font-semibold text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--foreground)]">
              Read the method
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard controls */}
      <div data-tour-id="dashboard-controls" className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--background)]/50 overflow-x-auto scrollbar-none">
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
          <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {autoRefresh ? t.controls.auto : t.controls.paused}
        </button>
        {lastUpdate && (
          <span className="hidden sm:block text-xs text-[var(--text-secondary)] font-mono shrink-0">
            {lastUpdate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Data transparency bar — who powers the prices, where the fallback kicks in */}
      <div className="border-b border-[var(--border)] bg-emerald-500/[0.03]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.common.live}
          </span>
          <span>
            {t.transparency.providerBefore}{' '}
            <a
              href="https://twelvedata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline decoration-dotted underline-offset-2"
            >
              <bdi dir="ltr">Twelve Data API</bdi>
            </a>
            {' '}{t.transparency.providerAfter}
          </span>
          <span className="hidden md:inline text-white/20">·</span>
          <span className="italic text-[var(--text-secondary)]/80">
            {t.transparency.provenance}
          </span>
        </div>
      </div>

      {/* Synthetic data warning banner */}
      {syntheticSymbols.length > 0 && syntheticSymbols.length / SYMBOLS.length > 0.3 && (
        <div className="border-b border-zinc-500/20 bg-zinc-500/5 px-4 py-2">
          <p className="max-w-7xl mx-auto text-xs text-zinc-400/80 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 inline me-1" /> {formatMessage(t.warning.syntheticSymbols, { count: syntheticSymbols.length, total: SYMBOLS.length })}
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
{/* Hints removed for cleaner UI */}

        {/* Stats */}
        <div data-tour-id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard value={new Intl.NumberFormat(language).format(signals.length)} label={t.stats.activeSignals} />
          <StatCard value={`${avgConfidence}/100`} label={t.stats.averageRuleScore} />
          <StatCard value={biasLabel} label={t.stats.marketBias} color={biasColor} />
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
                {tf === 'ALL' ? t.common.all : <bdi dir="ltr">{tf}</bdi>}
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
                {d === 'ALL' ? t.common.all : directionLabel(t, d)}
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
                {assetClassLabel(t, ac)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSignals}
            className="px-4 py-1.5 rounded-xl text-xs border border-white/8 text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-all duration-200 font-mono shrink-0"
          >
            {t.common.refresh}
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
            <bdi dir="auto">{t.filters.highRuleScore}</bdi>
          </button>
        </div>

        {/* Signal grid */}
        <div data-tour-id="signal-grid">
        {(() => {
          let filteredSignals = signals.filter(s => ASSET_CLASSES[assetClass].includes(s.symbol));
          if (highConfOnly) filteredSignals = filteredSignals.filter(s => isHighRuleScore(s.confidence));
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
            const emptyTitle = assetClass === 'ALL'
              ? t.empty.noFilteredSignals
              : formatMessage(t.empty.noAssetSignals, { asset: assetClassLabel(t, assetClass) });
            const emptyDetail = assetClass === 'ALL'
              ? formatMessage(t.empty.adjustFilters, { count: new Intl.NumberFormat(language).format(signals.length) })
              : formatMessage(
                  assetClass === 'FOREX'
                    ? t.empty.otherCategoriesForex
                    : assetClass === 'METALS'
                      ? t.empty.otherCategoriesMetals
                      : t.empty.otherCategoriesOther,
                  { count: new Intl.NumberFormat(language).format(signals.length) },
                );
            return (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--glass-bg)] border border-[var(--border)] mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
                    <path d="M3 3h7l2 2h9v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3z" />
                    <path d="M12 11v4" /><path d="M12 17h.01" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                  {emptyTitle}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
                  {emptyDetail}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {assetClass !== 'ALL' && (
                    <button
                      onClick={() => setAssetClass('ALL' as AssetClass)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                    >
                      {t.empty.showAllAssets}
                    </button>
                  )}
                  <button onClick={fetchSignals} className="px-4 py-2 rounded-xl text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-all duration-200 font-mono">
                    {t.common.refresh}
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
                  <span className="text-emerald-400 text-sm font-mono">{t.empty.generating}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-1">
                  {t.empty.analyzing}
                </p>
                <p className="text-[var(--text-secondary)] text-xs mb-4">
                  {t.empty.autoRetrying}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={fetchSignals} className="px-4 py-2 rounded-xl text-xs border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 font-mono">
                    {t.empty.retryNow}
                  </button>
                  <Link
                    href="/methodology"
                    data-evidence-event="methodology_viewed"
                    className="px-4 py-2 rounded-xl text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-all duration-200 font-mono"
                  >
                    Read the method
                  </Link>
                </div>
              </div>
            );
          }
          return (
            <>
              {/* Main signals (70/100+) */}
              {mainSignals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {mainSignals.map(signal => (
                    <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} />
                  ))}
                </div>
              )}
              {mainSignals.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-[var(--text-secondary)] mb-2 font-mono">{t.empty.noHighScoreCandidates}</p>
                  {potentialSignals.length > 0 && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatMessage(t.empty.potentialBelow, { count: new Intl.NumberFormat(language).format(potentialSignals.length) })}
                    </p>
                  )}
                </div>
              )}

              {/* Potential signals (50-69%) */}
              {potentialSignals.length > 0 && (
                <section className="mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs uppercase tracking-wider text-zinc-400/80 font-mono font-semibold">{t.potential.heading}</h2>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono px-2 py-0.5 rounded-full bg-zinc-500/8 border border-zinc-500/15">{t.potential.scoreBand}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{formatMessage(t.potential.count, { count: new Intl.NumberFormat(language).format(potentialSignals.length) })}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">{t.potential.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-80">
                    {potentialSignals.map(signal => (
                      <SignalCard key={signal.id} signal={signal} tfDirections={tfMap.get(signal.symbol)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()}
        </div>

        {/* Signal history / track record */}
        <SignalHistory />

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs text-zinc-800 font-mono">{t.footer.tagline}</p>
          <p className="text-xs text-zinc-800 mt-1">{t.footer.disclaimer}</p>
        </footer>
      </div>
    </div>
  );
}

export default DashboardClient;
