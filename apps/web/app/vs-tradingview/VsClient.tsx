'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ─── types ─── */
interface IndicatorSummary {
  rsi: number;
  macd: { histogram: number; signal: number; macd: number };
  ema: { ema20: number; ema50: number };
  bollingerBands: { upper: number; middle: number; lower: number; position: string };
  stochastic: { k: number; d: number };
  atr: number;
  adx: number;
  volumeProfile: string;
  [key: string]: unknown;
}

interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  indicators: IndicatorSummary;
  timeframe: string;
  timestamp: string;
  status: string;
  source?: string;
  dataQuality?: string;
}

interface ExplainData {
  markdown: string;
  summary: string;
  confluenceScore: number;
  riskReward: number;
}

/* ─── constants ─── */
const ASSETS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD'] as const;
const TIMEFRAMES = ['H1', 'H4', 'D1'] as const;

const COMPARISON_ROWS: {
  feature: string;
  tradeclaw: boolean | string;
  tradingview: boolean | string;
  threecommas: boolean | string;
}[] = [
  { feature: 'Signal Confluence', tradeclaw: true, tradingview: false, threecommas: false },
  { feature: 'AI Explanation', tradeclaw: true, tradingview: false, threecommas: false },
  { feature: 'API Access', tradeclaw: true, tradingview: true, threecommas: true },
  { feature: 'Self-hosted', tradeclaw: true, tradingview: false, threecommas: false },
  { feature: 'Free Tier', tradeclaw: 'Free forever', tradingview: '$15-60/mo', threecommas: '$49/mo' },
  { feature: 'Telegram Alerts', tradeclaw: true, tradingview: false, threecommas: true },
  { feature: 'Webhook Support', tradeclaw: true, tradingview: true, threecommas: true },
  { feature: 'Multi-Timeframe', tradeclaw: true, tradingview: false, threecommas: false },
];

/* ─── helpers ─── */
function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const colors = {
    BUY: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    SELL: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    NEUTRAL: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${colors[direction]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${direction === 'BUY' ? 'bg-emerald-400' : direction === 'SELL' ? 'bg-rose-400' : 'bg-zinc-400'}`} />
      {direction}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-white/80">{value}%</span>
    </div>
  );
}

function IndicatorRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono text-white/80">{value}</span>
        {sub && <span className="block text-[10px] text-zinc-600">{sub}</span>}
      </div>
    </div>
  );
}

function MissingFeature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 opacity-40">
      <span className="text-rose-500 text-xs">&#10008;</span>
      <span className="text-xs text-zinc-600 line-through">{label}</span>
    </div>
  );
}

function CheckCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span className="text-xs">{value}</span>;
  return value ? (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/5 text-zinc-600">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </span>
  );
}

function derivePineDirection(rsi: number, macdHist: number): 'BUY' | 'SELL' | 'NEUTRAL' {
  if (rsi < 40 && macdHist > 0) return 'BUY';
  if (rsi > 60 && macdHist < 0) return 'SELL';
  return 'NEUTRAL';
}

/* ─── main component ─── */
export function VsClient() {
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('BTCUSD');
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>('H1');
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [explain, setExplain] = useState<ExplainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const [sigRes, expRes] = await Promise.all([
        fetch(`/api/signals?symbol=${asset}&timeframe=${timeframe}`),
        fetch(`/api/explain?symbol=${asset}&timeframe=${timeframe}`),
      ]);
      const sigData = await sigRes.json();
      const expData = await expRes.json();

      if (sigData.signals?.length > 0) {
        setSignal(sigData.signals[0]);
      }
      if (expData.summary) {
        setExplain(expData);
      }
      setLastFetch(new Date().toLocaleTimeString());
    } catch {
      // silently fail — will retry on next interval
    } finally {
      setLoading(false);
    }
  }, [asset, timeframe]);

  const handleCompare = () => {
    fetchComparison();
    // Set up 60s auto-refresh
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchComparison, 60_000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Reset on asset/timeframe change
  useEffect(() => {
    setSignal(null);
    setExplain(null);
    setLastFetch(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [asset, timeframe]);

  const ind = signal?.indicators;
  const pineDirection = ind ? derivePineDirection(ind.rsi, ind.macd.histogram) : 'NEUTRAL';

  const shareText = `TradeClaw gives you confluence signals with AI explanations — for free. TradingView gives you raw indicators for $60/mo.\n\nSee the live comparison:`;
  const shareUrl = 'https://tradeclaw.com/vs-tradingview';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              TradeClaw <span className="text-emerald-400">vs</span> TradingView
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">Same Asset, Same Time, Different Depth</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mt-6 mb-8">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value as (typeof ASSETS)[number])}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          >
            {ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Loading...' : 'Compare Now'}
          </button>

          {lastFetch && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Auto-refresh 60s &middot; {lastFetch}</span>
            </div>
          )}
        </div>

        {/* Side-by-side panels */}
        {signal && ind ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
            {/* LEFT: TradeClaw */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">TradeClaw</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">Free</span>
                </div>
                <DirectionBadge direction={signal.direction} />
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 block">Confidence</span>
                <ConfidenceBar value={signal.confidence} />
              </div>

              <div className="space-y-0">
                <IndicatorRow
                  label="RSI (14)"
                  value={ind.rsi.toFixed(1)}
                  sub={ind.rsi > 70 ? 'Overbought' : ind.rsi < 30 ? 'Oversold' : 'Neutral zone'}
                />
                <IndicatorRow
                  label="MACD Histogram"
                  value={ind.macd.histogram.toFixed(4)}
                  sub={ind.macd.histogram > 0 ? 'Bullish momentum' : 'Bearish momentum'}
                />
                <IndicatorRow
                  label="EMA 20 / 50"
                  value={`${ind.ema.ema20.toFixed(2)} / ${ind.ema.ema50.toFixed(2)}`}
                  sub={ind.ema.ema20 > ind.ema.ema50 ? 'Bullish cross' : 'Bearish cross'}
                />
                <IndicatorRow
                  label="Bollinger Position"
                  value={ind.bollingerBands.position}
                />
                <IndicatorRow
                  label="Stochastic %K / %D"
                  value={`${ind.stochastic.k.toFixed(1)} / ${ind.stochastic.d.toFixed(1)}`}
                />
                <IndicatorRow
                  label="TP1 / TP2 / TP3"
                  value={`${signal.takeProfit1.toFixed(2)} / ${signal.takeProfit2.toFixed(2)} / ${signal.takeProfit3.toFixed(2)}`}
                />
                <IndicatorRow
                  label="Stop Loss"
                  value={signal.stopLoss.toFixed(2)}
                />
              </div>

              {/* Multi-TF consensus */}
              {explain && (
                <div className="mt-4 rounded-lg border border-emerald-500/10 bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Confluence Score</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{explain.confluenceScore}/100</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{explain.summary}</p>
                  <Link href={`/explain?symbol=${asset}&timeframe=${timeframe}`} className="inline-block mt-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Open Full Analysis &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* RIGHT: TradingView / Pine Script */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">TradingView</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 border border-zinc-700">$15-60/mo</span>
                </div>
                <DirectionBadge direction={pineDirection} />
              </div>

              <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Pine Script Strategy Output</p>
                <p className="text-xs text-zinc-500">Basic RSI + MACD crossover strategy. Raw indicators only.</p>
              </div>

              <div className="space-y-0">
                <IndicatorRow
                  label="RSI (14)"
                  value={ind.rsi.toFixed(1)}
                  sub="Raw value only"
                />
                <IndicatorRow
                  label="MACD Histogram"
                  value={ind.macd.histogram.toFixed(4)}
                  sub="No confluence weighting"
                />
                <IndicatorRow
                  label="EMA 20 / 50"
                  value={`${ind.ema.ema20.toFixed(2)} / ${ind.ema.ema50.toFixed(2)}`}
                  sub="Manual interpretation required"
                />
              </div>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">Pine Script gives you raw indicators. TradeClaw gives you confluence signals.</p>
              </div>

              <div className="mt-3">
                <MissingFeature label="AI Explanation" />
                <MissingFeature label="Confluence Score" />
                <MissingFeature label="TP/SL Auto-Calc" />
                <MissingFeature label="Multi-Timeframe Consensus" />
                <MissingFeature label="API Access (free)" />
                <MissingFeature label="Self-hosted Option" />
              </div>

              <p className="mt-4 text-[10px] text-zinc-700 text-center">TradingView requires $15-55/month for alerts and strategies</p>
            </div>
          </div>
        ) : !loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center mb-12">
            <div className="text-4xl mb-3 opacity-30">&#x2194;</div>
            <p className="text-sm text-[var(--text-secondary)]">Select an asset and timeframe, then click <strong>Compare Now</strong> to see a live side-by-side comparison.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4 animate-pulse">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-2/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mb-12">
          <h2 className="text-xl font-bold tracking-tight mb-6">
            Feature <span className="text-emerald-400">Comparison</span>
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/6 bg-[#0a0a0a]">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-zinc-600 w-[40%]">Feature</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-emerald-400 font-bold text-sm">TradeClaw</span>
                  </th>
                  <th className="px-4 py-4 text-center text-zinc-500 font-medium">TradingView</th>
                  <th className="px-4 py-4 text-center text-zinc-500 font-medium">3Commas</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/4 transition-colors hover:bg-white/[0.015] ${i === COMPARISON_ROWS.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-3.5 text-zinc-300">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center bg-emerald-500/[0.03]">
                      {typeof row.tradeclaw === 'string' ? (
                        <span className="font-bold text-emerald-400 text-xs">{row.tradeclaw}</span>
                      ) : (
                        <div className="flex justify-center"><CheckCell value={row.tradeclaw} /></div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-zinc-400">
                      {typeof row.tradingview === 'string' ? (
                        <span className="text-xs text-zinc-500">{row.tradingview}</span>
                      ) : (
                        <div className="flex justify-center"><CheckCell value={row.tradingview} /></div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-zinc-400">
                      {typeof row.threecommas === 'string' ? (
                        <span className="text-xs text-zinc-500">{row.threecommas}</span>
                      ) : (
                        <div className="flex justify-center"><CheckCell value={row.threecommas} /></div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Share this comparison</span>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Tweet
          </a>
          <a
            href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('TradeClaw vs TradingView — Free open-source signals with AI explanation')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.203-.094z" /></svg>
            Reddit
          </a>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/10 p-8 text-center">
          <h3 className="text-lg font-bold mb-2">Ready to upgrade from raw indicators?</h3>
          <p className="text-sm text-zinc-400 mb-5 max-w-lg mx-auto">
            TradeClaw gives you confluence-weighted signals, AI explanations, TP/SL auto-calculation, and multi-timeframe analysis — all for free.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
              Try Live Signals
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
