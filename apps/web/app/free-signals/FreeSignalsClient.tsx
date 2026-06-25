'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TradingSignal } from '@tradeclaw/signals';

interface FreeSignalsClientProps {
  initialSignals: TradingSignal[];
}

function SignalCard({ signal }: { signal: TradingSignal }) {
  const isBuy = signal.direction === 'BUY';
  const ts = new Date(signal.timestamp);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
              isBuy
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {signal.direction}
          </span>
          <span className="text-sm font-semibold text-white">{signal.symbol}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{signal.timeframe}</span>
        </div>
        <span className="text-[10px] text-zinc-500">{ts.toLocaleDateString()}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-400">Confidence</span>
            <span className={`font-bold ${signal.confidence >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {signal.confidence.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                signal.confidence >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-white/5 p-2">
          <span className="block text-zinc-500 mb-0.5">Entry</span>
          <span className="font-mono font-semibold text-white">
            {signal.entry.toFixed(signal.entry > 100 ? 2 : 5)}
          </span>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <span className="block text-zinc-500 mb-0.5">TP1</span>
          <span className="font-mono font-semibold text-emerald-400">
            {signal.takeProfit1?.toFixed(signal.takeProfit1 > 100 ? 2 : 5) ?? '—'}
          </span>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <span className="block text-zinc-500 mb-0.5">SL</span>
          <span className="font-mono font-semibold text-rose-400">
            {signal.stopLoss?.toFixed(signal.stopLoss > 100 ? 2 : 5) ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  free,
  pro,
}: {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm border-b border-white/5 last:border-0 items-center">
      <span className="text-zinc-300">{label}</span>
      <span className="text-center w-24">
        {free === true ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
        ) : free === false ? (
          <XCircle className="w-4 h-4 text-zinc-600 mx-auto" />
        ) : (
          <span className="text-zinc-400 text-xs">{free}</span>
        )}
      </span>
      <span className="text-center w-24">
        {pro === true ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
        ) : pro === false ? (
          <XCircle className="w-4 h-4 text-zinc-600 mx-auto" />
        ) : (
          <span className="text-emerald-400 text-xs font-medium">{pro}</span>
        )}
      </span>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-medium text-zinc-200">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-zinc-400 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function FreeSignalsClient({ initialSignals }: FreeSignalsClientProps) {
  const [signals, setSignals] = useState<TradingSignal[]>(initialSignals);
  const [loading, setLoading] = useState(false);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/signals');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setSignals(json.signals ?? []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSignals.length === 0) {
      fetchSignals();
    }
  }, [initialSignals.length, fetchSignals]);

  const buyCount = signals.filter((s) => s.direction === 'BUY').length;
  const sellCount = signals.filter((s) => s.direction === 'SELL').length;
  const avgConfidence = signals.length
    ? Math.round(signals.reduce((a, s) => a + s.confidence, 0) / signals.length)
    : 0;

  return (
    <main className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Hero */}
      <section className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-5">
            <Zap className="w-3.5 h-3.5" />
            No credit card required
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-5">
            Free Trading Signals
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Live AI-powered BUY/SELL alerts for crypto, forex, and commodities.
            Powered by RSI, MACD, and EMA confluence scoring.{' '}
            <Link href="/track-record" className="text-emerald-400 hover:underline">
              Verify our public track record →
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-6 py-2.5 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              View Live Dashboard
            </Link>
            <Link
              href="/pricing?from=free-signals"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-sm px-6 py-2.5 transition-colors"
            >
              Compare Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Signals */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Live Free Signals</h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Free tier includes 30-minute delayed signals. Upgrade to Pro for instant alerts.
              </p>
            </div>
            <button
              onClick={fetchSignals}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
            >
              <Clock className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {signals.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Signals</span>
                <span className="block text-lg font-bold text-white mt-0.5">{signals.length}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">BUY</span>
                <span className="block text-lg font-bold text-emerald-400 mt-0.5">{buyCount}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">SELL</span>
                <span className="block text-lg font-bold text-rose-400 mt-0.5">{sellCount}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Confidence</span>
                <span className="block text-lg font-bold text-purple-400 mt-0.5">{avgConfidence}%</span>
              </div>
            </div>
          )}

          {signals.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-white/5 bg-white/[0.02]">
              <Shield className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <p className="text-sm text-zinc-400">No signals currently match the free-tier filter.</p>
              <p className="text-xs text-zinc-500 mt-1">Signals are generated during active market hours. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Comparison */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-2">Free vs Pro</h2>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Start free. Upgrade when you need real-time delivery and full analytics.
          </p>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/5 bg-white/[0.02]">
              <span>Feature</span>
              <span className="text-center w-24">Free</span>
              <span className="text-center w-24 text-emerald-400">Pro</span>
            </div>
            <FeatureRow label="Signal delivery" free="30-min delay" pro="Instant" />
            <FeatureRow label="Symbols covered" free="6 pairs" pro="All 20+ pairs" />
            <FeatureRow label="Telegram alerts" free={false} pro />
            <FeatureRow label="Track record" free="Public audit" pro="Public audit" />
            <FeatureRow label="API access" free={false} pro />
            <FeatureRow label="Webhook forwarding" free={false} pro={false} />
            <FeatureRow label="Strategy builder" free={false} pro={false} />
            <FeatureRow label="Price" free="$0" pro="$29/mo" />
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/pricing?from=free-signals-compare"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-6 py-2.5 transition-colors"
            >
              Start 7-Day Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            <FaqItem
              question="Are TradeClaw signals really free?"
              answer="Yes. The free tier gives you access to delayed trading signals with no credit card required. You get 6 major pairs (BTC, ETH, XAU, EUR, GBP, JPY) with a 30-minute delay. Upgrade to Pro for instant delivery across all 20+ symbols."
            />
            <FaqItem
              question="How accurate are the signals?"
              answer="Every signal outcome is tracked publicly in our Postgres database. You can verify the full track record at /track-record. Accuracy varies by market regime; we publish win rates, Sharpe ratios, and drawdowns openly."
            />
            <FaqItem
              question="What indicators power the signals?"
              answer="TradeClaw uses a confluence model: RSI (momentum), MACD (trend), EMA crossovers (direction), Bollinger Bands (volatility), and Stochastic. A signal only fires when multiple indicator categories agree."
            />
            <FaqItem
              question="Can I self-host TradeClaw?"
              answer="Absolutely. TradeClaw is open-source under MIT license. Run it locally with docker compose up or deploy to Railway, Render, or Fly.io. Self-hosters get the same signal engine with full control."
            />
            <FaqItem
              question="Is this financial advice?"
              answer="No. TradeClaw signals are generated by algorithms for informational purposes only. Always do your own research and consider your risk tolerance before trading. See our Terms for full disclaimers."
            />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-10">
          <h2 className="text-2xl font-bold text-white mb-3">Ready for real-time signals?</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Join Pro traders who get instant alerts, private Telegram groups, and full analytics.
            7-day free trial — cancel anytime.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing?from=free-signals-footer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-6 py-2.5 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/track-record"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-sm px-6 py-2.5 transition-colors"
            >
              View Track Record
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
