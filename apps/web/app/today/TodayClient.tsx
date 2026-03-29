'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import Link from 'next/link';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  Share2,
  CheckCircle2,
  RefreshCw,
  Star,
  ArrowRight,
  BarChart3,
  Activity,
  Clock,
  ExternalLink,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SignalOfTheDay {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
  timestamp: string;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { signal: string };
    ema: { trend: string };
  };
  reason: string;
}

interface TodayData {
  date: string;
  generatedAt: string;
  totalSignalsAnalyzed: number;
  signalOfTheDay: SignalOfTheDay | null;
  shareUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Confidence Ring                                                    */
/* ------------------------------------------------------------------ */

function ConfidenceRing({ value, size = 120 }: { value: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const isBuy = value >= 50;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={isBuy ? '#10b981' : '#ef4444'}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: isBuy ? '#10b981' : '#ef4444' }}>
          {value}%
        </span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          confidence
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function TodayClient() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/signal-of-the-day')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { startTransition(() => { fetchData(); }); }, [fetchData]);

  const signal = data?.signalOfTheDay;

  const shareText = signal
    ? `🎯 Signal of the Day from TradeClaw\n\n${signal.symbol} ${signal.direction} @ ${signal.entry}\nConfidence: ${signal.confidence}%\nTP1: ${signal.takeProfit1} | SL: ${signal.stopLoss}\n\nhttps://tradeclaw.com/today`
    : '';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'TradeClaw Signal of the Day', text: shareText, url: 'https://tradeclaw.com/today' });
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tweetUrl = signal
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎯 Signal of the Day: ${signal.symbol} ${signal.direction} (${signal.confidence}% confidence)\n\nTP1: ${signal.takeProfit1} | SL: ${signal.stopLoss}\n\n`)}&url=${encodeURIComponent('https://tradeclaw.com/today')}`
    : '#';

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          <Link href="/" className="text-xs font-medium flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
            ← Back to TradeClaw
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
              <Zap size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Signal of the Day</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The single highest-confidence signal right now, updated every 5 minutes.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : !signal ? (
          <div className="text-center py-20">
            <p className="text-lg font-medium mb-2">No signals available right now</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Check back soon — signals refresh every few minutes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main signal card */}
            <div
              className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
              style={{
                background: signal.direction === 'BUY'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
                border: `1px solid ${signal.direction === 'BUY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
                style={{ background: signal.direction === 'BUY' ? '#10b981' : '#ef4444' }}
              />

              <div className="relative z-10">
                {/* Date + Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {data?.date} • {data?.totalSignalsAnalyzed} signals analyzed
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider"
                    style={{
                      background: signal.direction === 'BUY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: signal.direction === 'BUY' ? '#10b981' : '#ef4444',
                    }}
                  >
                    Signal of the Day
                  </span>
                </div>

                {/* Symbol + Direction */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-4xl md:text-5xl font-bold">{signal.symbol}</h2>
                      <span
                        className="text-sm px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
                        style={{
                          background: signal.direction === 'BUY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          color: signal.direction === 'BUY' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {signal.direction === 'BUY' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {signal.direction}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {signal.timeframe} timeframe • Entry @ {signal.entry}
                    </p>
                  </div>
                  <ConfidenceRing value={signal.confidence} />
                </div>

                {/* Price levels */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-xl p-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Entry</p>
                    <p className="text-lg font-mono font-bold">{signal.entry}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 text-red-400">Stop Loss</p>
                    <p className="text-lg font-mono font-bold text-red-400">{signal.stopLoss}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">TP1</p>
                    <p className="text-lg font-mono font-bold text-emerald-500">{signal.takeProfit1}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">TP2</p>
                    <p className="text-lg font-mono font-bold text-emerald-500">{signal.takeProfit2}</p>
                  </div>
                </div>

                {/* Indicators */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
                    <Activity size={16} className="mx-auto mb-1" style={{ color: 'var(--text-secondary)' }} />
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>RSI</p>
                    <p className="text-sm font-mono font-semibold">{signal.indicators.rsi.value.toFixed(1)}</p>
                    <p className="text-[10px] capitalize" style={{ color: signal.indicators.rsi.signal === 'oversold' ? '#10b981' : signal.indicators.rsi.signal === 'overbought' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {signal.indicators.rsi.signal}
                    </p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
                    <BarChart3 size={16} className="mx-auto mb-1" style={{ color: 'var(--text-secondary)' }} />
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>MACD</p>
                    <p className="text-sm font-semibold capitalize" style={{ color: signal.indicators.macd.signal === 'bullish' ? '#10b981' : signal.indicators.macd.signal === 'bearish' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {signal.indicators.macd.signal}
                    </p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
                    <TrendingUp size={16} className="mx-auto mb-1" style={{ color: 'var(--text-secondary)' }} />
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>EMA Trend</p>
                    <p className="text-sm font-semibold capitalize" style={{ color: signal.indicators.ema.trend === 'up' ? '#10b981' : signal.indicators.ema.trend === 'down' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {signal.indicators.ema.trend}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>AI Analysis</p>
                  <p className="text-sm leading-relaxed">{signal.reason}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleShare}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                    {copied ? 'Copied!' : 'Share Signal'}
                  </button>
                  <a
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    Share on X <ExternalLink size={14} />
                  </a>
                  <Link
                    href={`/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    Full Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* API info */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target size={16} className="text-emerald-500" />
                API Endpoint
              </h3>
              <div className="flex items-center gap-2 rounded-lg p-3 font-mono text-xs" style={{ background: '#0a0a0a', color: '#a1a1aa' }}>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400">GET</span>
                <code className="flex-1">/api/signal-of-the-day</code>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Returns the single highest-confidence signal. 5-minute cache. CORS enabled. No auth.
              </p>
            </div>

            {/* Star CTA */}
            <div className="text-center py-4">
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Star size={16} className="text-amber-400" /> Star TradeClaw on GitHub
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
