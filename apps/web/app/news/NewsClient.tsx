'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Star,
  Share2,
  ArrowUpRight,
  Crown,
  BarChart3,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
  priceBtc: number;
  score: number;
  priceUsd: string | null;
  priceChange24h: number | null;
  pair: string | null;
  signal: { direction: string; confidence: number; timeframe: string } | null;
}

interface NewsData {
  trending: TrendingCoin[];
  updatedAt: string;
  mock?: boolean;
  error?: boolean;
}

function SignalBadge({ signal }: { signal: TrendingCoin['signal'] }) {
  if (!signal) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
        <Minus className="h-3 w-3" />
        No Signal
      </span>
    );
  }

  const isBuy = signal.direction === 'BUY';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        isBuy
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-red-500/15 text-red-400 border border-red-500/30'
      }`}
    >
      {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {signal.direction} {signal.timeframe}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-700/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            confidence >= 70
              ? 'bg-emerald-500'
              : confidence >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-zinc-400">{confidence}%</span>
    </div>
  );
}

function CoinCard({ coin }: { coin: TrendingCoin }) {
  return (
    <div className="group relative rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all duration-200 hover:border-emerald-500/30 hover:bg-zinc-800/80">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {coin.thumb ? (
            <Image
              src={coin.thumb}
              alt={coin.name}
              width={32}
              height={32}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              {coin.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{coin.name}</h3>
            <span className="text-xs text-zinc-400">{coin.symbol}</span>
          </div>
        </div>
        {coin.marketCapRank > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-700/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            <Crown className="h-3 w-3 text-yellow-500" />
            #{coin.marketCapRank}
          </span>
        )}
      </div>

      {coin.priceUsd && (
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-100">{coin.priceUsd}</span>
          {coin.priceChange24h !== null && (
            <span
              className={`text-xs font-medium ${
                coin.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {coin.priceChange24h >= 0 ? '+' : ''}
              {coin.priceChange24h.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="mb-2">
        <SignalBadge signal={coin.signal} />
      </div>

      {coin.signal && (
        <ConfidenceBar confidence={coin.signal.confidence} />
      )}

      {coin.pair && (
        <Link
          href={`/screener?symbol=${coin.pair}`}
          className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View {coin.pair} signals
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function NewsClient({ initial }: { initial: NewsData }) {
  const [data, setData] = useState<NewsData>(initial);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(initial.error ?? false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const withSignals = data.trending.filter((c) => c.signal !== null);
  const buyCount = withSignals.filter((c) => c.signal?.direction === 'BUY').length;
  const sellCount = withSignals.filter((c) => c.signal?.direction === 'SELL').length;
  const avgConfidence =
    withSignals.length > 0
      ? Math.round(
          withSignals.reduce((sum, c) => sum + (c.signal?.confidence ?? 0), 0) /
            withSignals.length,
        )
      : 0;

  const tweetText = encodeURIComponent(
    `Trending coins x live signals on TradeClaw:\n${buyCount} BUY / ${sellCount} SELL signals across ${data.trending.length} trending coins\n\nhttps://tradeclaw.win/news`,
  );

  return (
    <div className="min-h-[100dvh] bg-zinc-900 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-24 pb-20 md:pb-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-4">
            <Zap className="h-3.5 w-3.5" />
            Live from CoinGecko + TradeClaw Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Trending Coins{' '}
            <span className="text-emerald-400">&times;</span> Live Signals
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            CoinGecko&apos;s hottest coins matched with real-time TradeClaw trading signals.
            Auto-refreshes every 5 minutes.
          </p>
        </div>

        {/* Signal Confluence Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-400">Signal Confluence:</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            {buyCount} BUY
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
            <TrendingDown className="h-4 w-4" />
            {sellCount} SELL
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-300">
            <span className="text-zinc-400">Avg Confidence:</span>
            <span className="font-mono font-bold">{avgConfidence}%</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-zinc-700/50 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error State */}
        {hasError && data.trending.length === 0 && (
          <div className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Unable to load news</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Check your connection or try again later.
            </p>
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        )}

        {/* Coin Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {data.trending.map((coin) => (
            <CoinCard key={coin.id} coin={coin} />
          ))}
        </div>

        {/* Footer CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-800 border border-zinc-700/50 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share on X
          </a>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Star className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>

        {/* Updated timestamp */}
        <p className="mt-6 text-center text-[11px] text-zinc-500">
          Updated {new Date(data.updatedAt).toLocaleTimeString()}
          {data.mock && ' (demo data)'}
        </p>
      </div>
    </div>
  );
}
