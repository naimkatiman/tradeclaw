'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Info,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from '../components/navbar';

interface ApiDay {
  date: string;
  hitRate: number;
  countedOutcomes: number;
  hits: number;
  misses: number;
  mostObservedPair: string;
}

interface DayData extends ApiDay {
  dateObj: Date;
  hasData: boolean;
}

function startOfWindow(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
}

export function buildCalendarDays(source: ApiDay[], now = new Date()): DayData[] {
  const byDate = new Map(source.map((day) => [day.date, day]));
  const days: DayData[] = [];
  const current = startOfWindow(now);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const observed = byDate.get(date);
    days.push({
      date,
      dateObj: new Date(current),
      hitRate: observed?.hitRate ?? 0,
      countedOutcomes: observed?.countedOutcomes ?? 0,
      hits: observed?.hits ?? 0,
      misses: observed?.misses ?? 0,
      mostObservedPair: observed?.mostObservedPair ?? '',
      hasData: Boolean(observed),
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

function getDayColor(day: DayData): string {
  if (!day.hasData) return 'bg-[var(--glass-bg)] opacity-40';
  if (day.hitRate >= 75) return 'bg-emerald-400';
  if (day.hitRate >= 65) return 'bg-emerald-500';
  if (day.hitRate >= 55) return 'bg-emerald-600/80';
  if (day.hitRate >= 45) return 'bg-yellow-500/70';
  if (day.hitRate >= 35) return 'bg-orange-500/70';
  return 'bg-rose-500/70';
}

export function CalendarClient() {
  const [sourceDays, setSourceDays] = useState<ApiDay[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/calendar', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Calendar API returned ${response.status}`);
        return response.json() as Promise<{ days?: ApiDay[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setSourceDays(Array.isArray(payload.days) ? payload.days : []);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('unavailable');
      });
    return () => { active = false; };
  }, []);

  const allDays = useMemo(() => buildCalendarDays(sourceDays), [sourceDays]);
  const weeks = useMemo(() => {
    const result: DayData[][] = [];
    let week: DayData[] = [];
    const firstDow = allDays[0]?.dateObj.getUTCDay() ?? 0;
    for (let i = 0; i < firstDow; i += 1) {
      week.push({ date: '', dateObj: new Date(0), hitRate: 0, countedOutcomes: 0, hits: 0, misses: 0, mostObservedPair: '', hasData: false });
    }
    for (const day of allDays) {
      week.push(day);
      if (week.length === 7) { result.push(week); week = []; }
    }
    if (week.length) result.push(week);
    return result;
  }, [allDays]);

  const observedDays = useMemo(() => allDays.filter((day) => day.hasData), [allDays]);
  const stats = useMemo(() => {
    const total = observedDays.reduce((sum, day) => sum + day.countedOutcomes, 0);
    const hits = observedDays.reduce((sum, day) => sum + day.hits, 0);
    const ranked = [...observedDays].sort((a, b) => b.hitRate - a.hitRate || b.countedOutcomes - a.countedOutcomes);
    return {
      total,
      hits,
      hitRate: total ? Math.round((hits / total) * 100) : null,
      bestDay: ranked[0],
      worstDay: ranked.at(-1),
    };
  }, [observedDays]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstNewMonth = week.find((day) => day.date && day.dateObj.getUTCMonth() !== lastMonth);
      if (firstNewMonth) {
        lastMonth = firstNewMonth.dateObj.getUTCMonth();
        labels.push({ label: firstNewMonth.dateObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), weekIndex });
      }
    });
    return labels;
  }, [weeks]);

  const hasOutcomes = status === 'ready' && stats.total > 0;
  const statCards = [
    { label: '24h Hit Rate', value: stats.hitRate === null ? '-' : `${stats.hitRate}%`, icon: BarChart3, color: 'text-emerald-400' },
    { label: 'Counted Outcomes', value: stats.total.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Hits', value: stats.hits.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Days With Outcomes', value: observedDays.length.toLocaleString(), icon: Calendar, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
            <Calendar className="w-3 h-3" /> Counted Outcome Calendar
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Daily <span className="text-emerald-400">24h Hit Rate</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
            UTC-day aggregation of persisted, OHLCV-resolved signal outcomes. This is not broker execution or portfolio performance.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <p className="text-xl font-bold">{status === 'ready' ? value : '-'}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {status === 'unavailable' && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-5 mb-6 text-sm text-[var(--text-secondary)]">
            Counted outcome history is currently unavailable. No replacement or estimated values are shown.
          </div>
        )}
        {status === 'ready' && !hasOutcomes && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-6 text-sm text-[var(--text-secondary)]">
            No counted 24h outcomes are available in this window. The calendar remains empty until persisted outcomes pass the canonical counting rules.
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-sm font-semibold">Last 12 Months - Counted 24h Outcomes</h2>
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]"><Info className="w-3 h-3" /> UTC dates</div>
          </div>
          <div className="min-w-[700px]">
            <div className="flex mb-1 ml-8">
              {monthLabels.map((month, index) => (
                <div key={`${month.label}-${month.weekIndex}`} className="text-[10px] text-[var(--text-secondary)]" style={{ marginLeft: index === 0 ? `${month.weekIndex * 14}px` : `${(month.weekIndex - (monthLabels[index - 1]?.weekIndex ?? 0)) * 14 - 20}px` }}>
                  {month.label}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col gap-0.5 mt-0.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <div key={`${label}-${index}`} className={`text-[10px] text-[var(--text-secondary)] h-[11px] leading-[11px] ${index % 2 === 0 ? 'opacity-0' : ''}`}>{label}</div>)}
              </div>
              <div className="flex gap-0.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        title={day.date ? (day.hasData ? `${day.date}: ${day.hitRate}% hit rate (${day.countedOutcomes} counted outcomes)` : `${day.date}: no counted outcomes`) : ''}
                        onMouseEnter={() => day.hasData && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-[11px] h-[11px] rounded-sm transition-transform ${!day.date ? 'invisible' : getDayColor(day)} ${day.hasData ? 'cursor-pointer hover:scale-125' : ''}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
              <span>Lower</span>
              {['bg-rose-500/70', 'bg-orange-500/70', 'bg-yellow-500/70', 'bg-emerald-600/80', 'bg-emerald-500', 'bg-emerald-400'].map((color) => <div key={color} className={`w-[11px] h-[11px] rounded-sm ${color}`} />)}
              <span>Higher hit rate</span>
            </div>
          </div>
        </div>

        {hoveredDay && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{hoveredDay.dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Most observed pair: {hoveredDay.mostObservedPair || '-'}</p>
              </div>
              <div className="text-right"><p className="text-2xl font-black">{hoveredDay.hitRate}%</p><p className="text-xs text-[var(--text-secondary)]">24h hit rate</p></div>
            </div>
            <div className="flex flex-wrap gap-6 mt-3 text-sm">
              <span className="text-emerald-400">{hoveredDay.hits} hits</span>
              <span className="text-rose-400">{hoveredDay.misses} misses</span>
              <span className="text-[var(--text-secondary)]">{hoveredDay.countedOutcomes} counted outcomes</span>
            </div>
          </div>
        )}

        {hasOutcomes && stats.bestDay && stats.worstDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[{ title: 'Highest Observed Day', day: stats.bestDay, Icon: TrendingUp, panelClass: 'border-emerald-500/20 bg-emerald-500/5', textClass: 'text-emerald-400' }, { title: 'Lowest Observed Day', day: stats.worstDay, Icon: TrendingDown, panelClass: 'border-rose-500/20 bg-rose-500/5', textClass: 'text-rose-400' }].map(({ title, day, Icon, panelClass, textClass }) => (
              <div key={title} className={`rounded-lg border p-5 ${panelClass}`}>
                <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${textClass}`} /><span className={`text-sm font-semibold ${textClass}`}>{title}</span></div>
                <p className="text-2xl font-black">{day.hitRate}%</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{day.date} | {day.countedOutcomes} counted outcomes | {day.mostObservedPair}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6 flex gap-3">
          <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)]">
            Only persisted 24h outcomes resolved from OHLCV count. Simulated, gate-blocked, unresolved, and force-expired placeholder rows are excluded. Outcomes do not include broker fills, fees, slippage, position sizing, or portfolio equity. See <Link href="/accuracy" className="text-emerald-400 hover:underline">methodology</Link>.
          </p>
        </div>

        <div className="text-center">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('TradeClaw publishes a counted 24h signal-outcome calendar with its methodology and exclusions: https://tradeclaw.win/calendar')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] hover:border-blue-400/40 text-sm transition-colors">
            <Share2 className="w-4 h-4" /> Share methodology
          </a>
        </div>
      </div>
    </div>
  );
}
