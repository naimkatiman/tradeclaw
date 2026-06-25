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

// Mirrors the WrappedStats payload from /api/wrapped (computed server-side from
// real signal_history via isCountedResolved). Kept as a local interface so this
// client component never imports the server-only data module.
interface WrappedStats {
  year: number;
  hasEnoughData: boolean;
  totalSignals: number;
  bestPair: string;
  bestPairCount: number;
  bestPairWinRate: number; // 0..1
  worstPair: string;
  worstPairWinRate: number; // 0..1
  totalBuy: number;
  totalSell: number;
  avgConfidence: number; // 0..100
  topTimeframe: string;
  totalWins: number;
  totalLosses: number;
  overallWinRate: number; // 0..1
  longestStreak: number;
  monthlyActivity: number[];
  accuracyTrend: number[];
  busiestHour: number; // 0..23 UTC
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
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
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
        const y = h - pad - ((v - min) / span) * (h - 2 * pad);
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
  amber: { bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.3)', text: '#a1a1aa', glow: '0 0 40px rgba(161,161,170,0.15)' },
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
/*  Header (year selector + restart)                                   */
/* ------------------------------------------------------------------ */

function WrappedHeader({
  year,
  currentYear,
  onYear,
  onRestart,
}: {
  year: number;
  currentYear: number;
  onYear: (y: number) => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
      <Link href="/" className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
        <Sparkles size={16} className="text-emerald-500" />
        TradeClaw
      </Link>
      <div className="flex items-center gap-3">
        <select
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
          className="text-xs rounded-lg px-2 py-1 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button onClick={onRestart} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <RotateCcw size={12} /> Restart
        </button>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0 = intro, 1-6 = reveal cards, 7 = summary
  const [cardsVisible, setCardsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load real, server-computed stats for the selected year.
  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setStep(0);
    });
    fetch(`/api/wrapped?year=${year}`)
      .then((res) => res.json() as Promise<WrappedStats>)
      .then((data) => {
        if (cancelled) return;
        startTransition(() => {
          setStats(data);
          setLoading(false);
        });
      })
      .catch(() => {
        if (cancelled) return;
        startTransition(() => {
          setStats(null);
          setLoading(false);
        });
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    if (step > 0) {
      const timer = setTimeout(() => setCardsVisible(true), 100);
      return () => clearTimeout(timer);
    }
    startTransition(() => {
      setCardsVisible(false);
    });
  }, [step]);

  const cards: RevealCard[] = stats && stats.hasEnoughData ? [
    {
      id: 'total',
      title: 'Total Signals',
      subtitle: 'Signals Tracked',
      value: stats.totalSignals.toLocaleString(),
      detail: `${stats.uniquePairs} pairs tracked in ${stats.year}`,
      color: 'emerald',
      icon: <Zap size={32} />,
    },
    {
      id: 'best-pair',
      title: 'Best Pair',
      subtitle: 'Top Performing Pair',
      value: stats.bestPair,
      detail: `${formatPct(stats.bestPairWinRate)} win rate across ${stats.bestPairCount} signals`,
      color: 'purple',
      icon: <Trophy size={32} />,
    },
    {
      id: 'accuracy',
      title: 'Signal Win Rate',
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
      detail: `Longest run of winning signals in ${stats.year}`,
      color: 'cyan',
      icon: <TrendingUp size={32} />,
    },
    {
      id: 'bias',
      title: 'Signal Bias',
      subtitle: stats.totalBuy >= stats.totalSell ? 'Mostly Bullish' : 'Mostly Bearish',
      value:
        stats.totalBuy >= stats.totalSell
          ? `${Math.round((stats.totalBuy / stats.totalSignals) * 100)}% BUY`
          : `${Math.round((stats.totalSell / stats.totalSignals) * 100)}% SELL`,
      detail: `${stats.totalBuy} buys vs ${stats.totalSell} sells`,
      color: stats.totalBuy >= stats.totalSell ? 'emerald' : 'rose',
      icon: <BarChart3 size={32} />,
    },
    {
      id: 'timeframe',
      title: 'Most Active Timeframe',
      subtitle: 'Most Used',
      value: stats.topTimeframe,
      detail: `Most signals fired around ${stats.busiestHour}:00 UTC`,
      color: 'purple',
      icon: <Calendar size={32} />,
    },
  ] : [];

  const totalSteps = cards.length + 2; // intro + cards + summary

  const next = useCallback(() => {
    setCardsVisible(false);
    setTimeout(() => setStep((s) => Math.min(s + 1, totalSteps - 1)), 200);
  }, [totalSteps]);

  const restart = useCallback(() => {
    setStep(0);
    setCardsVisible(false);
  }, []);

  const shareText = stats && stats.hasEnoughData
    ? `TradeClaw ${stats.year} Wrapped 🎁\n\n📊 ${stats.totalSignals} signals tracked\n🏆 Best pair: ${stats.bestPair} (${formatPct(stats.bestPairWinRate)})\n🎯 Signal win rate: ${formatPct(stats.overallWinRate)}\n🔥 Longest streak: ${stats.longestStreak} wins\n\nSee TradeClaw's signal year → tradeclaw.win/wrapped`
    : '';

  const handleShare = useCallback(() => {
    if (!shareText) return;
    if (navigator.share) {
      navigator.share({ title: `TradeClaw Wrapped ${year}`, text: shareText, url: 'https://tradeclaw.win/wrapped' });
    } else {
      navigator.clipboard.writeText(shareText);
    }
  }, [shareText, year]);

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Honest empty state — not enough real resolved history ─────────
  if (!stats || !stats.hasEnoughData) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
        <WrappedHeader year={year} currentYear={currentYear} onYear={setYear} onRestart={restart} />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-5">
            <div
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'var(--accent-muted)', color: '#10b981' }}
            >
              <Sparkles size={14} /> {year} Wrapped
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Not enough signal history yet</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              TradeClaw Wrapped is built only from real resolved signal outcomes — no estimates, no
              filler.{' '}
              <span style={{ color: 'var(--foreground)' }}>{stats?.totalSignals ?? 0}</span> signals
              have resolved for {year} so far. Check back as more outcomes settle, or explore the live{' '}
              <Link href="/accuracy" className="text-emerald-500 hover:text-emerald-400">
                accuracy data
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <WrappedHeader year={year} currentYear={currentYear} onYear={setYear} onRestart={restart} />

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
                <Sparkles size={14} /> The Signal Year in Review
              </div>
              <h1 className="text-4xl md:text-6xl font-bold">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #a855f7)' }}>
                  {year} Wrapped
                </span>
              </h1>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                TradeClaw&apos;s signal year in review. Every tracked signal, win rate, streak, and
                pattern — from real resolved outcomes.
              </p>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Reveal the Stats <ArrowRight size={16} />
              </button>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Based on TradeClaw&apos;s real resolved signal history
              </p>
            </div>
          )}

          {/* Steps 1–6: Individual cards */}
          {step >= 1 && step <= cards.length && (
            <div className="space-y-6">
              <AnimatedRevealCard card={cards[step - 1]} index={0} isVisible={cardsVisible} />
              <div className="flex justify-center">
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: 'var(--accent-muted)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
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
                  TradeClaw <span className="text-emerald-500">{year}</span> Summary
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
                  style={{ background: 'var(--accent-muted)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
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
                  <Star size={14} className="text-zinc-400" /> Star TradeClaw on GitHub
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
