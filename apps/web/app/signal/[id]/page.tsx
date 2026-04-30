import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';
import type { Metadata } from 'next';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { resolveLicenseFromCookies } from '../../../lib/licenses';
import { readSessionFromCookies } from '../../../lib/user-session';
import { getUserTier } from '../../../lib/tier';
import { getActiveSignals } from '../../../lib/signal-repo';
import { SignalShareButtons } from '../../components/signal-share-buttons';
import { EmbedButton } from '../../components/embed-button';
import { AIAnalysisPanel } from '../../components/ai-analysis-panel';
import { SetAlertButton } from '../../components/set-alert-button';
import { SignalChartSection } from './SignalChartSection';
import { SYMBOLS } from '../../lib/signals';
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

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params;
  const parts = id.toUpperCase().split('-');
  const direction = parts[parts.length - 1];
  const timeframe = parts[parts.length - 2];
  const symbol = parts.slice(0, parts.length - 2).join('-');

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
  const parts = id.toUpperCase().split('-');

  if (parts.length < 3) notFound();

  const direction = parts[parts.length - 1] as 'BUY' | 'SELL';
  const timeframe = parts[parts.length - 2];
  const symbol = parts.slice(0, parts.length - 2).join('-');

  if (direction !== 'BUY' && direction !== 'SELL') notFound();

  // Try DB first, fall back to TA engine
  let signals: Awaited<ReturnType<typeof getTrackedSignals>>['signals'] = [];
  try {
    if (process.env.DATABASE_URL) {
      const dbResult = await getActiveSignals({ symbol, timeframe, direction });
      if (dbResult.signals.length > 0 && !dbResult.isStale) {
        // Map DB LiveSignal to TradingSignal shape for the page
        signals = dbResult.signals.map(s => ({
          id: s.id,
          symbol: s.symbol,
          direction: s.signal,
          confidence: s.confidence,
          entry: s.entry,
          stopLoss: s.sl,
          takeProfit1: s.tp1,
          takeProfit2: s.tp2,
          takeProfit3: s.tp3 ?? s.tp2,
          indicators: {
            rsi: { value: s.indicators?.rsi ?? 50, signal: (s.indicators?.rsi ?? 50) < 30 ? 'oversold' as const : (s.indicators?.rsi ?? 50) > 70 ? 'overbought' as const : 'neutral' as const },
            macd: { histogram: s.indicators?.macd_histogram ?? 0, signal: (s.indicators?.macd_histogram ?? 0) > 0 ? 'bullish' as const : 'bearish' as const },
            ema: { trend: s.indicators?.ema_trend ?? 'up', ema20: 0, ema50: 0, ema200: 0 },
            bollingerBands: { position: 'middle' as const, bandwidth: 0 },
            stochastic: { k: s.indicators?.stochastic_k ?? 50, d: 50, signal: (s.indicators?.stochastic_k ?? 50) < 20 ? 'oversold' as const : (s.indicators?.stochastic_k ?? 50) > 80 ? 'overbought' as const : 'neutral' as const },
            support: [],
            resistance: [],
          },
          timeframe: s.timeframe as 'M5' | 'M15' | 'H1' | 'H4' | 'D1',
          timestamp: s.timestamp,
          status: 'active' as const,
          source: s.source as 'real' | 'fallback',
        }));
      }
    }
  } catch {
    // DB unavailable — fall through to TA engine
  }

  if (signals.length === 0) {
    const ctx = await resolveLicenseFromCookies();
    const taResult = await getTrackedSignals({ symbol, timeframe, direction, ctx });
    signals = taResult.signals;
  }

  if (signals.length === 0) notFound();

  const signal = signals[0];
  const isBuy = signal.direction === 'BUY';
  const signalPath = `/signal/${symbol}-${timeframe}-${direction}`;

  // Tier gate: free/anon viewers see Entry/SL/TP1 but TP2/TP3 are masked
  // (payload already nulls them via filterSignalByTier), and the price
  // chart is Pro-only.
  const session = await readSessionFromCookies();
  const tier = session?.userId ? await getUserTier(session.userId) : 'free';
  const isPaid = tier !== 'free';

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

          {/* Indicators grid */}
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
