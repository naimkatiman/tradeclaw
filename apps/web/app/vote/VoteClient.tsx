'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Star, BarChart2, Copy, Check, ExternalLink, Clock } from 'lucide-react';

interface PairVotes {
  BUY: number;
  SELL: number;
  HOLD: number;
}

interface VotesResponse {
  pairs: Record<string, PairVotes>;
  weekStart: string;
  tcSignals: Record<string, string>;
}

interface StatsResponse {
  totalVotes: number;
  mostBullishPair: string;
  mostBearishPair: string;
  communityBullishPct: number;
}

const PAIR_LABELS: Record<string, string> = {
  BTCUSD: 'BTC/USD',
  ETHUSD: 'ETH/USD',
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AAPL: 'AAPL',
  TSLA: 'TSLA',
  SPX500: 'SPX500',
};

const DIRECTIONS = ['BUY', 'SELL', 'HOLD'] as const;
type Direction = (typeof DIRECTIONS)[number];

function getCurrentWeekKey(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getLocalVote(pair: string): string | null {
  if (typeof window === 'undefined') return null;
  const week = getCurrentWeekKey();
  return localStorage.getItem(`tc-vote-${week}-${pair}`);
}

function setLocalVote(pair: string, direction: string): void {
  const week = getCurrentWeekKey();
  localStorage.setItem(`tc-vote-${week}-${pair}`, direction);
}

function getNextMondayMs(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Resetting...';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function pctOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function SignalBadge({ direction }: { direction: string }) {
  const colors =
    direction === 'BUY'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : direction === 'SELL'
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors}`}>
      TC: {direction}
    </span>
  );
}

function VoteBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-right text-zinc-500">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-zinc-400">{pct}%</span>
    </div>
  );
}

function AssetCard({
  pair,
  votes,
  tcSignal,
  onVote,
}: {
  pair: string;
  votes: PairVotes;
  tcSignal: string;
  onVote: (pair: string, direction: Direction) => void;
}) {
  const userVote = getLocalVote(pair);
  const total = votes.BUY + votes.SELL + votes.HOLD;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">{PAIR_LABELS[pair] ?? pair}</h3>
        <SignalBadge direction={tcSignal} />
      </div>

      {!userVote ? (
        <div className="flex gap-2">
          {DIRECTIONS.map((dir) => {
            const btnColor =
              dir === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : dir === 'SELL'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200';
            return (
              <button
                key={dir}
                onClick={() => onVote(pair, dir)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${btnColor}`}
              >
                {dir}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <VoteBar label="BUY" pct={pctOf(votes.BUY, total)} color="bg-emerald-500" />
            <VoteBar label="SELL" pct={pctOf(votes.SELL, total)} color="bg-rose-500" />
            <VoteBar label="HOLD" pct={pctOf(votes.HOLD, total)} color="bg-zinc-500" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Voted: <span className="text-white font-semibold">{userVote}</span>
            </span>
            {userVote === tcSignal ? (
              <span className="text-emerald-400 font-medium">TC Agrees &#x2713;</span>
            ) : (
              <span className="text-rose-400 font-medium">TC Differs &#x2717;</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function VoteClient() {
  const [data, setData] = useState<VotesResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(getNextMondayMs());

  const fetchData = useCallback(async () => {
    try {
      const [votesRes, statsRes] = await Promise.all([
        fetch('/api/votes'),
        fetch('/api/votes/stats'),
      ]);
      if (votesRes.ok) setData(await votesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // silent — will retry on next interval
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const [votesRes, statsRes] = await Promise.all([
          fetch('/api/votes', { signal: controller.signal }),
          fetch('/api/votes/stats', { signal: controller.signal }),
        ]);
        if (!active) return;
        if (votesRes.ok) setData(await votesRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch {
        // aborted or network error
      }
    }

    load();
    const dataInterval = setInterval(fetchData, 60_000);
    const countdownInterval = setInterval(() => {
      setCountdown(getNextMondayMs());
    }, 60_000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(dataInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchData]);

  async function handleVote(pair: string, direction: Direction) {
    if (getLocalVote(pair)) return;
    setLocalVote(pair, direction);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, direction }),
      });
      if (res.ok) {
        const { pair: p, votes } = await res.json();
        setData((prev) =>
          prev ? { ...prev, pairs: { ...prev.pairs, [p]: votes } } : prev,
        );
        const statsRes = await fetch('/api/votes/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch {
      // vote saved locally even if request fails
    }
  }

  function handleCopyTweet() {
    if (!stats) return;
    const text = `Community is ${stats.communityBullishPct}% bullish on ${PAIR_LABELS[stats.mostBullishPair] ?? stats.mostBullishPair} via @TradeClaw_win \u2014 vote: https://tradeclaw.win/vote`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tweetIntentUrl = stats
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Community is ${stats.communityBullishPct}% bullish on ${PAIR_LABELS[stats.mostBullishPair] ?? stats.mostBullishPair} via @TradeClaw_win \u2014 vote: https://tradeclaw.win/vote`,
      )}`
    : '#';

  if (!data || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">Loading votes...</div>
      </div>
    );
  }

  const pairs = Object.keys(data.pairs);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Sticky Stats Bar */}
      <div className="sticky top-14 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">
              Votes:{' '}
              <span className="text-emerald-400 font-semibold">
                {stats.totalVotes.toLocaleString()}
              </span>
            </span>
            <span className="text-zinc-500">
              Bullish:{' '}
              <span className="text-emerald-400 font-semibold">
                {PAIR_LABELS[stats.mostBullishPair] ?? stats.mostBullishPair}
              </span>
            </span>
            <span className="text-zinc-500">
              Bearish:{' '}
              <span className="text-rose-400 font-semibold">
                {PAIR_LABELS[stats.mostBearishPair] ?? stats.mostBearishPair}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3 h-3" />
            Reset in {formatCountdown(countdown)}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <BarChart2 className="w-3.5 h-3.5" />
            Community Signal Vote
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            What Does the Community <span className="text-emerald-400">Think?</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Cast your vote on 10 major assets and see how you compare with
            TradeClaw&apos;s AI signals. Votes reset every Monday.
          </p>
          <div className="mt-4 text-2xl font-bold text-emerald-400">
            {stats.totalVotes.toLocaleString()}{' '}
            <span className="text-sm text-zinc-500 font-normal">votes this week</span>
          </div>
        </div>

        {/* Vote Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {pairs.map((pair) => (
            <AssetCard
              key={pair}
              pair={pair}
              votes={data.pairs[pair]}
              tcSignal={data.tcSignals[pair] ?? 'HOLD'}
              onVote={handleVote}
            />
          ))}
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Community Sentiment</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-400">
                {stats.communityBullishPct}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">Bullish</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {PAIR_LABELS[stats.mostBullishPair] ?? stats.mostBullishPair}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Most Bullish</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {PAIR_LABELS[stats.mostBearishPair] ?? stats.mostBearishPair}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Most Bearish</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {stats.totalVotes.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Total Votes</div>
            </div>
          </div>
        </div>

        {/* Share Kit */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 mb-8">
          <h2 className="text-lg font-bold mb-3">Share Your Vote</h2>
          <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300 mb-3 font-mono">
            Community is {stats.communityBullishPct}% bullish on{' '}
            {PAIR_LABELS[stats.mostBullishPair] ?? stats.mostBullishPair} via @TradeClaw_win
            &mdash; vote: tradeclaw.win/vote
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopyTweet}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={tweetIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Post on X
            </a>
          </div>
        </div>

        {/* GitHub Star CTA */}
        <div className="text-center py-8 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm mb-3">
            TradeClaw is open-source. Star us on GitHub to support the project.
          </p>
          <Link
            href="/star"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold transition-colors"
          >
            <Star className="w-4 h-4 text-zinc-400" />
            Star on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
