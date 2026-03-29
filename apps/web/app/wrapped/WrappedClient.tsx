'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Target,
  BarChart3,
  Trophy,
  Calendar,
  ArrowRight,
  Share2,
  RotateCcw,
  Star,
  Zap,
  Eye,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WrappedStats {
  year: number;
  totalSignals: number;
  bestPair: string;
  bestPairCount: number;
  bestPairWinRate: number;
  worstPair: string;
  worstPairWinRate: number;
  totalBuy: number;
  totalSell: number;
  avgConfidence: number;
  topTimeframe: string;
  totalWins: number;
  totalLosses: number;
  overallWinRate: number;
  longestStreak: number;
  monthlyActivity: number[];
  accuracyTrend: number[];
  favoriteHour: number;
  uniquePairs: number;
}

interface RevealCard {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  detail: string;
  color: 'emerald' | 'purple' | 'amber' | 'cyan' | 'rose';
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildStats(year: number): WrappedStats {
  const rand = seededRandom(year * 42 + 7);

  // Generate per-pair stats
  const pairStats = PAIRS.map(pair => {
    const count = Math.floor(rand() * 200) + 50;
    const winRate = 0.45 + rand() * 0.35;
    return { pair, count, winRate };
  });

  pairStats.sort((a, b) => b.winRate - a.winRate);
  const bestPair = pairStats[0];
  const worstPair = pairStats[pairStats.length - 1];

  const totalSignals = pairStats.reduce((s, p) => s + p.count, 0);
  const totalWins = pairStats.reduce((s, p) => s + Math.round(p.count * p.winRate), 0);
  const totalLosses = totalSignals - totalWins;

  // Monthly activity (Jan–Dec)
  const monthlyActivity = Array.from({ length: 12 }, () => Math.floor(rand() * 180) + 40);

  // Accuracy trend by month
  const accuracyTrend = Array.from({ length: 12 }, (_, i) => {
    const base = 0.52 + i * 0.02;
    return Math.min(0.85, base + (rand() - 0.5) * 0.1);
  });

  // Timeframe preference
  const tfIdx = Math.floor(rand() * TIMEFRAMES.length);

  // Favorite hour
  const favoriteHour = Math.floor(rand() * 14) + 7; // 7-20

  const totalBuy = Math.round(totalSignals * (0.45 + rand() * 0.1));
  const totalSell = totalSignals - totalBuy;

  return {
    year,
    totalSignals,
    bestPair: bestPair.pair,
    bestPairCount: bestPair.count,
    bestPairWinRate: bestPair.winRate,
    worstPair: worstPair.pair,
    worstPairWinRate: worstPair.winRate,
    totalBuy,
    totalSell,
    avgConfidence: 62 + rand() * 20,
    topTimeframe: TIMEFRAMES[tfIdx],
    totalWins,
    totalLosses,
    overallWinRate: totalWins / totalSignals,
    longestStreak: Math.floor(rand() * 12) + 3,
    monthlyActivity,
    accuracyTrend,
    favoriteHour,
    uniquePairs: PAIRS.length,
  };
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Mini Bar Chart (Monthly Activity)                                  */
/* ------------------------------------------------------------------ */

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-700"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
            opacity: 0.5 + (v / max) * 0.5,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accuracy Trend Line                                                */
/* ------------------------------------------------------------------ */

function AccuracyTrendLine({ data }: { data: number[] }) {
  const w = 280;
  const h = 60;
  const pad = 4;
  const min = Math.min(...data) - 0.05;
  const max = Math.max(...data) + 0.05;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="trendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="url(#trendGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
        const y = h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
        return <circle key={i} cx={x} cy={y} r="3" fill="#10b981" opacity={0.7} />;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal Card Component                                              */
/* ------------------------------------------------------------------ */

const COLOR_MAP = {
  emerald: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10b981', glow: '0 0 40px rgba(16,185,129,0.15)' },
  purple: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', text: '#a855f7', glow: '0 0 40px rgba(168,85,247,0.15)' },
  amber: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', glow: '0 0 40px rgba(245,158,11,0.15)' },
  cyan: { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', text: '#06b6d4', glow: '0 0 40px rgba(6,182,212,0.15)' },
  rose: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', text: '#f43f5e', glow: '0 0 40px rgba(244,63,94,0.15)' },
};

function AnimatedRevealCard({ card, index, isVisible }: { card: RevealCard; index: number; isVisible: boolean }) {
  const c = COLOR_MAP[card.color];

  return (
    <div
      className="rounded-2xl p-6 md:p-8 transition-all duration-700 text-center"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: isVisible ? c.glow : 'none',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.9)',
        transitionDelay: `${index * 150}ms`,
      }}
    >
      <div className="flex justify-center mb-3" style={{ color: c.text }}>
        {card.icon}
      </div>
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: c.text }}>
        {card.subtitle}
      </p>
      <h3 className="text-3xl md:text-5xl font-bold mb-2" style={{ color: c.text }}>
        {card.value}
      </h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {card.detail}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function WrappedClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [step, setStep] = useState(0); // 0 = intro, 1-6 = reveal cards, 7 = summary
  const [cardsVisible, setCardsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Try loading from localStorage, fall back to generated
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tc-wrapped-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.year === year) {
          startTransition(() => { setStats(parsed); });
          return;
        }
      }
    } catch { /* ignore */ }
    startTransition(() => { setStats(buildStats(year)); });
  }, [year]);

  useEffect(() => {
    if (step > 0) {
      const timer = setTimeout(() => setCardsVisible(true), 100);
      return () => clearTimeout(timer);
    }
    startTransition(() => { setCardsVisible(false); });
  }, [step]);

  const cards: RevealCard[] = stats ? [
    {
      id: 'total',
      title: 'Total Signals',
      subtitle: 'Signals Tracked',
      value: stats.totalSignals.toLocaleString(),
      detail: `That's ${Math.round(stats.totalSignals / 365)} signals every single day`,
      color: 'emerald',
      icon: <Zap size={32} />,
    },
    {
      id: 'best-pair',
      title: 'Best Pair',
      subtitle: 'Your Top Performer',
      value: stats.bestPair,
      detail: `${formatPct(stats.bestPairWinRate)} win rate across ${stats.bestPairCount} signals`,
      color: 'purple',
      icon: <Trophy size={32} />,
    },
    {
      id: 'accuracy',
      title: 'Overall Accuracy',
      subtitle: 'Win Rate',
      value: formatPct(stats.overallWinRate),
      detail: `${stats.totalWins} wins / ${stats.totalLosses} losses`,
      color: 'amber',
      icon: <Target size={32} />,
    },
    {
      id: 'streak',
      title: 'Longest Streak',
      subtitle: 'Consecutive Wins',
      value: `${stats.longestStreak}`,
      detail: `Your best winning streak of the year`,
      color: 'cyan',
      icon: <TrendingUp size={32} />,
    },
    {
      id: 'bias',
      title: 'Trading Bias',
      subtitle: stats.totalBuy > stats.totalSell ? 'Mostly Bullish' : 'Mostly Bearish',
      value: stats.totalBuy > stats.totalSell ? `${Math.round((stats.totalBuy / stats.totalSignals) * 100)}% BUY` : `${Math.round((stats.totalSell / stats.totalSignals) * 100)}% SELL`,
      detail: `${stats.totalBuy} buys vs ${stats.totalSell} sells`,
      color: stats.totalBuy > stats.totalSell ? 'emerald' : 'rose',
      icon: <BarChart3 size={32} />,
    },
    {
      id: 'timeframe',
      title: 'Favorite Timeframe',
      subtitle: 'Most Used',
      value: stats.topTimeframe,
      detail: `You checked signals most around ${stats.favoriteHour}:00`,
      color: 'purple',
      icon: <Calendar size={32} />,
    },
  ] : [];

  const totalSteps = cards.length + 2; // intro + cards + summary

  const next = useCallback(() => {
    setCardsVisible(false);
    setTimeout(() => setStep(s => Math.min(s + 1, totalSteps - 1)), 200);
  }, [totalSteps]);

  const restart = useCallback(() => {
    setStep(0);
    setCardsVisible(false);
  }, []);

  const shareText = stats
    ? `My ${stats.year} TradeClaw Wrapped 🎁\n\n📊 ${stats.totalSignals} signals tracked\n🏆 Best pair: ${stats.bestPair} (${formatPct(stats.bestPairWinRate)})\n🎯 Overall accuracy: ${formatPct(stats.overallWinRate)}\n🔥 Longest streak: ${stats.longestStreak} wins\n\nGet your trading wrapped → tradeclaw.com/wrapped`
    : '';

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: `TradeClaw Wrapped ${year}`, text: shareText, url: 'https://tradeclaw.com/wrapped' });
    } else {
      navigator.clipboard.writeText(shareText);
    }
  }, [shareText, year]);

  if (!stats) return null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
          <Sparkles size={16} className="text-emerald-500" />
          TradeClaw
        </Link>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setStep(0); }}
            className="text-xs rounded-lg px-2 py-1 border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={restart} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <RotateCcw size={12} /> Restart
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full transition-all duration-500 rounded-r"
          style={{
            width: `${(step / (totalSteps - 1)) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #a855f7)',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="max-w-lg w-full">

          {/* Step 0: Intro */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'var(--accent-muted)', color: '#10b981' }}
              >
                <Sparkles size={14} /> Your Year in Trading
              </div>
              <h1 className="text-4xl md:text-6xl font-bold">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #a855f7)' }}>
                  {year} Wrapped
                </span>
              </h1>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                Your trading year in review. See your signals, wins, streaks, and patterns — all in one beautiful summary.
              </p>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Reveal My Stats <ArrowRight size={16} />
              </button>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Based on your signal history + localStorage data
              </p>
            </div>
          )}

          {/* Steps 1–6: Individual cards */}
          {step >= 1 && step <= cards.length && (
            <div className="space-y-6">
              <AnimatedRevealCard
                card={cards[step - 1]}
                index={0}
                isVisible={cardsVisible}
              />
              <div className="flex justify-center">
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: 'var(--accent-muted)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  {step < cards.length ? 'Next' : 'See Summary'} <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex justify-center gap-1.5">
                {cards.map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: i < step ? '#10b981' : 'var(--border)',
                      transform: i === step - 1 ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Final summary */}
          {step === totalSteps - 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Your <span className="text-emerald-500">{year}</span> Summary
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {stats.uniquePairs} pairs tracked • {stats.totalSignals.toLocaleString()} signals
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {cards.map((card, i) => (
                  <div
                    key={card.id}
                    className="rounded-xl p-4 text-center transition-all duration-500"
                    style={{
                      background: COLOR_MAP[card.color].bg,
                      border: `1px solid ${COLOR_MAP[card.color].border}`,
                      opacity: cardsVisible ? 1 : 0,
                      transform: cardsVisible ? 'translateY(0)' : 'translateY(20px)',
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR_MAP[card.color].text }}>
                      {card.subtitle}
                    </p>
                    <p className="text-xl font-bold" style={{ color: COLOR_MAP[card.color].text }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Monthly activity */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Monthly Signal Activity</p>
                <MiniBarChart data={stats.monthlyActivity} color="#10b981" />
                <div className="flex justify-between mt-1">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                    <span key={i} className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Accuracy trend */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Accuracy Trend</p>
                <AccuracyTrendLine data={stats.accuracyTrend} />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>Jan</span>
                  <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>Dec</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Share2 size={16} /> Share Wrapped
                </button>
                <Link
                  href="/accuracy"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: 'var(--accent-muted)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <Eye size={16} /> View Accuracy
                </Link>
              </div>

              {/* Star CTA */}
              <div className="text-center pt-4">
                <a
                  href="https://github.com/naimkatiman/tradeclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Star size={14} className="text-amber-400" /> Star TradeClaw on GitHub
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
