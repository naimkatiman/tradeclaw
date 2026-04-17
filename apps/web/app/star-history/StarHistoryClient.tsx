'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Star, Download, Share2, TrendingUp, Calendar, Zap, Award } from 'lucide-react';

interface WeekData {
  week: string;
  count: number;
  cumulative: number;
}

interface StarHistoryData {
  weeks: WeekData[];
  total: number;
  peakWeek: { week: string; count: number };
  recentGrowth: number;
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

function getColor(count: number): string {
  if (count === 0) return '#18181b'; // zinc-900
  if (count === 1) return '#064e3b'; // emerald-950
  if (count <= 3) return '#065f46'; // emerald-900
  if (count <= 5) return '#047857'; // emerald-700
  if (count <= 8) return '#059669'; // emerald-600
  return '#10b981'; // emerald-500
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StarHistoryClient() {
  const [data, setData] = useState<StarHistoryData | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; week: WeekData } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/star-history')
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Draw cumulative growth chart
  useEffect(() => {
    if (!data || !chartRef.current) return;
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const weeks = data.weeks;
    const maxCum = Math.max(...weeks.map((w) => w.cumulative), 1);
    const pad = { top: 16, right: 16, bottom: 28, left: 40 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1c1c1e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      const val = Math.round((maxCum / 4) * (4 - i));
      ctx.fillStyle = '#52525b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), pad.left - 4, y + 3);
    }

    // Area fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    gradient.addColorStop(0, 'rgba(16,185,129,0.4)');
    gradient.addColorStop(1, 'rgba(16,185,129,0.02)');

    ctx.beginPath();
    weeks.forEach((w, i) => {
      const x = pad.left + (i / (weeks.length - 1)) * chartW;
      const y = pad.top + chartH - (w.cumulative / maxCum) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, H - pad.bottom);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    weeks.forEach((w, i) => {
      const x = pad.left + (i / (weeks.length - 1)) * chartW;
      const y = pad.top + chartH - (w.cumulative / maxCum) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Milestone dots
    MILESTONES.forEach((ms) => {
      const idx = weeks.findIndex((w) => w.cumulative >= ms);
      if (idx < 0) return;
      const x = pad.left + (idx / (weeks.length - 1)) * chartW;
      const y = pad.top + chartH - (weeks[idx].cumulative / maxCum) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    });

    // X-axis labels (every 13 weeks)
    ctx.fillStyle = '#52525b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    [0, 13, 26, 39, 51].forEach((i) => {
      if (i >= weeks.length) return;
      const x = pad.left + (i / (weeks.length - 1)) * chartW;
      const d = new Date(weeks[i].week);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, H - 6);
    });
  }, [data]);

  const handleDownload = () => {
    if (!data) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 800, 400);

    // Title
    ctx.fillStyle = '#f4f4f5';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('TradeClaw ⭐ Star History', 32, 48);
    ctx.fillStyle = '#10b981';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${data.total} stars · github.com/naimkatiman/tradeclaw`, 32, 72);

    // Calendar grid (52 columns × 7 rows)
    const cellSize = 10;
    const gap = 2;
    const startX = 32;
    const startY = 96;

    if (data.weeks.length > 0) {
      data.weeks.forEach((w, colIdx) => {
        for (let row = 0; row < 7; row++) {
          const x = startX + colIdx * (cellSize + gap);
          const y = startY + row * (cellSize + gap);
          // Distribute week stars across days
          const dayCount = row === 0 ? w.count : 0;
          ctx.fillStyle = getColor(dayCount);
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 2);
          ctx.fill();
        }
      });
    }

    // Footer
    ctx.fillStyle = '#52525b';
    ctx.font = '11px sans-serif';
    ctx.fillText('tradeclaw.win/star-history', 32, 380);
    ctx.fillText(`Generated ${new Date().toLocaleDateString()}`, 600, 380);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'star-history-tradeclaw.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nextMilestone = MILESTONES.find((m) => m > data.total) ?? 1000;
  const prevMilestone = MILESTONES.filter((m) => m <= data.total).pop() ?? 0;
  const msPct = ((data.total - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  // Build day grid (52 cols × 7 rows)
  const today = new Date();
  const todayDay = today.getDay();

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Hero */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Star History</h1>
              <p className="text-sm text-[var(--text-secondary)]">Weekly GitHub star growth calendar</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Star, label: 'Total Stars', value: data.total, color: 'text-amber-400' },
              { icon: TrendingUp, label: 'Last 4 Weeks', value: `+${data.recentGrowth}`, color: 'text-emerald-400' },
              { icon: Award, label: 'Peak Week', value: `+${data.peakWeek.count}`, color: 'text-purple-400' },
              { icon: Zap, label: 'Next Milestone', value: nextMilestone, color: 'text-blue-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progress to next milestone */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-2">
              <span>{prevMilestone} stars</span>
              <span className="text-emerald-400 font-medium">{msPct.toFixed(0)}% to {nextMilestone} ⭐</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${msPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Calendar */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-[var(--foreground)]">52-Week Star Calendar</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <Download className="w-3 h-3" />
                Download PNG
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`⭐ TradeClaw has ${data.total} GitHub stars!\n\nOpen-source AI trading signal platform — free forever.\n\nhttps://github.com/naimkatiman/tradeclaw\nhttps://tradeclaw.win/star-history`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <Share2 className="w-3 h-3" />
                Share on X
              </a>
            </div>
          </div>

          {/* Day-of-week labels */}
          <div className="flex gap-1 mb-1 ml-0" ref={calendarRef}>
            <div className="w-6" />
            {/* Col labels every 13 weeks */}
            <div className="flex gap-[2px]">
              {data.weeks.map((w, i) => (
                <div key={w.week} className="w-[10px]">
                  {i % 13 === 0 && (
                    <span className="text-[8px] text-zinc-500 whitespace-nowrap absolute">
                      {new Date(w.week).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-3 relative overflow-x-auto pb-2">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] shrink-0">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="w-4 h-[10px] flex items-center justify-end">
                  {i % 2 === 1 && <span className="text-[8px] text-zinc-500">{d}</span>}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-[2px]">
              {data.weeks.map((w, colIdx) => {
                // Check if this week crosses a milestone
                const prevWeekCum = colIdx > 0 ? data.weeks[colIdx - 1].cumulative : 0;
                const milestoneCrossed = MILESTONES.find(
                  (m) => m > prevWeekCum && m <= w.cumulative
                );

                return (
                  <div key={w.week} className="flex flex-col gap-[2px] relative">
                    {[0, 1, 2, 3, 4, 5, 6].map((row) => {
                      // For the last column, only show up to today's day
                      const isLastCol = colIdx === data.weeks.length - 1;
                      const isFuture = isLastCol && row > todayDay;
                      const dayCount = row === 0 ? w.count : 0; // distribute on Sunday
                      return (
                        <div
                          key={row}
                          className="w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-80 relative group"
                          style={{ backgroundColor: isFuture ? '#09090b' : getColor(dayCount) }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const containerRect = calendarRef.current?.getBoundingClientRect();
                            if (containerRect) {
                              setTooltip({
                                x: rect.left - containerRect.left + 8,
                                y: rect.top - containerRect.top - 40,
                                week: w,
                              });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                    {/* Milestone marker */}
                    {milestoneCrossed && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-amber-400 whitespace-nowrap">
                        ⭐{milestoneCrossed}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div className="font-semibold text-[var(--foreground)]">{formatDate(tooltip.week.week)}</div>
              <div className="text-emerald-400">+{tooltip.week.count} stars this week</div>
              <div className="text-zinc-500">{tooltip.week.cumulative} total</div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500">
            <span>Less</span>
            {[0, 1, 3, 6, 9].map((count) => (
              <div
                key={count}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{ backgroundColor: getColor(count) }}
              />
            ))}
            <span>More</span>
            <span className="ml-4 text-amber-400">⭐ = milestone</span>
          </div>
        </div>

        {/* Cumulative growth chart */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Cumulative Growth</span>
          </div>
          <canvas
            ref={chartRef}
            className="w-full h-[140px] rounded-lg"
            style={{ display: 'block' }}
          />
        </div>

        {/* Embed section */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Embed Star Widget</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Add a live star count widget to your blog or site
          </p>
          <div className="bg-zinc-900 rounded-lg p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
            <code>{`<iframe src="https://tradeclaw.win/api/widget/stars" width="300" height="200" frameborder="0" style="border-radius:12px"></iframe>`}</code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `<iframe src="https://tradeclaw.win/api/widget/stars" width="300" height="200" frameborder="0" style="border-radius:12px"></iframe>`
              );
            }}
            className="mt-3 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded-lg transition-colors border border-emerald-500/20"
          >
            Copy Embed Code
          </button>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
          <Link
            href="/share"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-[var(--foreground)] font-semibold rounded-xl transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share TradeClaw
          </Link>
        </div>
      </div>
    </div>
  );
}
