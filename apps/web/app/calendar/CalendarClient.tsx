'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Star,
  Share2,
  Info,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';

/* ─── Seeded PRNG ───────────────────────────────────────────────────────── */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ─── Generate heatmap data ─────────────────────────────────────────────── */

interface DayData {
  date: string;
  dateObj: Date;
  winRate: number | null; // null = no signals (future/weekend)
  signals: number;
  wins: number;
  losses: number;
  topPair: string;
}

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'XAGUSD', 'USDJPY'];

function generateCalendarData(): DayData[] {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(today.getFullYear() - 1);
  startDate.setDate(1); // start of month a year ago

  const days: DayData[] = [];
  const rng = seededRng(20240101);

  const current = new Date(startDate);
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const isPast = current < today;
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    if (isPast && !isWeekend) {
      const signals = Math.floor(rng() * 18) + 5; // 5-22 signals per day
      // Trend: slightly positive bias, with occasional rough days
      const baseProbability = 0.58 + rng() * 0.04 - 0.02;
      const wins = Math.round(signals * baseProbability);
      const losses = signals - wins;
      const winRate = Math.round((wins / signals) * 100);
      days.push({
        date: dateStr,
        dateObj: new Date(current),
        winRate,
        signals,
        wins,
        losses,
        topPair: PAIRS[Math.floor(rng() * PAIRS.length)],
      });
    } else {
      days.push({
        date: dateStr,
        dateObj: new Date(current),
        winRate: null,
        signals: 0,
        wins: 0,
        losses: 0,
        topPair: '',
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getDayColor(winRate: number | null): string {
  if (winRate === null) return 'bg-[var(--glass-bg)] opacity-40';
  if (winRate >= 75) return 'bg-emerald-400';
  if (winRate >= 65) return 'bg-emerald-500';
  if (winRate >= 55) return 'bg-emerald-600/80';
  if (winRate >= 45) return 'bg-yellow-500/70';
  if (winRate >= 35) return 'bg-orange-500/70';
  return 'bg-rose-500/70';
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function CalendarClient() {
  const allDays = useMemo(() => generateCalendarData(), []);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group by week for heatmap display
  const weeks = useMemo(() => {
    const activeDays = allDays.filter(d => d.winRate !== null);
    const result: DayData[][] = [];
    let week: DayData[] = [];

    // Fill leading empty days to align to Sunday
    if (allDays.length > 0) {
      const firstDow = allDays[0].dateObj.getDay();
      for (let i = 0; i < firstDow; i++) {
        week.push({ date: '', dateObj: new Date(), winRate: null, signals: 0, wins: 0, losses: 0, topPair: '' });
      }
    }

    for (const day of allDays) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) result.push(week);
    return { weeks: result, activeDays };
  }, [allDays]);

  // Stats
  const stats = useMemo(() => {
    const active = weeks.activeDays;
    const totalSignals = active.reduce((s, d) => s + d.signals, 0);
    const totalWins = active.reduce((s, d) => s + d.wins, 0);
    const overallWinRate = totalSignals > 0 ? Math.round((totalWins / totalSignals) * 100) : 0;
    const bestDay = [...active].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];
    const worstDay = [...active].sort((a, b) => (a.winRate ?? 100) - (b.winRate ?? 100))[0];
    const greenDays = active.filter(d => (d.winRate ?? 0) >= 55).length;
    const redDays = active.filter(d => (d.winRate ?? 100) < 45).length;
    return { totalSignals, totalWins, overallWinRate, bestDay, worstDay, greenDays, redDays, activeDays: active.length };
  }, [weeks.activeDays]);

  // Month labels for x-axis
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.weeks.forEach((week, wi) => {
      for (const day of week) {
        if (day.date && day.dateObj.getMonth() !== lastMonth) {
          lastMonth = day.dateObj.getMonth();
          labels.push({
            label: day.dateObj.toLocaleString('default', { month: 'short' }),
            weekIndex: wi,
          });
          break;
        }
      }
    });
    return labels;
  }, [weeks.weeks]);

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
            <Calendar className="w-3 h-3" />
            Signal Accuracy Calendar
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Daily <span className="text-emerald-400">Win Rate</span> Heatmap
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            GitHub-style visualization of TradeClaw signal accuracy — green is good, red is rough.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Overall Win Rate', value: `${stats.overallWinRate}%`, icon: BarChart3, color: 'text-emerald-400' },
            { label: 'Total Signals', value: stats.totalSignals.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Green Days', value: stats.greenDays, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Trading Days', value: stats.activeDays, icon: Calendar, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Last 12 Months — Signal Win Rate</h2>
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Info className="w-3 h-3" />
              Weekends excluded
            </div>
          </div>

          {/* Month labels */}
          <div className="min-w-[700px]">
            <div className="flex mb-1 ml-8">
              {monthLabels.map((m, i) => (
                <div
                  key={i}
                  className="text-[10px] text-[var(--text-secondary)]"
                  style={{ marginLeft: i === 0 ? `${m.weekIndex * 14}px` : `${(m.weekIndex - (monthLabels[i - 1]?.weekIndex ?? 0)) * 14 - 20}px` }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day labels + grid */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-0.5 mt-0.5">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className={`text-[10px] text-[var(--text-secondary)] h-[11px] leading-[11px] ${i % 2 === 0 ? 'opacity-0' : ''}`}>
                    {d.slice(0, 1)}
                  </div>
                ))}
              </div>
              <div className="flex gap-0.5">
                {weeks.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day, di) => (
                      <div
                        key={`${wi}-${di}`}
                        title={day.date ? `${day.date}: ${day.winRate !== null ? `${day.winRate}% win rate (${day.signals} signals)` : 'No data'}` : ''}
                        onMouseEnter={() => day.winRate !== null && day.date ? setHoveredDay(day) : null}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-[11px] h-[11px] rounded-sm cursor-pointer transition-all hover:scale-125 hover:z-10 ${
                          !day.date ? 'invisible' : getDayColor(day.winRate)
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
              <span>Less</span>
              {['bg-rose-500/70', 'bg-orange-500/70', 'bg-yellow-500/70', 'bg-emerald-600/80', 'bg-emerald-500', 'bg-emerald-400'].map(c => (
                <div key={c} className={`w-[11px] h-[11px] rounded-sm ${c}`} />
              ))}
              <span>More wins</span>
            </div>
          </div>
        </div>

        {/* Hovered day tooltip card */}
        {hoveredDay && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{hoveredDay.dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Top pair: {hoveredDay.topPair}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${(hoveredDay.winRate ?? 0) >= 55 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hoveredDay.winRate}%
                </p>
                <p className="text-xs text-[var(--text-secondary)]">win rate</p>
              </div>
            </div>
            <div className="flex gap-6 mt-3 text-sm">
              <span className="text-emerald-400">✓ {hoveredDay.wins} wins</span>
              <span className="text-rose-400">✗ {hoveredDay.losses} losses</span>
              <span className="text-[var(--text-secondary)]">{hoveredDay.signals} total signals</span>
            </div>
          </div>
        )}

        {/* Best / Worst days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Best Day</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">{stats.bestDay?.winRate}%</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {stats.bestDay?.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {stats.bestDay?.signals} signals · {stats.bestDay?.topPair}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-semibold text-rose-400">Toughest Day</span>
            </div>
            <p className="text-2xl font-black text-rose-400">{stats.worstDay?.winRate}%</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {stats.worstDay?.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {stats.worstDay?.signals} signals · {stats.worstDay?.topPair}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6 flex gap-3">
          <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)]">
            Data shown uses seeded simulation for demonstration. Live signal tracking is actively being built into
            production infrastructure. Signal performance is not guaranteed — all trading involves risk.
            See <Link href="/accuracy" className="text-emerald-400 hover:underline">/accuracy</Link> for methodology.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Help us reach 1000 GitHub stars and unlock more live tracking features
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`TradeClaw's signal accuracy calendar is 🔥 Check out the daily win rate heatmap: https://tradeclaw.win/calendar ⭐ Star it: https://github.com/naimkatiman/tradeclaw`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] hover:border-blue-400/40 text-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              Share
            </a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/accuracy" className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
            ← View detailed accuracy stats
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
