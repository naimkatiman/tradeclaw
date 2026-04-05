'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TrendingUp, RefreshCw, ArrowUp, ArrowDown, BarChart3, Globe, Flame, Activity } from 'lucide-react';

/* ─── Types ─── */

interface FearGreedData {
  value: number;
  classification: string;
}

interface FearGreedHistoryEntry {
  value: number;
  classification: string;
  timestamp: number;
}

interface GlobalMarketData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  altcoinDominance: number;
  marketCapChange24h: number;
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  score: number;
}

interface TopCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  image: string;
}

interface SentimentData {
  fearGreed: FearGreedData;
  fearGreedHistory: FearGreedHistoryEntry[];
  globalMarket: GlobalMarketData;
  trendingCoins: TrendingCoin[];
  topCoins: TopCoin[];
  sources?: Record<string, 'live' | 'mock'>;
  mock?: boolean;
}

/* ─── Helpers ─── */

function formatCurrency(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fgColor(value: number): string {
  if (value <= 25) return '#ef4444';
  if (value <= 50) return '#f97316';
  if (value <= 75) return '#14b8a6';
  return '#10b981';
}

function heatmapColor(change: number): string {
  if (change < -5) return 'bg-red-900/80';
  if (change < -2) return 'bg-red-700/60';
  if (change < 0) return 'bg-orange-700/50';
  if (change < 2) return 'bg-teal-700/50';
  if (change < 5) return 'bg-emerald-700/60';
  return 'bg-emerald-500/70';
}

const TRENDING_GRADIENTS = [
  'from-amber-500/20 to-orange-600/10',
  'from-blue-500/20 to-indigo-600/10',
  'from-purple-500/20 to-pink-600/10',
  'from-emerald-500/20 to-teal-600/10',
  'from-rose-500/20 to-red-600/10',
  'from-cyan-500/20 to-blue-600/10',
  'from-yellow-500/20 to-amber-600/10',
];

/* ─── SVG Fear & Greed Gauge ─── */

function FearGreedGauge({ value, classification }: { value: number; classification: string }) {
  const angle = (value / 100) * 180;
  const needleAngle = angle - 90;
  const needleRad = (needleAngle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const needleLen = 70;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
        {/* Red zone 0-25% */}
        <path d="M 15 100 A 85 85 0 0 1 37.32 39.07" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" opacity="0.7" />
        {/* Orange zone 25-50% */}
        <path d="M 37.32 39.07 A 85 85 0 0 1 100 15" fill="none" stroke="#f97316" strokeWidth="16" opacity="0.7" />
        {/* Teal zone 50-75% */}
        <path d="M 100 15 A 85 85 0 0 1 162.68 39.07" fill="none" stroke="#14b8a6" strokeWidth="16" opacity="0.7" />
        {/* Green zone 75-100% */}
        <path d="M 162.68 39.07 A 85 85 0 0 1 185 100" fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round" opacity="0.7" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={fgColor(value)} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={fgColor(value)} />
      </svg>
      <span className="text-4xl font-bold mt-2" style={{ color: fgColor(value) }}>{value}</span>
      <span className="text-sm text-zinc-400 mt-1">{classification}</span>
    </div>
  );
}

/* ─── Main Component ─── */

export function SentimentClient() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/sentiment');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as SentimentData;
      setData(json);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 300_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { fearGreed, fearGreedHistory, globalMarket, trendingCoins, topCoins, mock: isMock, sources } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-32">

        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h1 className="text-3xl sm:text-4xl font-bold">Market Sentiment</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Live crypto market mood &amp; data — Fear &amp; Greed index, dominance, trending coins, and volume heatmap.
          </p>
          {isMock && (
            <p className="text-xs text-amber-400/70 mt-2 flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70" />
              Some data is using cached fallback values — live APIs temporarily unavailable
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Auto-refreshes every 5 min
            </span>
            {lastUpdated && (
              <span className="text-xs text-zinc-600">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Fear & Greed Gauge ── */}
        <section className="glass-card rounded-2xl p-6 mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Fear &amp; Greed Index</h2>
            {sources?.fearGreed === 'mock' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CACHED</span>
            )}
          </div>
          <FearGreedGauge value={fearGreed.value} classification={fearGreed.classification} />

          {/* 30-day sparkline bars */}
          <div className="mt-6 w-full max-w-md">
            <span className="text-xs text-zinc-500 mb-2 block">30-day history</span>
            <div className="flex items-end gap-[3px] h-[60px]">
              {[...fearGreedHistory].reverse().map((entry, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(4, (entry.value / 100) * 60)}px`,
                    backgroundColor: fgColor(entry.value),
                    opacity: 0.7,
                  }}
                  title={`${entry.value} — ${entry.classification}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Global Market Stats ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Market Cap', value: formatCurrency(globalMarket.totalMarketCap), delta: globalMarket.marketCapChange24h },
            { label: '24h Volume', value: formatCurrency(globalMarket.totalVolume), delta: null },
            { label: 'BTC Dominance', value: `${globalMarket.btcDominance.toFixed(1)}%`, delta: null },
            { label: 'ETH Dominance', value: `${globalMarket.ethDominance.toFixed(1)}%`, delta: null },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <span className="text-xs text-zinc-500">{stat.label}</span>
              <div className="text-xl font-bold mt-1">{stat.value}</div>
              {stat.delta !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${stat.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(stat.delta).toFixed(2)}%
                </div>
              )}
            </div>
          ))}
        </section>

        {/* ── Dominance Bar ── */}
        <section className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold">Market Dominance</h2>
            {sources?.globalMarket === 'mock' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CACHED</span>
            )}
          </div>
          <div className="flex rounded-lg overflow-hidden h-8 text-xs font-medium">
            <div
              className="bg-emerald-500 flex items-center justify-center text-black"
              style={{ width: `${globalMarket.btcDominance}%` }}
            >
              BTC {globalMarket.btcDominance.toFixed(1)}%
            </div>
            <div
              className="bg-purple-500 flex items-center justify-center text-white"
              style={{ width: `${globalMarket.ethDominance}%` }}
            >
              ETH {globalMarket.ethDominance.toFixed(1)}%
            </div>
            <div
              className="bg-zinc-600 flex items-center justify-center text-zinc-200"
              style={{ width: `${globalMarket.altcoinDominance}%` }}
            >
              ALT {globalMarket.altcoinDominance.toFixed(1)}%
            </div>
          </div>
        </section>

        {/* ── Trending Coins ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Trending Coins</h2>
            {sources?.trendingCoins === 'mock' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CACHED</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {trendingCoins.map((coin, i) => (
              <Link
                key={coin.id}
                href={`https://www.coingecko.com/en/coins/${coin.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-gradient-to-br ${TRENDING_GRADIENTS[i % TRENDING_GRADIENTS.length]} border border-white/5 hover:border-white/20 transition-all group`}
              >
                <span className="text-lg font-bold text-zinc-500 group-hover:text-zinc-300">#{i + 1}</span>
                {coin.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coin.thumb} alt={coin.name} width={24} height={24} className="rounded-full" />
                )}
                <div>
                  <span className="text-sm font-semibold">{coin.name}</span>
                  <span className="text-xs text-zinc-400 ml-1.5">{coin.symbol.toUpperCase()}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Volume Heatmap ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">24h Volume Heatmap</h2>
            {sources?.topCoins === 'mock' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CACHED</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {topCoins.map((coin) => (
              <div
                key={coin.id}
                className={`${heatmapColor(coin.price_change_percentage_24h)} rounded-xl p-3 text-center transition-all hover:scale-[1.02]`}
              >
                <div className="text-sm font-bold">{coin.symbol.toUpperCase()}</div>
                <div className="text-xs text-zinc-300 mt-1">{formatCurrency(coin.total_volume)}</div>
                <div className={`text-xs font-medium mt-1 ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 30-day Fear & Greed History ── */}
        <section className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">30-Day Fear &amp; Greed History</h2>
          </div>
          <div className="flex items-end gap-[2px] h-[100px]">
            {[...fearGreedHistory].reverse().map((entry, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm cursor-default transition-all hover:opacity-100"
                style={{
                  height: `${Math.max(4, entry.value)}px`,
                  backgroundColor: fgColor(entry.value),
                  opacity: 0.65,
                }}
                title={`Day ${i + 1}: ${entry.value} — ${entry.classification}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 mt-2 px-1">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </section>

      </div>
    </div>
  );
}
