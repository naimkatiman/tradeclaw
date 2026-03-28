import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { SignalShareButtons } from '../../components/signal-share-buttons';
import { EmbedButton } from '../../components/embed-button';
import { AIAnalysisPanel } from '../../components/ai-analysis-panel';
import { SetAlertButton } from '../../components/set-alert-button';
import { SignalChartSection } from './SignalChartSection';

function formatPrice(p: number): string {
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

  const { signals } = await getTrackedSignals({ symbol, timeframe, direction });
  if (signals.length === 0) notFound();

  const signal = signals[0];
  const isBuy = signal.direction === 'BUY';
  const accentClass = isBuy ? 'text-emerald-400' : 'text-red-400';
  const signalPath = `/signal/${symbol}-${timeframe}-${direction}`;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
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
                : signal.confidence >= 65 ? 'text-yellow-400'
                : 'text-red-400'
              }`}>
                {signal.confidence}%
              </div>
              <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">confidence</div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="relative h-1.5 w-full rounded-full bg-white/5 mb-8">
            <div
              className="absolute h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${signal.confidence}%`,
                background: signal.confidence >= 80 ? '#10B981'
                  : signal.confidence >= 65 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
            {[
              { label: 'Entry', value: signal.entry, color: 'text-white' },
              { label: 'Stop Loss', value: signal.stopLoss, color: 'text-red-400' },
              { label: 'TP1', value: signal.takeProfit1, color: 'text-emerald-400' },
              { label: 'TP2', value: signal.takeProfit2, color: 'text-emerald-400' },
              { label: 'TP3', value: signal.takeProfit3, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl py-3 px-2 text-center border border-white/5">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">{label}</div>
                <div className={`text-xs font-mono font-semibold tabular-nums ${color}`}>
                  {formatPrice(value)}
                </div>
              </div>
            ))}
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
