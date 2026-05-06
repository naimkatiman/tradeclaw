import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';
import type { Metadata } from 'next';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { getRecordByIdAsync, type SignalHistoryRecord } from '../../../lib/signal-history';
import { resolveAccessContextFromCookies, getUserTier } from '../../../lib/tier';
import { readSessionFromCookies } from '../../../lib/user-session';
import { SignalShareButtons } from '../../components/signal-share-buttons';
import { EmbedButton } from '../../components/embed-button';
import { AIAnalysisPanel } from '../../components/ai-analysis-panel';
import { SetAlertButton } from '../../components/set-alert-button';
import { SignalChartSection } from './SignalChartSection';
import { SYMBOLS, type TradingSignal } from '../../lib/signals';
import { InfoHint } from '../../../components/InfoHint';
import { STAT_HINTS } from '../../../lib/stat-hints';

const HINT_ENTRY = 'Mid-price at signal emission. Slippage and spread are applied later when computing P&L.';
const HINT_STOP_LOSS = 'Risk anchor — sized at ATR × multiplier from entry. SL hit = -1R, TP1 hit = +1R reference for the equity card.';
const HINT_TP = 'Take-profit ladder. TP1 = primary 1R target, TP2/TP3 are scale-out levels for partial closes.';

function LockedPrice({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/5 px-2 py-0.5 font-mono text-emerald-400/80 text-[11px]"
      aria-label={`${label} requires Pro`}
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      <span className="select-none tracking-widest">••••</span>
    </span>
  );
}

function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

type Params = { id: string };

interface ResolvedId {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
}

/**
 * Parse a /signal/[id] segment into (symbol, timeframe, direction) without
 * hitting the DB. Three id formats are supported:
 *   1. Canonical row id — `SIG-SYMBOL-TF-DIRECTION-{base36ts}` (current writer).
 *   2. Canonical share URL — `SYMBOL-TF-DIRECTION` (e.g. BTCUSD-H1-BUY).
 *   3. Legacy row id — `SYMBOL-TF-TIMESTAMP` (e.g. TSLAUSD-M15-1777733611049),
 *      written historically by /api/signals/record before it switched to SIG-*.
 *      Direction isn't in the id, so caller falls back to the DB row when
 *      structural parsing alone can't recover it.
 */
function parseIdStructure(id: string): ResolvedId | null {
  const parts = id.toUpperCase().split('-');
  if (parts.length < 3) return null;

  // Format 1: SIG-{sym}-{tf}-{dir}-{base36}. Direction sits at parts[len-2].
  if (parts.length >= 5 && parts[0] === 'SIG') {
    const dirCandidate = parts[parts.length - 2];
    if (dirCandidate === 'BUY' || dirCandidate === 'SELL') {
      return {
        symbol: parts.slice(1, parts.length - 3).join('-'),
        timeframe: parts[parts.length - 3],
        direction: dirCandidate,
      };
    }
  }

  // Format 2: SYMBOL-TF-DIRECTION (canonical share URL).
  const last = parts[parts.length - 1];
  if (last === 'BUY' || last === 'SELL') {
    return {
      symbol: parts.slice(0, parts.length - 2).join('-'),
      timeframe: parts[parts.length - 2],
      direction: last,
    };
  }

  // Format 3: SYMBOL-TF-TIMESTAMP — direction unknown structurally, default
  // to BUY. Caller should prefer the DB row (which carries the real direction)
  // when one is found.
  if (/^\d+$/.test(last)) {
    return {
      symbol: parts.slice(0, parts.length - 2).join('-'),
      timeframe: parts[parts.length - 2],
      direction: 'BUY',
    };
  }

  return null;
}

async function resolveId(id: string): Promise<ResolvedId | null> {
  const structural = parseIdStructure(id);
  if (structural) return structural;

  // Last-ditch DB lookup for ids we can't structurally parse.
  const record = await getRecordByIdAsync(id);
  if (record) {
    return {
      symbol: record.pair,
      timeframe: record.timeframe,
      direction: record.direction,
    };
  }
  return null;
}

/**
 * Stub indicator block used when we render a historical record but live TA
 * is unavailable for the same (symbol, tf, direction). The UI hides the
 * indicator card in that case, so these values are never read — they exist
 * only to satisfy the TradingSignal shape.
 */
const STUB_INDICATORS: TradingSignal['indicators'] = {
  rsi: { value: 50, signal: 'neutral' },
  macd: { histogram: 0, signal: 'neutral' },
  ema: { trend: 'sideways', ema20: 0, ema50: 0, ema200: 0 },
  bollingerBands: { position: 'middle', bandwidth: 0 },
  stochastic: { k: 50, d: 50, signal: 'neutral' },
  support: [],
  resistance: [],
};

/**
 * Build a TradingSignal-shaped display object from a stored history row,
 * optionally enriched with live indicators. TP2/TP3 are reverse-computed
 * from the stored TP1 using the same 2.0/3.0/4.5 R-multiple ladder the
 * live engine writes (see signal-generator.ts). Free callers see them
 * masked at render time.
 */
function buildHistoricalSignal(
  record: SignalHistoryRecord,
  liveIndicators: TradingSignal['indicators'] | null,
): TradingSignal {
  const entry = record.entryPrice;
  const tp1 = record.tp1 ?? entry;
  const sl = record.sl ?? entry;
  const r = (tp1 - entry) / 2; // signed R: positive for BUY, negative for SELL
  const tp2 = record.tp1 != null ? +(entry + 3 * r).toFixed(5) : null;
  const tp3 = record.tp1 != null ? +(entry + 4.5 * r).toFixed(5) : null;

  return {
    id: record.id,
    symbol: record.pair,
    direction: record.direction,
    confidence: record.confidence,
    entry,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    indicators: liveIndicators ?? STUB_INDICATORS,
    timeframe: record.timeframe as TradingSignal['timeframe'],
    timestamp: new Date(record.timestamp).toISOString(),
    status: 'active',
    source: 'real',
    dataQuality: 'real',
    entryAtr: record.entryAtr,
    atrMultiplier: record.atrMultiplier,
    strategyId: record.strategyId,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveId(id);
  const symbol = resolved?.symbol ?? id.toUpperCase();
  const direction = resolved?.direction ?? '';
  const timeframe = resolved?.timeframe ?? '';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradeclaw.com';
  const ogUrl = `${baseUrl}/api/og/signal/${id}`;

  return {
    title: `${symbol} ${direction} Signal — TradeClaw`,
    description: `AI-generated ${direction} signal for ${symbol} on ${timeframe} timeframe. Free open-source trading signals.`,
    openGraph: {
      title: `${symbol} ${direction} Signal — TradeClaw`,
      description: `Live AI trading signal: ${symbol} ${direction} on ${timeframe}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${symbol} ${direction} Signal — TradeClaw`,
      description: `Live AI trading signal: ${symbol} ${direction} on ${timeframe}`,
      images: [ogUrl],
    },
  };
}

export default async function SignalPage(
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  // Look up the historical row first. This makes /signal/SIG-* URLs render
  // a permanent record of what we said at emission, instead of re-running
  // live TA and 404'ing whenever the current setup no longer produces the
  // same direction/score (which 4631+ rows in /track-record can hit).
  const record = await getRecordByIdAsync(id);
  const resolved = record
    ? { symbol: record.pair, timeframe: record.timeframe, direction: record.direction }
    : await resolveId(id);
  if (!resolved) notFound();

  const { symbol, timeframe, direction } = resolved;

  const ctx = await resolveAccessContextFromCookies();
  // Live TA is best-effort: feeds the indicator card and (for Pro) the chart
  // markers. If a record exists, the page still renders without it.
  const taResult = await getTrackedSignals({ symbol, timeframe, direction, ctx });
  const liveSignal = taResult.signals[0] ?? null;

  if (!record && !liveSignal) notFound();

  // Tier gate: this page is a public preview surface (SEO + conversion funnel),
  // so we render any symbol the teaser surfaces — but free/anon viewers see
  // TP2/TP3 masked. Price chart is also Pro-only (handled below).
  // Symbol-level gating belongs on /api/signals (data access), not here.
  const session = await readSessionFromCookies();
  const tier = session?.userId ? await getUserTier(session.userId) : 'free';
  const isPaid = tier !== 'free';

  const baseSignal: TradingSignal = record
    ? buildHistoricalSignal(record, liveSignal?.indicators ?? null)
    : (liveSignal as TradingSignal);

  const signal: TradingSignal = isPaid
    ? baseSignal
    : { ...baseSignal, takeProfit2: null, takeProfit3: null };

  const indicatorsAvailable = liveSignal !== null;
  const outcome4h = record?.outcomes['4h'] ?? null;
  const outcome24h = record?.outcomes['24h'] ?? null;
  const isHistorical = record !== undefined;

  const isBuy = signal.direction === 'BUY';
  const signalPath = `/signal/${symbol}-${timeframe}-${direction}`;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <TradeClawLogo className="h-4 w-4 shrink-0" id="signal" />
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <SetAlertButton symbol={signal.symbol} currentPrice={signal.entry} />
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              View All Signals →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Main signal card */}
        <div className="glass-card rounded-2xl p-6 mb-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-4xl font-bold font-mono tracking-tight text-white mb-3">
                {signal.symbol}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded text-sm font-bold tracking-wider ${
                  isBuy
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                }`}>
                  {signal.direction}
                </span>
                <span className="text-zinc-500 text-sm font-mono">{signal.timeframe}</span>
                <span className="text-zinc-700 text-xs font-mono">
                  {new Date(signal.timestamp).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-5xl font-bold font-mono tabular-nums ${
                signal.confidence >= 80 ? 'text-emerald-400'
                : signal.confidence >= 65 ? 'text-zinc-400'
                : 'text-red-400'
              }`}>
                {signal.confidence}%
              </div>
              <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider inline-flex items-center justify-end gap-1">
                confidence
                <InfoHint text={STAT_HINTS.avgConfidence} label="What confidence means" />
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="relative h-1.5 w-full rounded-full bg-white/5 mb-8">
            <div
              className="absolute h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${signal.confidence}%`,
                background: signal.confidence >= 80 ? '#10B981'
                  : signal.confidence >= 65 ? '#a1a1aa' : '#EF4444',
              }}
            />
          </div>

          {/* Outcome banner — only on historical rows. Surfaces what the
              4h/24h cron has resolved, so the page no longer pretends a
              week-old signal is "live". */}
          {isHistorical && (
            <div className="mb-6 grid grid-cols-2 gap-2">
              {[
                { label: '4h', outcome: outcome4h },
                { label: '24h', outcome: outcome24h },
              ].map(({ label, outcome }) => {
                const pending = outcome == null;
                const hit = outcome?.hit === true;
                const tone = pending
                  ? 'text-zinc-500 border-white/5'
                  : hit
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    : 'text-red-400 border-red-500/20 bg-red-500/5';
                return (
                  <div
                    key={label}
                    className={`rounded-xl border px-3 py-2 text-center ${tone}`}
                  >
                    <div className="text-[10px] uppercase tracking-wider opacity-70">
                      {label} outcome
                    </div>
                    <div className="text-sm font-semibold font-mono mt-0.5">
                      {pending ? 'pending' : hit ? 'TP hit' : 'SL hit'}
                      {outcome?.pnlPct != null && (
                        <span className="ml-2 text-xs opacity-80 tabular-nums">
                          {outcome.pnlPct > 0 ? '+' : ''}
                          {outcome.pnlPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Price levels */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
            {[
              { label: 'Entry', value: signal.entry, color: 'text-white', hint: HINT_ENTRY },
              { label: 'Stop Loss', value: signal.stopLoss, color: 'text-red-400', hint: HINT_STOP_LOSS },
              { label: 'TP1', value: signal.takeProfit1, color: 'text-emerald-400', hint: HINT_TP },
              { label: 'TP2', value: signal.takeProfit2, color: 'text-emerald-400', hint: HINT_TP },
              { label: 'TP3', value: signal.takeProfit3, color: 'text-emerald-400', hint: HINT_TP },
            ].map(({ label, value, color, hint }) => {
              const isLocked = !isPaid && value == null;
              return (
                <div key={label} className="bg-white/[0.03] rounded-xl py-3 px-2 text-center border border-white/5">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 inline-flex items-center justify-center gap-1">
                    {label}
                    <InfoHint text={hint} label={`What ${label} means`} />
                  </div>
                  {isLocked ? (
                    <LockedPrice label={label} />
                  ) : (
                    <div className={`text-xs font-mono font-semibold tabular-nums ${color}`}>
                      {formatPrice(value)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Indicators grid — only renders when the live TA engine
              produced a fresh signal for this (symbol, tf, direction).
              Historical rows don't carry indicator snapshots, and stale
              indicators on a 7-day-old signal would be misleading. */}
          {indicatorsAvailable && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Technical indicators */}
            <div>
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">
                Technical Indicators
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-mono">RSI</span>
                  <span className={`text-xs font-mono tabular-nums ${
                    signal.indicators.rsi.signal === 'oversold' ? 'text-emerald-400'
                    : signal.indicators.rsi.signal === 'overbought' ? 'text-red-400'
                    : 'text-zinc-300'
                  }`}>
                    {signal.indicators.rsi.value.toFixed(1)}{' '}
                    <span className="text-zinc-600">({signal.indicators.rsi.signal})</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-mono">MACD Hist</span>
                  <span className={`text-xs font-mono tabular-nums ${
                    signal.indicators.macd.signal === 'bullish' ? 'text-emerald-400'
                    : signal.indicators.macd.signal === 'bearish' ? 'text-red-400'
                    : 'text-zinc-300'
                  }`}>
                    {signal.indicators.macd.histogram > 0 ? '+' : ''}
                    {signal.indicators.macd.histogram}{' '}
                    <span className="text-zinc-600">({signal.indicators.macd.signal})</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-mono">EMA Trend</span>
                  <span className={`text-xs font-mono ${
                    signal.indicators.ema.trend === 'up' ? 'text-emerald-400'
                    : signal.indicators.ema.trend === 'down' ? 'text-red-400'
                    : 'text-zinc-300'
                  }`}>
                    {signal.indicators.ema.trend.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-mono">Stochastic K/D</span>
                  <span className={`text-xs font-mono tabular-nums ${
                    signal.indicators.stochastic.signal === 'oversold' ? 'text-emerald-400'
                    : signal.indicators.stochastic.signal === 'overbought' ? 'text-red-400'
                    : 'text-zinc-300'
                  }`}>
                    {signal.indicators.stochastic.k} / {signal.indicators.stochastic.d}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-mono">BB Position</span>
                  <span className="text-xs font-mono text-zinc-300">
                    {signal.indicators.bollingerBands.position}
                    <span className="text-zinc-600 ml-1">
                      (bw: {signal.indicators.bollingerBands.bandwidth}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* EMA stack + S/R */}
            <div>
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">EMA Stack</div>
              <div className="space-y-2 mb-5 font-mono">
                {[
                  { label: 'EMA 20', value: signal.indicators.ema.ema20 },
                  { label: 'EMA 50', value: signal.indicators.ema.ema50 },
                  { label: 'EMA 200', value: signal.indicators.ema.ema200 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs text-zinc-500">{label}</span>
                    <span className="text-xs tabular-nums text-zinc-300">{formatPrice(value)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">S/R Levels</div>
              <div className="space-y-1.5 font-mono">
                {signal.indicators.support.map((s, i) => (
                  <div key={`s${i}`} className="flex justify-between">
                    <span className="text-xs text-zinc-500">S{i + 1}</span>
                    <span className="text-xs tabular-nums text-emerald-400">{formatPrice(s)}</span>
                  </div>
                ))}
                {signal.indicators.resistance.map((r, i) => (
                  <div key={`r${i}`} className="flex justify-between">
                    <span className="text-xs text-zinc-500">R{i + 1}</span>
                    <span className="text-xs tabular-nums text-red-400">{formatPrice(r)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Signal metadata */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-700">
            <span>{signal.id}</span>
            <span className={signal.source === 'real' ? 'text-emerald-900' : 'text-zinc-800'}>
              {signal.source === 'real' ? 'Real TA' : 'Fallback'} · Engine v2.0
            </span>
          </div>
        </div>

        {/* Price Chart (Pro only — the chart visualises the locked prices) */}
        {isPaid ? (
          <SignalChartSection
            entry={signal.entry}
            stopLoss={signal.stopLoss}
            takeProfit1={signal.takeProfit1}
            takeProfit2={signal.takeProfit2}
            takeProfit3={signal.takeProfit3}
            direction={signal.direction}
            timestamp={signal.timestamp}
            pip={SYMBOLS.find(s => s.symbol === signal.symbol)?.pip ?? 0.01}
          />
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center border border-emerald-500/20 bg-emerald-500/5">
            <Lock className="mx-auto mb-3 h-6 w-6 text-emerald-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-emerald-400">
              Price chart with entry, SL, and TP lines is a Pro feature
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Upgrade to Pro to unlock real-time signals, full TP ladder, and the
              live price chart for every signal.
            </p>
            <Link
              href="/pricing?from=signal-detail"
              className="mt-4 inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Upgrade to Pro — $29/mo
            </Link>
          </div>
        )}

        {/* AI Analysis Panel */}
        <AIAnalysisPanel symbol={signal.symbol} timeframe={signal.timeframe} />

        {/* Share + Embed buttons */}
        <SignalShareButtons signal={signal} signalPath={signalPath} />
        <div className="glass-card rounded-2xl p-4 mt-3">
          <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">Embed</div>
          <div className="flex gap-2">
            <EmbedButton pair={signal.symbol} />
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            View All Signals →
          </Link>
        </div>
      </div>

      <footer className="pb-8 text-center">
        <p className="text-xs text-zinc-800 font-mono">
          TradeClaw Signal Scanner · Open Source · Self-Hosted
        </p>
        <p className="text-xs text-zinc-800 mt-1">
          Signal analysis is for educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
