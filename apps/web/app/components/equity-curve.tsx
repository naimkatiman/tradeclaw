'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { InfoHint } from '@/components/InfoHint';
import type { CategoryFilter } from '@/app/lib/symbol-config';
import { useLocale } from './locale-provider';
import { formatMessage } from '@/lib/product-i18n/format';
import { getTrackRecordWidgetTranslations } from '@/lib/product-i18n/track-record-widgets';
import { getHtmlLanguage } from '@/lib/translations';

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
  netExpectancyR?: number | null;
  breakEvenWinRate: number | null;
  riskPerTradePct?: number;
  roundTripCostPct?: number;
  avgCostR?: number | null;
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

function formatDate(ts: number, language: string): string {
  return new Date(ts).toLocaleDateString(language, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(ts: number, language: string): string {
  return new Date(ts).toLocaleDateString(language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TemplateMessage({
  template,
  values,
  plainKeys = [],
}: {
  template: string;
  values: Record<string, string>;
  plainKeys?: string[];
}) {
  const plain = new Set(plainKeys);
  return (
    <>
      {template.split(/(\{[A-Za-z0-9_]+\})/g).map((part, index) => {
        const match = /^\{([A-Za-z0-9_]+)\}$/.exec(part);
        if (!match || !(match[1] in values)) return part;
        const key = match[1];
        return plain.has(key)
          ? <span key={`${key}-${index}`}>{values[key]}</span>
          : <bdi key={`${key}-${index}`} dir="ltr">{values[key]}</bdi>;
      })}
    </>
  );
}

function number(
  language: string,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(language, options).format(value);
}

function percent(
  language: string,
  value: number,
  maximumFractionDigits = 2,
  signDisplay: Intl.NumberFormatOptions['signDisplay'] = 'auto',
): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    maximumFractionDigits,
    signDisplay,
  }).format(value / 100);
}

function rMultiple(
  language: string,
  value: number,
  signDisplay: Intl.NumberFormatOptions['signDisplay'] = 'auto',
): string {
  return `${number(language, value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay,
  })}R`;
}

function rCap(language: string, value: number): string {
  return `±${number(language, value, { maximumFractionDigits: 2 })}R`;
}

function drawChart(
  canvas: HTMLCanvasElement,
  points: EquityPoint[],
  onHover: (data: TooltipData | null) => void,
  language: string,
  emptyState: string,
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
      emptyState,
      w / 2,
      midY + 24,
      Math.max(0, w - 32),
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
    ctx.fillText(percent(language, val, 1, 'always'), padLeft - 6, y + 3);
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
    const idx = labelCount === 1
      ? 0
      : Math.round((i / (labelCount - 1)) * (points.length - 1));
    const p = points[idx];
    const x = toX(p.timestamp);
    ctx.fillText(formatDate(p.timestamp, language), x, h - 6);
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
      date: formatDateTime(closest.timestamp, language),
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

type EquityScope = 'pro' | 'broadcast';
type EquityBand = 'all' | 'premium' | 'standard';

interface EquityCurveProps {
  period?: '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all';
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
  const { locale } = useLocale();
  const t = getTrackRecordWidgetTranslations(locale).equity;
  const language = getHtmlLanguage(locale);
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

    let cleanup = drawChart(canvas, points, handleHover, language, t.chartEmpty);

    const handleResize = () => {
      cleanup?.();
      cleanup = drawChart(canvas, points, handleHover, language, t.chartEmpty);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cleanup?.();
      window.removeEventListener('resize', handleResize);
    };
  }, [points, loading, handleHover, language, t.chartEmpty]);

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
    ? `${formatDate(points[0].timestamp, language)} – ${formatDate(points[points.length - 1].timestamp, language)}`
    : null;

  // Headline expectancy prefers NET (gross − modeled cost) so it agrees in sign with
  // the equity curve — a green +0.01R gross beside a -100% curve reads as broken.
  // Falls back to gross only when cost wasn't available.
  const expectancyShown = summary ? (summary.netExpectancyR ?? summary.expectancyR) : null;

  const isBroadcast = scope === 'broadcast';
  const sizedTradeCount = summary?.sizedTrades ?? points.length;
  const hasSizedEvidence = sizedTradeCount > 0;
  const broadcastSince = new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 5, 10)));
  const summaryTemplate = isBroadcast
    ? summary
      ? summary.hardRCap !== undefined
        ? t.broadcastWithCap
        : t.broadcastWithoutCap
      : t.broadcastNoSummary
    : summary
      ? summary.hardRCap !== undefined
        ? t.eligibleWithCap
        : t.eligibleWithoutCap
      : t.eligibleNoSummary;
  const summaryValues: Record<string, string> = summary
    ? {
        date: broadcastSince,
        risk: summary.riskPerTradePct === undefined
          ? '—'
          : percent(language, summary.riskPerTradePct),
        cap: summary.hardRCap === undefined
          ? '—'
          : `${number(language, summary.hardRCap, { maximumFractionDigits: 2 })}R`,
        cost: summary.roundTripCostPct === undefined
          ? '—'
          : percent(language, summary.roundTripCostPct),
        costR: summary.avgCostR == null ? '—' : rMultiple(language, summary.avgCostR),
      }
    : { date: broadcastSince, risk: '—', cap: '—', cost: '—', costR: '—' };
  const usd = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <section
      className={`glass-card rounded-2xl p-5 mb-6 border-s-2 ${
        isBroadcast ? 'border-cyan-500/50' : 'border-emerald-500/50'
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            {t.title}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                isBroadcast
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {isBroadcast ? t.broadcastSubset : t.eligibleStream}
            </span>
          </h2>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            <TemplateMessage
              template={summaryTemplate}
              values={summaryValues}
              plainKeys={['date']}
            />
          </p>
          {summary && summary.sizedTrades !== undefined && summary.sizedTrades > 0 && (
            <p className="text-[10px] text-zinc-600 mt-1">
              <TemplateMessage
                template={summary.sizedTrades === 1 ? t.sizedSignalsOne : t.sizedSignalsMany}
                values={{ count: number(language, summary.sizedTrades) }}
              />
            </p>
          )}
          {smooth && smoothMeta?.capR !== null && smoothMeta?.capR !== undefined && (
            <p className="text-[10px] text-amber-400/80 mt-1 font-mono">
              <TemplateMessage
                template={t.smoothedSummary}
                values={{ cap: rCap(language, smoothMeta.capR) }}
              />
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Band toggle — All vs Premium-only. Lets viewers see what the
              high-confidence filter (conf ≥ 85) looked like vs the eligible
              stream in the same window. Only shown when caller wired
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
                  title={value === 'premium' ? t.bandPremiumTitle : t.bandAllTitle}
                >
                  {value === 'all' ? t.bandAll : t.bandPremium}
                </button>
              ))}
            </div>
          )}
          {/* Smooth toggle — opt-in marketing view. Off by default so the
              headline numbers match the raw paper-trade outcome. */}
          {hasSizedEvidence && <button
            type="button"
            onClick={() => setSmooth(s => !s)}
            aria-pressed={smooth}
            className={`rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              smooth
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
            }`}
            title={t.smoothTitle}
          >
            {smooth ? t.smoothActive : t.smoothInactive}
          </button>}
        </div>
      </div>

      {/* Persistent smoothed-curve banner — when the P95 clip is ACTIVE the
         curve is NOT the raw paper-trade path. The tiny toggle label alone is
         easy to miss in a shared or embedded screenshot, so surface a visible
         amber banner whenever smooth mode is on, regardless of whether a cap
         was computed. */}
      {smooth && hasSizedEvidence && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <span aria-hidden="true" className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          <span>
            <TemplateMessage
              template={smoothMeta?.capR != null ? t.smoothBannerWithCap : t.smoothBannerWithoutCap}
              values={smoothMeta?.capR != null ? { cap: rCap(language, smoothMeta.capR) } : {}}
            />
          </span>
        </div>
      )}

      {/* Stats overlay — Total Return and Max Drawdown are presented as a
         barbell, equal weight. Win-rate-only or return-only framing hides
         the path. A +308% return with -67% drawdown is not a flat ride. */}
      {summary && !loading && !hasSizedEvidence && (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-5 text-center text-xs text-zinc-400">
          {t.noEvidence}
        </div>
      )}
      {summary && !loading && hasSizedEvidence && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/[0.04]">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                {t.sequentialResult}
                <InfoHint text={t.sequentialHint} label={t.sequentialHintLabel} />
              </div>
              <div className={`text-2xl font-mono font-bold tabular-nums ${
                summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                <bdi dir="ltr">{percent(language, summary.totalReturn, 2, 'always')}</bdi>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                <TemplateMessage
                  template={t.hypotheticalPath}
                  values={{ start: usd.format(HYPOTHETICAL_START), end: usd.format(currentValue) }}
                />
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-3 px-4 border border-white/[0.04]">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                {t.simulatedMaxDrawdown}
                <InfoHint text={t.maxDrawdownHint} label={t.maxDrawdownHintLabel} />
              </div>
              <div className="text-2xl font-mono font-bold text-red-400 tabular-nums">
                <bdi dir="ltr">{percent(language, -Math.abs(summary.maxDrawdown))}</bdi>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                {t.deepestDrop}
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
                {t.winRate}
                <InfoHint text={t.winRateHint} label={t.winRateHintLabel} />
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
                <bdi dir="ltr">{percent(language, summary.winRate)}</bdi>
              </div>
              {summary.breakEvenWinRate !== null && (
                <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                  <TemplateMessage
                    template={t.breakEven}
                    values={{ value: percent(language, summary.breakEvenWinRate) }}
                  />
                </div>
              )}
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                {t.resolvedSignals}
                <InfoHint text={t.resolvedHint} label={t.resolvedHintLabel} />
              </div>
              <div className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                <bdi dir="ltr">{number(language, summary.totalSignals)}</bdi>
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                {t.sharpeAnnualized}
                <InfoHint text={t.sharpeHint} label={t.sharpeHintLabel} />
              </div>
              <div className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                <bdi dir="ltr">
                  {summary.sharpeRatio !== null
                    ? number(language, summary.sharpeRatio, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '—'}
                </bdi>
              </div>
              <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                <TemplateMessage
                  template={summary.sharpeRatio !== null
                    ? sharpeDays === 1 ? t.sharpeDaysOne : t.sharpeDaysMany
                    : t.sharpeNeedsDays}
                  values={{ count: number(language, sharpeDays) }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                {t.avgRWin}
                <InfoHint text={t.avgRWinHint} label={t.avgRWinHintLabel} />
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                <bdi dir="ltr">
                  {summary.avgRWin !== null ? rMultiple(language, summary.avgRWin, 'always') : '—'}
                </bdi>
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                {t.avgRLoss}
                <InfoHint text={t.avgRLossHint} label={t.avgRLossHintLabel} />
              </div>
              <div className="text-xs font-mono font-semibold text-red-400 tabular-nums">
                <bdi dir="ltr">
                  {summary.avgRLoss !== null ? rMultiple(language, summary.avgRLoss) : '—'}
                </bdi>
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg py-2 px-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                {t.expectancyNet}
                <InfoHint text={t.expectancyHint} label={t.expectancyHintLabel} />
              </div>
              <div className={`text-xs font-mono font-semibold tabular-nums ${
                expectancyShown != null && expectancyShown > 0
                  ? 'text-emerald-400'
                  : expectancyShown != null && expectancyShown < 0
                    ? 'text-red-400'
                    : 'text-zinc-300'
              }`}>
                {expectancyShown != null
                  ? <bdi dir="ltr">{rMultiple(language, expectancyShown, 'always')}</bdi>
                  : '—'}
              </div>
              {summary.netExpectancyR != null && summary.expectancyR !== null && summary.avgCostR != null && (
                <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                  <TemplateMessage
                    template={t.grossMinusCost}
                    values={{
                      gross: rMultiple(language, summary.expectancyR, 'always'),
                      cost: rMultiple(language, summary.avgCostR),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* R-stat denominator note — avg R per win/loss, expectancy and the
             break-even win-rate come from the SIZED-TRADE subset (rows with an
             SL so R is defined), which can differ from resolved signals. Show
             that N so a thin R-stat isn't mistaken for a deep one. */}
          {summary.sizedTrades !== undefined && (
            <p className="text-[10px] text-zinc-600 -mt-2 mb-4 font-mono">
              <TemplateMessage
                template={summary.sizedTrades !== summary.totalSignals
                  ? summary.sizedTrades === 1 ? t.rStatsExcludedOne : t.rStatsExcludedMany
                  : summary.sizedTrades === 1 ? t.rStatsAllOne : t.rStatsAllMany}
                values={{
                  sized: number(language, summary.sizedTrades),
                  resolved: number(language, summary.totalSignals),
                }}
              />
              {rangeLabel && (
                <>
                  {' · '}
                  <bdi dir="ltr">{formatMessage(t.dateRange, { range: rangeLabel })}</bdi>
                </>
              )}
            </p>
          )}
        </>
      )}

      {/* Chart */}
      {(loading || hasSizedEvidence) && <div className="relative" style={{ height: 220 }}>
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-label={t.loading}
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin"
              aria-hidden="true"
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: loading ? 'none' : 'block' }}
          role="img"
          aria-label={t.chartLabel}
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
            <div className="text-zinc-400 mb-1"><bdi dir="ltr">{tooltip.date}</bdi></div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">
                <TemplateMessage
                  template={t.tooltipSignal}
                  values={{ count: number(language, tooltip.signalCount) }}
                />
              </span>
              <bdi dir="ltr" className="text-zinc-500">{tooltip.symbol}</bdi>
              <span className={tooltip.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
                <bdi dir="ltr">{tooltip.direction}</bdi>
              </span>
            </div>
            <div className={`font-semibold mt-0.5 ${tooltip.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TemplateMessage
                template={t.tooltipCumulative}
                values={{ value: percent(language, tooltip.cumulativePnl, 2, 'always') }}
              />
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
      </div>}

    </section>
  );
}
