'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  Share2,
  Trophy,
  Activity,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface ReportData {
  weekOf: string;
  isoWeek: number;
  totalSignals: number;
  winRate: number;
  topAsset: string;
  topAccuracy: number;
  newContributors: number;
  starsThisWeek: number;
  dailyBreakdown: [number, number, number, number, number, number, number];
  generatedAt: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function BarChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const max = Math.max(...data, 1);
    const barW = Math.floor((W - 48) / data.length - 6);
    const gap = Math.floor((W - 48) / data.length);
    const padX = 24;
    const padY = 12;
    const chartH = H - padY * 2 - 24;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(W - padX, y);
      ctx.stroke();
    }

    // Bars
    data.forEach((val, i) => {
      const x = padX + i * gap + (gap - barW) / 2;
      const barH = (val / max) * chartH;
      const y = padY + chartH - barH;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, 'rgba(16,185,129,0.9)');
      grad.addColorStop(1, 'rgba(16,185,129,0.2)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 3);
      ctx.fill();

      // Value label
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `600 9px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + barW / 2, y - 4);

      // Day label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `500 9px -apple-system, sans-serif`;
      ctx.fillText(DAYS[i], x + barW / 2, H - 4);
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 160 }}
    />
  );
}

export default function ReportClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/report');
      const json = await res.json() as ReportData;
      setData(json);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleShare = () => {
    if (!data) return;
    const tweet = encodeURIComponent(
      `📊 TradeClaw Weekly Pulse — Week ${data.isoWeek}\n\n` +
      `⚡ ${data.totalSignals} signals fired\n` +
      `🎯 ${data.winRate}% win rate\n` +
      `🏆 Top asset: ${data.topAsset} (${data.topAccuracy}% accuracy)\n\n` +
      `Open-source AI trading signals → https://github.com/naimkatiman/tradeclaw\n\n` +
      `#algotrading #opensource #tradeclaw`
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)] text-sm">Loading report…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Failed to load report data.</p>
      </div>
    );
  }

  const stats = [
    {
      icon: Activity,
      label: 'Signals Generated',
      value: data.totalSignals.toLocaleString(),
      sub: 'This week',
      color: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-transparent',
    },
    {
      icon: TrendingUp,
      label: 'Win Rate',
      value: `${data.winRate}%`,
      sub: 'Resolved signals',
      color: 'text-blue-400',
      bg: 'from-blue-500/10 to-transparent',
    },
    {
      icon: Users,
      label: 'New Contributors',
      value: data.newContributors === 0 ? 'None yet' : `+${data.newContributors}`,
      sub: 'GitHub this week',
      color: 'text-purple-400',
      bg: 'from-purple-500/10 to-transparent',
    },
    {
      icon: Star,
      label: 'New Stars',
      value: `+${data.starsThisWeek}`,
      sub: 'Toward 1,000',
      color: 'text-zinc-400',
      bg: 'from-zinc-500/10 to-transparent',
    },
  ];

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <BarChart2 className="w-3 h-3" />
            Week {data.isoWeek} · {data.weekOf}
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Weekly Pulse
            </h1>
            <p className="text-[var(--text-secondary)] text-sm max-w-xl">
              Signals fired, win rates, top performers — every week, auto-generated from TradeClaw live data.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => void fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Share2 className="w-3 h-3" />
              Share on X
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`glass rounded-2xl p-4 bg-gradient-to-br ${s.bg} border border-[var(--border)]`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold">
                {s.label}
              </span>
            </div>
            <div className={`text-2xl font-bold tracking-tight mb-0.5 ${s.color}`}>
              {s.value}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Bar chart — spans 2 cols */}
        <div className="md:col-span-2 glass rounded-2xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Signals per day
            </h2>
            <span className="text-[10px] text-[var(--text-secondary)]">Mon – Sun</span>
          </div>
          <BarChart data={data.dailyBreakdown} />
        </div>

        {/* Top asset card */}
        <div className="glass rounded-2xl p-5 border border-[var(--border)] bg-gradient-to-br from-zinc-500/5 to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold">Top Asset</span>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-1">{data.topAsset}</div>
            <div className="text-sm text-[var(--text-secondary)] mb-4">
              {data.topAccuracy}% accuracy this week
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-1">
              <div
                className="bg-gradient-to-r from-zinc-400 to-zinc-300 h-1.5 rounded-full"
                style={{ width: `${data.topAccuracy}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">Accuracy rate</div>
          </div>
          <Link
            href={`/signal/${data.topAsset}-H1-BUY`}
            className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            View latest signal
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* GitHub Discussions + CTA */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <a
          href="https://github.com/naimkatiman/tradeclaw/discussions"
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-2xl p-5 border border-[var(--border)] hover:border-emerald-500/30 transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium">GitHub Discussions</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Weekly pulse threads posted every Monday automatically
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-emerald-400 transition-colors" />
        </a>

        <div className="glass rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-zinc-400 fill-zinc-400" />
            <span className="text-sm font-semibold">Help us hit 1,000 stars</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Free, open-source, no paywalls. A star costs nothing and helps devs discover TradeClaw.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-colors"
          >
            <Star className="w-3 h-3" />
            Star on GitHub
          </a>
        </div>
      </div>

      {/* Updated at */}
      <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
        Generated {new Date(data.generatedAt).toLocaleString()} · Auto-refreshes weekly ·{' '}
        <Link href="/accuracy" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          View full accuracy data
        </Link>
      </div>
    </main>
  );
}
