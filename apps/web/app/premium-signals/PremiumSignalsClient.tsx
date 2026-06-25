'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Crown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lock,
  ArrowRight,
  Star,
  Clock,
  Target,
  Shield,
} from 'lucide-react';
import type { TradingSignal } from '@tradeclaw/signals';

interface PremiumSignalsResponse {
  signals: TradingSignal[];
  now: number;
  locked: boolean;
  delayed?: boolean;
}

function StrategyBadge({ id }: { id?: string }) {
  const label = id ? id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Premium';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
      <Crown className="w-3 h-3" />
      {label}
    </span>
  );
}

function SignalCard({ signal }: { signal: TradingSignal }) {
  const isBuy = signal.direction === 'BUY';
  const ts = typeof signal.timestamp === 'string'
    ? new Date(signal.timestamp)
    : new Date(signal.timestamp);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
            isBuy
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
          }`}>
            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {signal.direction}
          </span>
          <span className="text-sm font-semibold text-white">{signal.symbol}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{signal.timeframe}</span>
        </div>
        <StrategyBadge id={signal.strategyId} />
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
          <span className="font-mono font-semibold text-white">{signal.entry.toFixed(signal.entry > 100 ? 2 : 5)}</span>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <span className="block text-zinc-500 mb-0.5">TP1</span>
          <span className="font-mono font-semibold text-emerald-400">{signal.takeProfit1.toFixed(signal.takeProfit1 > 100 ? 2 : 5)}</span>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <span className="block text-zinc-500 mb-0.5">SL</span>
          <span className="font-mono font-semibold text-rose-400">{signal.stopLoss.toFixed(signal.stopLoss > 100 ? 2 : 5)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <Link
          href={`/signal/${signal.id}`}
          className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5"
        >
          Details <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function DelayedBanner() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 mb-6">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-300">
            30-Minute Delay Preview
          </p>
          <p className="text-xs text-amber-400/80">
            You&apos;re viewing premium signals with a 30-minute delay. Upgrade to Pro for real-time access.
          </p>
        </div>
        <Link
          href="/pricing?from=premium-signals-delayed"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs px-3 py-1.5 transition-colors flex-shrink-0"
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-md mx-auto text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mx-auto mb-6">
        <Shield className="w-8 h-8 text-zinc-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No Premium Signals Yet</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Premium signals from TradingView are emitted when Zaky&apos;s strategies trigger on live market conditions. Check back soon.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm px-5 py-2.5 transition-colors border border-white/10"
      >
        <ArrowRight className="w-4 h-4" />
        View Algo Signals
      </Link>
    </div>
  );
}

export function PremiumSignalsClient() {
  const [data, setData] = useState<PremiumSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/premium-signals');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">Premium Signals</h1>
            </div>
            <p className="text-sm text-zinc-400">
              TradingView-integrated signals from Zaky&apos;s personal strategies
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Content */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.delayed ? (
          <>
            <DelayedBanner />
            {!data.signals.length ? (
              <EmptyState />
            ) : (
              <>
                {/* Stats bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
                    <span className="block text-lg font-bold text-white mt-0.5">{data.signals.length}</span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">BUY</span>
                    <span className="block text-lg font-bold text-emerald-400 mt-0.5">
                      {data.signals.filter(s => s.direction === 'BUY').length}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">SELL</span>
                    <span className="block text-lg font-bold text-rose-400 mt-0.5">
                      {data.signals.filter(s => s.direction === 'SELL').length}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Confidence</span>
                    <span className="block text-lg font-bold text-purple-400 mt-0.5">
                      {Math.round(data.signals.reduce((a, s) => a + s.confidence, 0) / data.signals.length)}%
                    </span>
                  </div>
                </div>

                {/* Signal grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.signals.map(signal => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : !data?.signals.length ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
                <span className="block text-lg font-bold text-white mt-0.5">{data.signals.length}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">BUY</span>
                <span className="block text-lg font-bold text-emerald-400 mt-0.5">
                  {data.signals.filter(s => s.direction === 'BUY').length}
                </span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">SELL</span>
                <span className="block text-lg font-bold text-rose-400 mt-0.5">
                  {data.signals.filter(s => s.direction === 'SELL').length}
                </span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Confidence</span>
                <span className="block text-lg font-bold text-purple-400 mt-0.5">
                  {Math.round(data.signals.reduce((a, s) => a + s.confidence, 0) / data.signals.length)}%
                </span>
              </div>
            </div>

            {/* Signal grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.signals.map(signal => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Star className="w-3 h-3" />
              <span>Signals auto-refresh every 60 seconds</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
