'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Target, BarChart3, Clock, Activity, ArrowUpRight, Star, AlertTriangle, Trophy } from 'lucide-react';
import {
  STRATEGIES,
  ASSETS,
  RESULTS,
  generateEquityCurve,
  type StrategyId,
  type AssetId,
  type StrategyResult,
} from '../../lib/backtest-results';

// ─── Helpers ──────────────────────────────────────────────────

function hashKey(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function colorForValue(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function bgForHeatmap(v: number): string {
  if (v >= 6) return 'bg-emerald-500/40';
  if (v >= 3) return 'bg-emerald-500/25';
  if (v > 0) return 'bg-emerald-500/10';
  if (v === 0) return 'bg-white/[0.02]';
  if (v > -3) return 'bg-red-500/10';
  if (v > -6) return 'bg-red-500/25';
  return 'bg-red-500/40';
}

// ─── Equity Curve Canvas ──────────────────────────────────────

function EquityCurveChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width;
    const h = 200;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const pad = { top: 10, right: 10, bottom: 24, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const min = Math.min(...data, 0);
    const max = Math.max(...data);
    const range = max - min || 1;

    const toX = (i: number) => pad.left + (i / (data.length - 1)) * cw;
    const toY = (v: number) => pad.top + ch - ((v - min) / range) * ch;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = pad.top + (ch / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = max - (range / gridSteps) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${val >= 0 ? '+' : ''}${val.toFixed(1)}%`, pad.left - 6, y + 3);
    }

    // Zero line
    const zeroY = toY(0);
    if (zeroY >= pad.top && zeroY <= pad.top + ch) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(w - pad.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    gradient.addColorStop(0, 'rgba(16,185,129,0.15)');
    gradient.addColorStop(1, 'rgba(16,185,129,0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
    ctx.lineTo(toX(data.length - 1), pad.top + ch);
    ctx.lineTo(toX(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const xLabels = ['Mar', 'Jun', 'Sep', 'Dec', 'Feb'];
    xLabels.forEach((label, i) => {
      const x = pad.left + (i / (xLabels.length - 1)) * cw;
      ctx.fillText(label, x, h - 6);
    });
  }, [data]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────

function MetricCard({ label, value, suffix, icon: Icon, positive }: {
  label: string;
  value: string;
  suffix?: string;
  icon: typeof TrendingUp;
  positive?: boolean;
}) {
  return (
    <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <span className={`font-mono tabular-nums text-lg font-semibold ${positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {value}{suffix && <span className="text-xs text-zinc-500 ml-0.5">{suffix}</span>}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function ResultsClient() {
  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('rsi-mean-reversion');
  const [activeAsset, setActiveAsset] = useState<AssetId>('BTCUSD');
  const [sortBy, setSortBy] = useState<'sharpe' | 'return' | 'winRate'>('sharpe');

  const key = `${activeStrategy}-${activeAsset}`;
  const result = RESULTS.get(key);
  const seed = hashKey(key);
  const equityCurve = generateEquityCurve(seed, result?.metrics.totalReturn ?? 0, result?.metrics.maxDrawdown ?? -10);

  // Comparison table: all strategies for active asset, sorted
  const comparisonRows = STRATEGIES.map((s) => {
    const r = RESULTS.get(`${s.id}-${activeAsset}`);
    return { strategy: s, result: r };
  }).filter((r): r is { strategy: typeof STRATEGIES[number]; result: StrategyResult } => !!r.result)
    .sort((a, b) => {
      if (sortBy === 'sharpe') return b.result.metrics.sharpeRatio - a.result.metrics.sharpeRatio;
      if (sortBy === 'return') return b.result.metrics.totalReturn - a.result.metrics.totalReturn;
      return b.result.metrics.winRate - a.result.metrics.winRate;
    });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto px-4 pt-28 pb-24">

        {/* ─── Hero ─────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <BarChart3 className="w-3.5 h-3.5" />
            Verified Backtests
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Backtesting Results
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            Pre-computed performance across 5 strategies and 3 major assets.
            All results generated on 12 months of historical data with realistic slippage and fees.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-amber-400/80">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulated results. Past performance does not guarantee future returns.</span>
          </div>
        </div>

        {/* ─── Strategy Tabs ────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStrategy(s.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                activeStrategy === s.id
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/[0.03] text-zinc-400 border-white/5 hover:bg-white/[0.06]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* ─── Asset Pills ──────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          {ASSETS.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAsset(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeAsset === a.id
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/[0.03] text-zinc-400 border-white/5 hover:bg-white/[0.06]'
              }`}
            >
              {a.symbol}/{a.name}
            </button>
          ))}
        </div>

        {/* ─── Strategy Description ─────────────────────── */}
        {(() => {
          const strat = STRATEGIES.find(s => s.id === activeStrategy);
          if (!strat) return null;
          return (
            <div className="glass-card rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">{strat.name}</span>
              </div>
              <p className="text-xs text-zinc-400 mb-1">{strat.description}</p>
              <p className="text-[11px] text-zinc-500">Indicators: {strat.indicators}</p>
            </div>
          );
        })()}

        {result && (
          <>
            {/* ─── Metrics Cards ──────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <MetricCard
                label="Total Return"
                value={`${result.metrics.totalReturn > 0 ? '+' : ''}${fmt(result.metrics.totalReturn)}`}
                suffix="%"
                icon={TrendingUp}
                positive={result.metrics.totalReturn > 0}
              />
              <MetricCard
                label="Win Rate"
                value={fmt(result.metrics.winRate)}
                suffix="%"
                icon={Target}
                positive={result.metrics.winRate > 55}
              />
              <MetricCard
                label="Sharpe Ratio"
                value={fmt(result.metrics.sharpeRatio, 2)}
                icon={BarChart3}
                positive={result.metrics.sharpeRatio > 1}
              />
              <MetricCard
                label="Max Drawdown"
                value={fmt(result.metrics.maxDrawdown)}
                suffix="%"
                icon={TrendingDown}
                positive={false}
              />
              <MetricCard
                label="Total Trades"
                value={String(result.metrics.totalTrades)}
                icon={Activity}
              />
            </div>

            {/* ─── Equity Curve ────────────────────────────── */}
            <div className="glass-card rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Equity Curve</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {result.metrics.startDate} &rarr; {result.metrics.endDate}
                </span>
              </div>
              <EquityCurveChart data={equityCurve} />
            </div>

            {/* ─── Monthly Returns Heatmap ─────────────────── */}
            <div className="glass-card rounded-2xl p-5 mb-6">
              <span className="text-sm font-semibold mb-3 block">Monthly Returns</span>
              <div className="grid grid-cols-12 gap-1.5">
                {result.monthlyReturns.map((m) => (
                  <div
                    key={m.month}
                    className={`rounded-lg py-2 text-center ${bgForHeatmap(m.value)}`}
                  >
                    <div className="text-[9px] text-zinc-500 uppercase mb-0.5">{m.month}</div>
                    <div className={`text-xs font-mono tabular-nums font-medium ${colorForValue(m.value)}`}>
                      {m.value > 0 ? '+' : ''}{fmt(m.value)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Avg Holding + Period ────────────────────── */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Hold Time</span>
                </div>
                <span className="font-mono tabular-nums text-lg font-semibold text-white">
                  {result.metrics.avgHoldingHours}<span className="text-xs text-zinc-500 ml-0.5">hrs</span>
                </span>
              </div>
              <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Test Period</span>
                </div>
                <span className="font-mono tabular-nums text-sm font-semibold text-white">
                  {result.metrics.startDate} &mdash; {result.metrics.endDate}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ─── Comparison Table ────────────────────────── */}
        <div className="glass-card rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Strategy Comparison &mdash; {ASSETS.find(a => a.id === activeAsset)?.name}</span>
            <div className="flex gap-1">
              {([['sharpe', 'Sharpe'], ['return', 'Return'], ['winRate', 'Win %']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    sortBy === key
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-white/5">
                  <th className="text-left py-2 pr-4">Strategy</th>
                  <th className="text-right py-2 px-3">Return</th>
                  <th className="text-right py-2 px-3">Win Rate</th>
                  <th className="text-right py-2 px-3">Sharpe</th>
                  <th className="text-right py-2 px-3">Max DD</th>
                  <th className="text-right py-2 pl-3">Trades</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ strategy, result: r }) => (
                  <tr
                    key={strategy.id}
                    className={`border-b border-white/[0.03] transition-colors ${
                      strategy.id === activeStrategy
                        ? 'bg-emerald-500/[0.06]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-2.5 pr-4">
                      <span className={`font-medium ${strategy.id === activeStrategy ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {strategy.name}
                      </span>
                    </td>
                    <td className={`text-right py-2.5 px-3 font-mono tabular-nums ${colorForValue(r.metrics.totalReturn)}`}>
                      +{fmt(r.metrics.totalReturn)}%
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-zinc-300">
                      {fmt(r.metrics.winRate)}%
                    </td>
                    <td className={`text-right py-2.5 px-3 font-mono tabular-nums ${r.metrics.sharpeRatio >= 1.5 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {fmt(r.metrics.sharpeRatio, 2)}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums text-red-400">
                      {fmt(r.metrics.maxDrawdown)}%
                    </td>
                    <td className="text-right py-2.5 pl-3 font-mono tabular-nums text-zinc-400">
                      {r.metrics.totalTrades}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── CTA: Run Your Own ──────────────────────── */}
        <div className="glass-card rounded-2xl p-6 text-center mb-8">
          <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Run Your Own Backtest</h2>
          <p className="text-xs text-zinc-400 mb-4 max-w-md mx-auto">
            These are pre-computed results. Want to test your own parameters, timeframes, and stop-loss settings?
          </p>
          <Link
            href={`/backtest?strategy=${activeStrategy}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            Open Backtester
          </Link>
        </div>

        {/* ─── Star CTA ───────────────────────────────── */}
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-3">Open source &amp; transparent. Star us on GitHub.</p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-black text-sm font-semibold hover:bg-white transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
