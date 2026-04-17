'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronUp,
  Map,
  Star,
  Trophy,
  Zap,
  Code2,
  Users,
  Server,
  CheckCircle2,
  Clock,
  Loader2,
  Share2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ROADMAP_ITEMS, getTopVoted, type RoadmapItem, type RoadmapCategory, type RoadmapStatus } from '@/lib/roadmap-data';

const STORAGE_KEY = 'tc-roadmap-votes';

type FilterCategory = 'All' | RoadmapCategory;
type FilterStatus = 'All' | RoadmapStatus;

const CATEGORY_ICONS: Record<RoadmapCategory, React.ReactNode> = {
  Trading: <Zap className="w-4 h-4" />,
  Developer: <Code2 className="w-4 h-4" />,
  Community: <Users className="w-4 h-4" />,
  Infrastructure: <Server className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<RoadmapStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  done: {
    label: 'Done',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10 border-zinc-500/30',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  planned: {
    label: 'Planned',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
};

function ConfettiPop({ x, y, active }: { x: number; y: number; active: boolean }) {
  if (!active) return null;
  const dots = Array.from({ length: 8 });
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      {dots.map((_, i) => {
        const angle = (i / dots.length) * 360;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti-dot"
            style={{
              left: x,
              top: y,
              background: ['#10b981', '#a78bfa', '#a1a1aa', '#ec4899', '#3b82f6'][i % 5],
              '--angle': `${angle}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

export default function RoadmapClient() {
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { votes?: Record<string, number> };
        return parsed.votes ?? {};
      }
    } catch { /* ignore */ }
    return {};
  });
  const [voted, setVoted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { voted?: string[] };
        return new Set(parsed.voted ?? []);
      }
    } catch { /* ignore */ }
    return new Set();
  });
  const [confetti, setConfetti] = useState<{ x: number; y: number; id: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('All');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('All');
  const [justVoted, setJustVoted] = useState<string | null>(null);

  const persist = useCallback((newVotes: Record<string, number>, newVoted: Set<string>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes: newVotes, voted: Array.from(newVoted) }));
  }, []);

  const handleVote = useCallback(
    (e: React.MouseEvent, item: RoadmapItem) => {
      if (voted.has(item.id)) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const newVotes = { ...votes, [item.id]: (votes[item.id] ?? 0) + 1 };
      const newVoted = new Set(voted).add(item.id);
      setVotes(newVotes);
      setVoted(newVoted);
      persist(newVotes, newVoted);
      setJustVoted(item.id);
      setConfetti({ x: cx, y: cy, id: item.id });
      setTimeout(() => setConfetti(null), 800);
      setTimeout(() => setJustVoted(null), 1200);
    },
    [votes, voted, persist]
  );

  const getTotal = (item: RoadmapItem) => item.seedVotes + (votes[item.id] ?? 0);

  const filteredItems = ROADMAP_ITEMS.filter((item) => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => getTotal(b) - getTotal(a));

  const topVoted = getTopVoted(ROADMAP_ITEMS, votes, 3);

  const tweetText = encodeURIComponent(
    `I just voted on the @TradeClaw_win public roadmap 🗺️\n\nCommunity-driven open-source trading signals — vote on what gets built next!\n\nhttps://tradeclaw.win/roadmap`
  );

  const categories: FilterCategory[] = ['All', 'Trading', 'Developer', 'Community', 'Infrastructure'];
  const statuses: FilterStatus[] = ['All', 'planned', 'in-progress', 'done'];

  const totalVotesCast = Object.values(votes).reduce((s, v) => s + v, 0);

  return (
    <>
      {/* Confetti */}
      {confetti && <ConfettiPop x={confetti.x} y={confetti.y} active />}

      <style>{`
        @keyframes confetti-dot {
          0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-60px); opacity: 0; }
        }
        .animate-confetti-dot { animation: confetti-dot 0.8s ease-out forwards; }
        @keyframes vote-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.25); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-vote-bounce { animation: vote-bounce 0.4s ease; }
      `}</style>

      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-5xl mx-auto px-4 py-16 space-y-14">

          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-2">
              <Map className="w-4 h-4" />
              Public Roadmap
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Shape the future of{' '}
              <span className="text-emerald-400">TradeClaw</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Vote on features you want to see built. The most-voted items ship next.
              No account needed — your vote is saved in this browser.
            </p>
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{ROADMAP_ITEMS.length}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Items</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {ROADMAP_ITEMS.reduce((s, i) => s + i.seedVotes + (votes[i.id] ?? 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Votes</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{totalVotesCast}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Your Votes</div>
              </div>
            </div>
          </div>

          {/* Coming Next */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-200">Coming Next</h2>
              <span className="text-xs text-zinc-500 ml-1">— top voted by the community</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {topVoted.map((item, rank) => {
                const sc = STATUS_CONFIG[item.status];
                return (
                  <div
                    key={item.id}
                    className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 overflow-hidden"
                  >
                    <div className="absolute top-3 right-3 text-3xl font-black text-zinc-800 select-none leading-none">
                      #{rank + 1}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {CATEGORY_ICONS[item.category]}
                      <span className="text-xs text-zinc-500">{item.category}</span>
                    </div>
                    <div className="font-semibold text-sm text-zinc-100 pr-6 mb-3 leading-snug">{item.title}</div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                      <div className="flex items-center gap-1 text-zinc-400 font-bold text-sm">
                        <ChevronUp className="w-4 h-4" />
                        {getTotal(item).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === c
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap ml-auto">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    statusFilter === s
                      ? 'bg-zinc-200 text-zinc-950'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {s === 'in-progress' ? 'In Progress' : s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Roadmap Grid */}
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <div className="text-center py-16 text-zinc-500">No items match your filters.</div>
            )}
            {filteredItems.map((item) => {
              const sc = STATUS_CONFIG[item.status];
              const hasVoted = voted.has(item.id);
              const isJustVoted = justVoted === item.id;
              const total = getTotal(item);

              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-4 rounded-xl border p-5 transition-all duration-200 ${
                    hasVoted
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  {/* Vote button */}
                  <button
                    onClick={(e) => handleVote(e, item)}
                    disabled={hasVoted || item.status === 'done'}
                    aria-label={hasVoted ? 'Already voted' : `Upvote ${item.title}`}
                    className={`flex-shrink-0 flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-all ${
                      isJustVoted ? 'animate-vote-bounce' : ''
                    } ${
                      hasVoted || item.status === 'done'
                        ? hasVoted
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                          : 'bg-zinc-800/50 text-zinc-600 cursor-default'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer'
                    }`}
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-xs font-bold tabular-nums">{total.toLocaleString()}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-zinc-100 text-sm leading-snug">{item.title}</span>
                      {hasVoted && (
                        <span className="text-xs text-emerald-400 font-medium">✓ Voted</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-3">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {CATEGORY_ICONS[item.category]}
                        {item.category}
                      </span>
                      {item.priority === 'high' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <Sparkles className="w-3 h-3" />
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Share + CTA */}
          <div className="grid sm:grid-cols-2 gap-6 pt-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Share2 className="w-4 h-4 text-blue-400" />
                Share the roadmap
              </div>
              <p className="text-sm text-zinc-400">
                The more votes we get, the better we understand what the community needs.
              </p>
              <a
                href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-medium transition-colors"
              >
                Share on X / Twitter
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Star className="w-4 h-4 text-zinc-400" />
                Support development
              </div>
              <p className="text-sm text-zinc-400">
                Star TradeClaw on GitHub to help prioritize these features and reach more contributors.
              </p>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 text-sm font-medium transition-colors"
              >
                ⭐ Star on GitHub
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Suggest a feature */}
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center space-y-3">
            <div className="text-zinc-300 font-semibold text-lg">Missing something?</div>
            <p className="text-sm text-zinc-500">
              Open a GitHub Discussion to suggest a new feature or share feedback with the community.
            </p>
            <a
              href="https://github.com/naimkatiman/tradeclaw/discussions/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700"
            >
              Open a Discussion
              <ArrowRight className="w-4 h-4" />
            </a>
            <div className="pt-1">
              <Link
                href="/contribute"
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Or contribute code →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
