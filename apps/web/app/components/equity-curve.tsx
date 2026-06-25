'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { InfoHint } from '@/components/InfoHint';
import { STAT_HINTS } from '@/lib/stat-hints';
import { FREE_HISTORY_DAYS } from '@/lib/tier-client';
import type { CategoryFilter } from '@/app/lib/symbol-config';

interface EquityPoint {
  timestamp: number;
  pnlPct: number;
  cumulativePnl: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
}

interface EquitySummary {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalSignals: number;
  sizedTrades?: number;
  sharpeRatio: number | null;
  avgRWin: number | null;
  avgRLoss: number | null;
  expectancyR: number | null;
  breakEvenWinRate: number | null;
  riskPerTradePct?: number;
  roundTripCostPct?: number;
  hardRCap?: number;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  signalCount: number;
  cumulativePnl: number;
  symbol: string;
  direction: string;
}

const HYPOTHETICAL_START = 10_000;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function drawChart(
  canvas: HTMLCanvasElement,
  points: EquityPoint[],
  onHover: (data: TooltipData | null) => void,
): (() => void) | undefined {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const padLeft = 60;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  if (points.length === 0) {
    // Empty state: dashed line at 0%
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    const midY = padTop + chartH / 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, midY);
    ctx.lineTo(padLeft + chartW, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Performance tracking will begin once signals are recorded and resolved',
      w / 2,
      midY + 24,
    );
    return;
  }

  // Compute ranges
  const values = points.map(p => p.cumulativePnl);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  const tMin = points[0].timestamp;
  const tMax = points[points.length - 1].timestamp;
  const tRange = tMax - tMin || 1;

  function toX(ts: number): number {
    return padLeft + ((ts - tMin) / tRange) * chartW;
  }

  function toY(val: number): number {
    return padTop + (1 - (val - yMin) / yRange) * chartH;
  }

  // Grid lines and labels
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';

  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = yMin + (yRange / ySteps) * i;
    const y = toY(val);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();
    ctx.fillText(`${val >= 0 ? '+' : ''}${val.toFixed(1)}%`, padLeft - 6, y + 3);
  }

  // Zero line
  const zeroY = toY(0);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padLeft, zeroY);
  ctx.lineTo(padLeft + chartW, zeroY);
  ctx.stroke();

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  const labelCount = Math.min(6, points.length);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (points.length - 1));
    const p = points[idx];
    const x = toX(p.timestamp);
    ctx.fillText(formatDate(p.timestamp), x, h - 6);
  }

  // Build path segments — split into positive and negative for coloring
  // Draw area fills first, then line on top

  // Positive area fill (above zero line)
  const greenGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
  greenGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  greenGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  const redGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
  redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
  redGrad.addColorStop(1, 'rgba(239, 68, 68, 0.20)');

  // Draw filled area from line to zero line
  ctx.beginPath();
  ctx.moveTo(toX(points[0].timestamp), zeroY);
  for (const p of points) {
    ctx.lineTo(toX(p.timestamp), toY(p.cumulativePnl));
  }
  ctx.lineTo(toX(points[points.length - 1].timestamp), zeroY);
  ctx.closePath();

  // Use green if overall positive, red if negative, split fill
  // Simple approach: clip above/below zero and fill separately
  ctx.save();
  ctx.clip();
  // Green fill above zero
  ctx.fillStyle = greenGrad;
  ctx.fillRect(padLeft, padTop, chartW, zeroY - padTop);
  // Red fill below zero
  ctx.fillStyle = redGrad;
  ctx.fillRect(padLeft, zeroY, chartW, padTop + chartH - zeroY);
  ctx.restore();

  // Draw the line in two batched passes (green for segments above zero,
  // red for below). 2500+ individual stroke calls drop to 2 — same visual,
  // far less canvas overhead.
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const greenPath = new Path2D();
  const redPath = new Path2D();

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const x1 = toX(prev.timestamp);
    const y1 = toY(prev.cumulativePnl);
    const x2 = toX(curr.timestamp);
    const y2 = toY(curr.cumulativePnl);

    const midVal = (prev.cumulativePnl + curr.cumulativePnl) / 2;
    const target = midVal >= 0 ? greenPath : redPath;
    target.moveTo(x1, y1);
    target.lineTo(x2, y2);
  }

  ctx.strokeStyle = '#10B981';
  ctx.stroke(greenPath);
  ctx.strokeStyle = '#EF4444';
  ctx.stroke(redPath);

  // Per-point dots only at low density. Above ~500 points they visually
  // merge into the line anyway and each arc is an expensive path op.
  if (points.length <= 500) {
    for (const p of points) {
      const x = toX(p.timestamp);
      const y = toY(p.cumulativePnl);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.cumulativePnl >= 0 ? '#10B981' : '#EF4444';
      ctx.fill();
    }
  }

  // Hover handler
  const handleMouseMove = (e: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    const mx = e.clientX - bounds.left;

    if (mx < padLeft || mx > padLeft + chartW) {
      onHover(null);
      return;
    }

    // Find closest point
    let closest = points[0];
    let closestDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < points.length; i++) {
      const px = toX(points[i].timestamp);
      const dist = Math.abs(px - mx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = points[i];
        closestIdx = i;
      }
    }

    onHover({
      x: toX(closest.timestamp),
      y: toY(closest.cumulativePnl),
      date: formatDateTime(closest.timestamp),
      signalCount: closestIdx + 1,
      cumulativePnl: closest.cumulativePnl,
      symbol: closest.symbol,
      direction: closest.direction,
    });
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
  };
}

type EquityScope = 'pro' | 'free' | 'broadcast';
type EquityBand = 'all' | 'premium' | 'standard';

interface EquityCurveProps {
  period?: '7d' | '30d' | 'all';
  scope?: EquityScope;
  category?: CategoryFilter;
  band?: EquityBand;
  onBandChange?: (band: EquityBand) => void;
}

interface SmoothMeta {
  mode: string;
  capR: number | null;
}

export function EquityCurve({ period = 'all', scope = 'pro', category = 'all', band = 'all', onBandChange }: EquityCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<EquityPoint[]>([]);
  const [summary, setSummary] = useState<EquitySummary | null>(null);
  const [smoothMeta, setSmoothMeta] = useState<SmoothMeta | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [loading, setLoading] = useState(true);
  // Smooth mode is off by default — the raw curve is the truth. Toggle is
  // a marketing affordance: shows what the path looks like with outliers
  // (in both directions) clipped at 2× median trade size.
  const [smooth, setSmooth] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, scope });
        if (category !== 'all') params.set('category', category);
        if (band !== 'all') params.set('band', band);
        if (smooth) params.set('smooth', 'median2x');
        const res = await fetch(`/api/signals/equity?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setPoints(data.points ?? []);
        setSummary(data.summary ?? null);
        setSmoothMeta(data.smooth ?? null);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, scope, category, band, smooth]);

  const handleHover = useCallback((data: TooltipData | null) => {
    setTooltip(data);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;

    const cleanup = drawChart(canvas, points, handleHover);

    const handleResize = () => {
      drawChart(canvas, points, handleHover);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cleanup?.();
      window.removeEventListener('resize', handleResize);
    };
  }, [points, loading, handleHover]);

  const currentValue = summary
    ? +(HYPOTHETICAL_START * (1 + summary.totalReturn / 100)).toFixed(0)
    : HYPOTHETICAL_START;

  // Distinct UTC calendar days the Sharpe is computed over. Each point is one
  // sized trade; Sharpe buckets these by day, so the honest N for a daily-
  // bucketed annualized Sharpe is the day count, not the trade count. A 5-day
  // Sharpe must not read like a 500-day one.
  const sharpeDays = points.length
    ? new Set(points.map(p => new Date(p.timestamp).toISOString().slice(0, 10))).size
    : 0;

  // Date range the window actually covers — first→last sized trade.
  const rangeLabel = points.length
    ? `${formatDate(points[0].timestamp)} – ${formatDate(points[points.length - 1].timestamp)}`
    : null;

  const isPro = scope === 'pro';
  const isBroadcast = scope === 'broadcast';

  return (
    <section
      className={`glass-card rounded-2xl p-5 mb-6 border-l-2 ${
        isPro ? 'border-emerald-500/50' : isBroadcast ? 'border-cyan-500/50' : 'border-white/10'
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            Signal Performance — Auto Paper-Traded
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                isPro
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : isBroadcast
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'bg-white/[0.06] text-zinc-400'
              }`}
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              {isPro ? 'Pro' : isBroadcast ? 'Broadcast' : 'Free'} view
            </span>
          </h2>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {isPro
              ? summary
                ? `Full Pro track record. ${summary.riskPerTradePct}% risk per trade, fixed-fractional${summary.hardRCap !== undefined ? `, capped at ${summary.hardRCap}R per trade` : ''}, after ${summary.roundTripCostPct}% round-trip costs. Resolved against Binance/Yahoo OHLCV.`
                : 'Full Pro track record. Resolved against Binance/Yahoo OHLCV.'
              : isBroadcast
                ? summary
                  ? `Gate-approved broadcast subset — decisions recorded since 2026-06-10. ${summary.riskPerTradePct}% risk per trade${summary.hardRCap !== undefined ? `, capped at ${summary.hardRCap}R` : ''} after ${summary.roundTripCostPct}% round-trip costs.`
                  : 'Gate-approved broadcast subset — decisions recorded since 2026-06-10.'
                : summary
                  ? `Free-tier slice — last ${FREE_HISTORY_DAYS} days on free symbols only. Subset of what Pro subscribers see. ${summary.riskPerTradePct}% risk per trade${summary.hardRCap !== undefined ? `, capped at ${summary.hardRCap}R` : ''} after costs.`
                  : `Free-tier slice — last ${FREE_HISTORY_DAYS} days on free symbols only. Subset of what Pro subscribers see.`}
          </p>
          {summary && summary.sizedTrades !== undefined && summary.sizedTrades > 0 && (
            <p className="text-[10px] text-zinc-600 mt-1">
              Engine fires across the full multi-symbol multi-timeframe stream — {summary.sizedTrades.toLocaleString()} sized trade{summary.sizedTrades === 1 ? '' : 's'} in this window. A subscriber filtering for high-confidence setups would execute a fraction of these; the equity path assumes 1% risk on every signal.
            </p>
          )}
          {smooth && smoothMeta?.capR !== null && smoothMeta?.capR !== undefined && (
            <p className="text-[10px] text-amber-400/80 mt-1 font-mono">
              Outlier-smoothed: each trade&apos;s R-multiple clamped to ±{smoothMeta.capR}R (top/bottom 5% clipped). Raw drawdown is larger.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Band toggle — All vs Premium-only. Lets viewers see what the
              high-confidence filter (conf ≥ 85) actually looked like vs the
              full firehose in the same window. Only shown when caller wired
              an onBandChange so the parent decides whether the toggle is
              meaningful for its scope. */}
          {onBandChange && (
            <div className="inline-flex overflow-hidden rounded-md border border-white/10">
              {(['all', 'premium'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onBandChange(value)}
                  aria-pressed={band === value}
                  className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    band === value
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={value === 'premium' ? 'Premium-only: confidence ≥ 85. The high-conviction subset of signals.' : 'All signals (full firehose).'}
                >
                  {value === 'all' ? 'All' : 'Premium'}
                </button>
              ))}
            </div>
          )}
          {/* Smooth toggle — opt-in marketing view. Off by default so the
              headline numbers match the raw paper-trade outcome. */}
          <button
            type="button"
            onClick={() => setSmooth(s => !s)}
            aria-pressed={smooth}
            className={`rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              smooth
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
            }`}
            title="Clip the top and bottom 5% of trade outcomes (P95 cap). Reveals the path without single-trade outliers in either direction."
          >
            {smooth ? 'Smoothed (P95)' : 'Smooth outliers'}
          </button>
        </div>
      </div>

      {/* Persistent smoothed-curve banner — when the P95 clip is ACTIVE the
         curve is NOT the raw paper-trade path. The tiny toggle label alone is
         easy to miss in a shared or embedded screenshot, so surface a visible
         amber banner whenever smooth mode is on, regardless of whether a cap
         was computed. */}
      {smooth && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <span aria-hidden="true" className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          <span>
            Outlier-smoothed view (P95-clipped) — this is <strong>not</strong> the raw equity path.
            The top and bottom 5% of trade outcomes are clamped
            {smoothMeta?.capR != null ? ` to ±${smoothMeta.capR}R` : ''}; raw drawdown is larger.
            Turn off &ldquo;Smoothed&rdquo; for the unmodified curve.
          </span>
        </div>
      )}

      {/* Stats overlay — Total Return and Max Drawdown are presented as a
         barbell, equal weight. Win-rate-only or return-only framing hides
         the path. A +308% return with -67% drawdown is not a flat ride. */}
      {summary && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/[0.04]">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                Total Return (compounded)
                <InfoHint text={STAT_HINTS.totalReturnCompounded} label="What compounded total return means" />
              </div>
              <div className={`text-2xl font-mono font-bold tabular-nums ${
                summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {summary.totalReturn >= 0 ? '+' : ''}{summary.totalReturn}%
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                ${HYPOTHETICAL_START.toLocaleString()} → ${currentValue.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/[0.04]">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                Max Drawdown
                <InfoHint text={STAT_HINTS.maxDrawdown} label="What max drawdown means" />
              </div>
              <div className="text-2xl font-mono font-bold text-red-400 tabular-nums">
                -{summary.maxDrawdown}%
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                Deepest peak-to-trough drop
              </div>
            </div>
          </div>
          {/* Win-rate sits next to its break-even line so a sub-50% number
              reads as "above/below the bar this system needs," not as a
              standalone failure. The 50% threshold is meaningless for any
              system with asymmetric R:R. */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Win Rate
                <InfoHint text={STAT_HINTS.winRate24h} label="What win rate means" />
              </div>
              <div className={`text-xs font-mono font-semibold tabular-nums ${
                summary.breakEvenWinRate !== null
                  ? summary.winRate >= summary.breakEvenWinRate
                    ? 'text-emerald-400'
                    : 'text-red-400'
                  : summary.winRate >= 50
                    ? 'text-emerald-400'
                    : 'text-red-400'
              }`}>
                {summary.winRate}%
              </div>
              {summary.breakEvenWinRate !== null && (
                <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                  break-even {summary.breakEvenWinRate}%
                </div>
              )}
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Resolved Signals
                <InfoHint text={STAT_HINTS.resolved} label="What resolved signals means" />
              </div>
              <div className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                {summary.totalSignals.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Sharpe (annualized)
                <InfoHint text={STAT_HINTS.sharpe} label="What Sharpe ratio means" />
              </div>
              <div className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                {summary.sharpeRatio !== null ? summary.sharpeRatio.toFixed(2) : '—'}
              </div>
              <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                {summary.sharpeRatio !== null
                  ? `over ${sharpeDays} trading day${sharpeDays === 1 ? '' : 's'}`
                  : `needs ≥5 days (have ${sharpeDays})`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Avg R per Win
                <InfoHint text={STAT_HINTS.avgRWin} label="What avg R per win means" />
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                {summary.avgRWin !== null ? `+${summary.avgRWin.toFixed(2)}R` : '—'}
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Avg R per Loss
                <InfoHint text={STAT_HINTS.avgRLoss} label="What avg R per loss means" />
              </div>
              <div className="text-xs font-mono font-semibold text-red-400 tabular-nums">
                {summary.avgRLoss !== null ? `${summary.avgRLoss.toFixed(2)}R` : '—'}
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                Expectancy
                <InfoHint text={STAT_HINTS.expectancyR} label="What expectancy means" />
              </div>
              <div className={`text-xs font-mono font-semibold tabular-nums ${
                summary.expectancyR !== null && summary.expectancyR > 0
                  ? 'text-emerald-400'
                  : summary.expectancyR !== null && summary.expectancyR < 0
                    ? 'text-red-400'
                    : 'text-zinc-300'
              }`}>
                {summary.expectancyR !== null
                  ? `${summary.expectancyR >= 0 ? '+' : ''}${summary.expectancyR.toFixed(2)}R`
                  : '—'}
              </div>
            </div>
          </div>
          {/* R-stat denominator note — avg R per win/loss, expectancy and the
             break-even win-rate come from the SIZED-TRADE subset (rows with an
             SL so R is defined), which can differ from resolved signals. Show
             that N so a thin R-stat isn't mistaken for a deep one. */}
          {summary.sizedTrades !== undefined && (
            <p className="text-[10px] text-zinc-600 -mt-2 mb-4 font-mono">
              R-stats over {summary.sizedTrades.toLocaleString()} sized trade{summary.sizedTrades === 1 ? '' : 's'}
              {summary.sizedTrades !== summary.totalSignals
                ? ` (of ${summary.totalSignals.toLocaleString()} resolved — legacy rows without a stop are excluded)`
                : ''}
              {rangeLabel ? ` · ${rangeLabel}` : ''}
            </p>
          )}
        </>
      )}

      {/* Chart */}
      <div className="relative" style={{ height: 220 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: loading ? 'none' : 'block' }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-zinc-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-lg"
            style={{
              left: Math.min(tooltip.x + 12, (canvasRef.current?.getBoundingClientRect().width ?? 300) - 180),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <div className="text-zinc-400 mb-1">{tooltip.date}</div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">Signal #{tooltip.signalCount}</span>
              <span className="text-zinc-500">{tooltip.symbol}</span>
              <span className={tooltip.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
                {tooltip.direction}
              </span>
            </div>
            <div className={`font-semibold mt-0.5 ${tooltip.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {tooltip.cumulativePnl >= 0 ? '+' : ''}{tooltip.cumulativePnl}% cumulative
            </div>
          </div>
        )}

        {/* Crosshair line */}
        {tooltip && canvasRef.current && (
          <div
            className="absolute top-0 bottom-8 w-px bg-white/10 pointer-events-none"
            style={{ left: tooltip.x }}
          />
        )}
      </div>

    </section>
  );
}
