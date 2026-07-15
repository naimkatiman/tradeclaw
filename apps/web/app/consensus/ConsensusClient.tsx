'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Share2, Star, Users } from 'lucide-react';
import type { ConsensusResponse, ConsensusEntry } from '../api/consensus/route';

function BullBearGauge({ bullish }: { bullish: number }) {
  const bearish = 100 - bullish;
  const isBull = bullish >= 55;
  const isBear = bullish <= 45;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm font-medium">
        <span className="text-emerald-400">{bullish}% BUY</span>
        <span className="text-rose-400">{bearish}% SELL</span>
      </div>
      <div className="h-6 rounded-full overflow-hidden flex bg-zinc-800 border border-zinc-700">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
          style={{ width: `${bullish}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-700"
          style={{ width: `${bearish}%` }}
        />
      </div>
      <div className="mt-2 text-center">
        <span className={`text-sm font-semibold ${isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-zinc-400'}`}>
          {isBull ? 'BUY-heavy signal mix' : isBear ? 'SELL-heavy signal mix' : 'Mixed signal directions'}
        </span>
      </div>
    </div>
  );
}

function ConsensusRow({ entry }: { entry: ConsensusEntry }) {
  const buyPct = Math.round(entry.buyRatio * 100);
  const sellPct = 100 - buyPct;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-white">{entry.pair}</span>
          <span className="text-xs text-zinc-500">{entry.name}</span>
          <span className="text-[10px] text-zinc-600">{entry.timeframes.join(' + ')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            entry.dominantDirection === 'BUY'
              ? 'bg-emerald-500/20 text-emerald-400'
              : entry.dominantDirection === 'SELL'
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-zinc-700 text-zinc-400'
          }`}>
            {entry.dominantDirection === 'NEUTRAL' ? '= SPLIT' : entry.dominantDirection === 'BUY' ? `↑ ${buyPct}% BUY` : `↓ ${sellPct}% SELL`}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* BUY bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 w-8">BUY</span>
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${buyPct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 w-12 text-right">{entry.buyCount} ({buyPct}%)</span>
        </div>
        {/* SELL bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-rose-400 w-8">SELL</span>
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-700 rounded-full transition-all duration-500"
              style={{ width: `${sellPct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 w-12 text-right">{entry.sellCount} ({sellPct}%)</span>
        </div>
      </div>

      {(entry.avgBuyConfidence !== null || entry.avgSellConfidence !== null) && (
        <div className="mt-2 flex gap-3 text-xs text-zinc-500">
          {entry.avgBuyConfidence !== null && (
            <span>Avg BUY agreement: <span className="text-emerald-400">{entry.avgBuyConfidence}%</span></span>
          )}
          {entry.avgSellConfidence !== null && (
            <span>Avg SELL agreement: <span className="text-rose-400">{entry.avgSellConfidence}%</span></span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConsensusClient() {
  const [data, setData] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/consensus');
      const json = await res.json() as ConsensusResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Consensus data is unavailable');
      setData(json);
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : 'Consensus data is unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleShare = () => {
    if (!data || data.overallBullish === null || data.entries.length === 0) return;
    const bias = data.overallBullish >= 55 ? 'BULLISH' : data.overallBullish <= 45 ? 'BEARISH' : 'NEUTRAL';
    const text = `TradeClaw H1/H4 signal-direction snapshot: ${data.overallBullish}% BUY\n\nHighest BUY share: ${data.mostBullish ?? 'unavailable'}\nHighest SELL share: ${data.mostBearish ?? 'unavailable'}\n\nObserved-OHLCV-derived records only; confidence means indicator agreement, not probability of profit. Snapshot: ${data.updatedAt}\n\nhttps://tradeclaw.win/consensus #${bias} #trading`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText('https://tradeclaw.win/consensus');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading consensus data...</span>
        </div>
      </div>
    );
  }

  const hasObservedData = data !== null && data.overallBullish !== null && data.entries.length > 0;
  const overallBuyPct = data?.overallBullish ?? null;
  const bias = hasObservedData
    ? overallBuyPct! >= 55 ? 'BUY-heavy' : overallBuyPct! <= 45 ? 'SELL-heavy' : 'Mixed'
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="w-6 h-6 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Signal Distribution</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            H1 + H4 Signal Mix
          </h1>
          <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
            Distribution of currently available H1 and H4 signal records derived from observed OHLCV. Missing pairs and failed timeframes stay unavailable; no values are estimated or synthesized.
          </p>

          {error && (
            <div className="mx-auto mb-6 flex max-w-xl items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">Signal distribution unavailable</p>
                <p className="mt-0.5 text-amber-200/80">{error}. No fallback counts or rankings are shown.</p>
              </div>
            </div>
          )}

          {data?.status === 'partial' && (
            <p className="mx-auto mb-6 max-w-xl rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Partial snapshot: {data.provenance.unavailableTimeframes.join(', ')} is unavailable. Values use only {data.provenance.availableTimeframes.join(', ')} records.
            </p>
          )}

          {data?.status === 'empty' && (
            <p className="mx-auto mb-6 max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              No eligible observed-data H1/H4 signal records are available. No neutral percentage or asset ranking has been substituted.
            </p>
          )}

          {/* Overall gauge */}
          {data && hasObservedData && (
            <div className="max-w-md mx-auto mb-6">
              <BullBearGauge bullish={overallBuyPct!} />
              <p className="text-[11px] text-zinc-500 mt-1">share of available H1 + H4 signal directions</p>
            </div>
          )}

          {/* Summary stats */}
          {data && hasObservedData && (
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Highest BUY Share</div>
                <div className="font-mono font-bold text-emerald-400">{data.mostBullish}</div>
              </div>
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Highest SELL Share</div>
                <div className="font-mono font-bold text-rose-400">{data.mostBearish}</div>
              </div>
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Most Split</div>
                <div className="font-mono font-bold text-zinc-300">{data.mostConflicted}</div>
              </div>
            </div>
          )}

          {/* Total signals */}
          {data && hasObservedData && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
                <span className="text-emerald-400 font-semibold">{data.totalBuySignals} BUY signals</span>
                <span className="text-zinc-600">·</span>
                <span className="text-rose-400 font-semibold">{data.totalSellSignals} SELL signals</span>
                <span className="text-zinc-600">·</span>
                <span>Mix: <span className={`font-semibold ${bias === 'BUY-heavy' ? 'text-emerald-400' : bias === 'SELL-heavy' ? 'text-rose-400' : 'text-zinc-300'}`}>{bias}</span></span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">counts current open H1 + H4 signals (not a 24h history)</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleShare}
              disabled={!hasObservedData}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => { void fetchData(); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {data && (
            <p className="text-xs text-zinc-600 mt-3">
              Source snapshot: {new Date(data.updatedAt).toLocaleString()} · Refresh attempted every 60s · Synthetic signals excluded
            </p>
          )}
        </div>
      </div>

      {/* Per-asset grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-1 text-zinc-300">Per-Asset Breakdown</h2>
        <p className="text-xs text-zinc-500 mb-4">Counts reflect available H1/H4 signal records. Agreement scores are not probabilities of profit.</p>
        {data && data.entries.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {data.entries.map(entry => (
              <ConsensusRow key={entry.pair} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
            No observed-data signal rows are available for this breakdown.
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center">
          <Star className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">TradeClaw is open source</h3>
          <p className="text-zinc-400 mb-5">
            TradeClaw&apos;s source is MIT-licensed. Hosting, market-data providers, brokers, and notification services may charge separately.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </a>
            <Link
              href="/screener"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors"
            >
              View Signal Archive
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
