'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Share2, Trophy, TrendingUp, BarChart2, Target } from 'lucide-react';

/* ---------- types ---------- */
interface StrategyResult {
  id: string;
  name: string;
  dailyPnL: number[];
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: number;
  rank: number;
  color: string;
}

interface TournamentData {
  strategies: StrategyResult[];
  winner: StrategyResult;
  rankedStrategies: StrategyResult[];
}

/* ---------- constants ---------- */
const RANK_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'emerald' },
  2: { bg: 'bg-zinc-400/10', border: 'border-zinc-400/40', text: 'text-zinc-300', label: 'silver' },
  3: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/40', text: 'text-zinc-400', label: 'amber' },
};

const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/* ---------- component ---------- */
export default function TournamentClient() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/tournament')
      .then((r) => r.json())
      .then((d: TournamentData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---------- canvas drawing ---------- */
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PAD_L = 50;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 30;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    // Build equity curves
    const curves: { color: string; points: number[] }[] = data.strategies.map((s) => {
      const pts: number[] = [100];
      let eq = 100;
      for (const pnl of s.dailyPnL) {
        eq += pnl;
        pts.push(eq);
      }
      return { color: s.color, points: pts };
    });

    const allVals = curves.flatMap((c) => c.points);
    const minY = Math.min(...allVals) - 2;
    const maxY = Math.max(...allVals) + 2;
    const days = curves[0].points.length;

    const xScale = (i: number) => PAD_L + (i / (days - 1)) * chartW;
    const yScale = (v: number) => PAD_T + chartH - ((v - minY) / (maxY - minY)) * chartH;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = PAD_T + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();

      // Y labels
      const val = maxY - ((maxY - minY) / gridSteps) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), PAD_L - 6, y + 3);
    }

    // X labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    for (let d = 0; d < days; d += 15) {
      ctx.fillText(`D${d}`, xScale(d), H - 6);
    }

    // Baseline at 100
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD_L, yScale(100));
    ctx.lineTo(W - PAD_R, yScale(100));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw curves
    for (const curve of curves) {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < curve.points.length; i++) {
        const x = xScale(i);
        const y = yScale(curve.points[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    drawChart();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => drawChart());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [data, drawChart]);

  /* ---------- share ---------- */
  function handleShare() {
    if (!data) return;
    const w = data.winner;
    const text = encodeURIComponent(
      `${w.name} won the TradeClaw 90-day tournament with ${w.totalReturn}% return! https://github.com/naimkatiman/tradeclaw ⭐`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener');
  }

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading tournament data&hellip;</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">Failed to load tournament data.</p>
      </main>
    );
  }

  const { rankedStrategies, winner } = data;
  const podium = rankedStrategies.slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ====== Hero ====== */}
      <section className="pt-28 pb-12 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400">
            90-Day Backtest
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400" />
            </span>
            Live Results
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Strategy <span className="text-emerald-400">Tournament</span>
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto text-sm">
          5 built-in strategies compete head-to-head in a 90-day simulated backtest. Deterministic results, seeded PRNG&nbsp;&mdash; no cherry-picking.
        </p>
      </section>

      <div className="max-w-5xl mx-auto px-4 space-y-12 pb-24">
        {/* ====== Podium ====== */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" /> Podium
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((s, i) => {
              const rc = RANK_COLORS[s.rank] ?? { bg: 'bg-zinc-800/50', border: 'border-zinc-700', text: 'text-zinc-400', label: 'zinc' };
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-6 text-center ${rc.bg} ${rc.border} animate-fade-up`}
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="text-4xl mb-2">{RANK_EMOJI[s.rank]}</div>
                  <div className={`text-xl font-bold ${rc.text}`}>{s.name}</div>
                  <div className="mt-2 text-2xl font-mono font-bold text-zinc-100">
                    {s.totalReturn > 0 ? '+' : ''}
                    {s.totalReturn}%
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Win Rate {s.winRate}% &middot; Sharpe {s.sharpeRatio}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ====== Full Bracket ====== */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" /> Full Bracket
          </h2>
          <div className="space-y-3">
            {rankedStrategies.map((s) => {
              const rc = RANK_COLORS[s.rank];
              const borderClass = rc ? rc.border : 'border-zinc-800';
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 rounded-xl border ${borderClass} bg-zinc-900/60 px-5 py-4`}
                >
                  <div className="w-8 text-center font-mono font-bold text-lg" style={{ color: s.color }}>
                    {RANK_EMOJI[s.rank] ?? `#${s.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.name}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-xs text-zinc-400 font-mono">
                    <span className={s.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {s.totalReturn > 0 ? '+' : ''}
                      {s.totalReturn}%
                    </span>
                    <span>WR {s.winRate}%</span>
                    <span>Sharpe {s.sharpeRatio}</span>
                    <span>{s.trades} trades</span>
                  </div>
                  <div className="sm:hidden text-right">
                    <div className={`text-sm font-mono font-bold ${s.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.totalReturn > 0 ? '+' : ''}
                      {s.totalReturn}%
                    </div>
                    <div className="text-[10px] text-zinc-500">WR {s.winRate}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ====== P&L Race Chart ====== */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> P&amp;L Race Chart
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: 300 }}
            />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 px-2">
              {data.strategies.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====== Winner Card ====== */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" /> Tournament Winner
          </h2>
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="text-6xl">🏆</div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-emerald-400">{winner.name}</div>
                <div className="text-zinc-400 text-sm mt-1">Rank #1 out of 5 strategies over 90 days</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <Stat label="Total Return" value={`${winner.totalReturn > 0 ? '+' : ''}${winner.totalReturn}%`} accent />
                  <Stat label="Win Rate" value={`${winner.winRate}%`} />
                  <Stat label="Max Drawdown" value={`${winner.maxDrawdown}%`} />
                  <Stat label="Sharpe Ratio" value={String(winner.sharpeRatio)} />
                </div>
                <div className="mt-2 text-xs text-zinc-500 font-mono">{winner.trades} trades executed</div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== CTAs ====== */}
        <section className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-6 py-3 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share Result on X
          </button>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 text-sm font-semibold transition-colors"
          >
            <Star className="w-4 h-4" /> Star on GitHub
          </a>
        </section>
      </div>
    </main>
  );
}

/* ---------- helper ---------- */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</div>
      <div className={`text-lg font-mono font-bold ${accent ? 'text-emerald-400' : 'text-zinc-100'}`}>{value}</div>
    </div>
  );
}
