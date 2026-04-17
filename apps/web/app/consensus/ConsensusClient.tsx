'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithLicense } from '@/lib/license-client';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Share2, Star, Users } from 'lucide-react';
import type { ConsensusResponse, ConsensusEntry } from '../api/consensus/route';

function BullBearGauge({ bullish }: { bullish: number }) {
  const bearish = 100 - bullish;
  const isBull = bullish >= 55;
  const isBear = bullish <= 45;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm font-medium">
        <span className="text-emerald-400">{bullish}% BULLISH</span>
        <span className="text-rose-400">{bearish}% BEARISH</span>
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
          {isBull ? '🐂 Risk-On Bias' : isBear ? '🐻 Risk-Off Bias' : '⚖️ Neutral / Mixed'}
        </span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: ConsensusEntry['trend24h'] }) {
  if (trend === 'UP') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'DOWN') return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-zinc-500" />;
}

function ConsensusRow({ entry }: { entry: ConsensusEntry }) {
  const buyPct = entry.totalCount > 0 ? Math.round((entry.buyCount / entry.totalCount) * 100) : 50;
  const sellPct = 100 - buyPct;

  return (
    <div className={`bg-zinc-900/60 border rounded-xl p-4 hover:border-zinc-600 transition-colors ${entry.source === 'synthetic' ? 'border-zinc-800/40' : 'border-zinc-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-white">{entry.pair}</span>
          <span className="text-xs text-zinc-500">{entry.name}</span>
          {entry.source === 'synthetic' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">ESTIMATED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon trend={entry.trend24h} />
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

      {(entry.avgBuyConfidence > 0 || entry.avgSellConfidence > 0) && (
        <div className="mt-2 flex gap-3 text-xs text-zinc-500">
          {entry.avgBuyConfidence > 0 && (
            <span>Avg buy conf: <span className="text-emerald-400">{entry.avgBuyConfidence}%</span></span>
          )}
          {entry.avgSellConfidence > 0 && (
            <span>Avg sell conf: <span className="text-rose-400">{entry.avgSellConfidence}%</span></span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConsensusClient() {
  const [data, setData] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchWithLicense('/api/consensus');
      if (res.ok) {
        const json = await res.json() as ConsensusResponse;
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
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
    if (!data) return;
    const bias = data.overallBullish >= 55 ? 'BULLISH' : data.overallBullish <= 45 ? 'BEARISH' : 'NEUTRAL';
    const text = `📊 Market Consensus right now: ${data.overallBullish}% BULLISH\n\n🟢 Most bullish: ${data.mostBullish}\n🔴 Most bearish: ${data.mostBearish}\n\nReal-time signal consensus from @TradeClaw_win — open source AI trading platform\n\nhttps://tradeclaw.win/consensus #${bias} #trading #forex #crypto`;
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

  const bias = data ? (data.overallBullish >= 55 ? 'Bullish' : data.overallBullish <= 45 ? 'Bearish' : 'Neutral') : 'Neutral';

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="w-6 h-6 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Signal Consensus</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Market Consensus
          </h1>
          <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
            Aggregate buy/sell signal distribution across all tracked assets — updated every 60 seconds from live signal engine.
          </p>

          {/* Overall gauge */}
          {data && (
            <div className="max-w-md mx-auto mb-6">
              <BullBearGauge bullish={data.overallBullish} />
            </div>
          )}

          {/* Summary stats */}
          {data && (
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Most Bullish</div>
                <div className="font-mono font-bold text-emerald-400">{data.mostBullish}</div>
              </div>
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Most Bearish</div>
                <div className="font-mono font-bold text-rose-400">{data.mostBearish}</div>
              </div>
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">Most Split</div>
                <div className="font-mono font-bold text-zinc-300">{data.mostConflicted}</div>
              </div>
            </div>
          )}

          {/* Total signals */}
          {data && (
            <div className="flex items-center justify-center gap-4 text-sm text-zinc-400 mb-4">
              <span className="text-emerald-400 font-semibold">{data.totalBuySignals} BUY signals</span>
              <span className="text-zinc-600">·</span>
              <span className="text-rose-400 font-semibold">{data.totalSellSignals} SELL signals</span>
              <span className="text-zinc-600">·</span>
              <span>Bias: <span className={`font-semibold ${bias === 'Bullish' ? 'text-emerald-400' : bias === 'Bearish' ? 'text-rose-400' : 'text-zinc-300'}`}>{bias}</span></span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
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

          {data?.hasSynthetic && (
            <p className="text-xs text-zinc-400/70 mt-3 flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400/70" />
              Some pairs show estimated data — no live signals available yet
            </p>
          )}

          {lastRefresh && (
            <p className="text-xs text-zinc-600 mt-3">
              Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
            </p>
          )}
        </div>
      </div>

      {/* Per-asset grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Per-Asset Breakdown</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {data?.entries.map(entry => (
            <ConsensusRow key={entry.pair} entry={entry} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center">
          <Star className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">TradeClaw is open source</h3>
          <p className="text-zinc-400 mb-5">
            Self-host your own instance and get real-time signal consensus for any asset — for free, forever.
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
              View Live Signals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
