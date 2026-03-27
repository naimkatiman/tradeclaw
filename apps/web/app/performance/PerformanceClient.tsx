'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatencyPoint {
  timestamp: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

interface ThroughputPoint {
  timestamp: number;
  perMinute: number;
  perHour: number;
}

interface MemoryPoint {
  timestamp: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
}

interface ApiRouteStats {
  route: string;
  avg: number;
  p95: number;
  max: number;
  count: number;
  lastSeen: number;
}

interface SignalStats {
  byPair: Record<string, number>;
  byTimeframe: Record<string, number>;
  buy: number;
  sell: number;
  total: number;
}

interface MetricsData {
  latency: { avg: number; p50: number; p95: number; p99: number };
  apiRoutes: ApiRouteStats[];
  throughput: { perMinute: number; perHour: number };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapPct: number;
  };
  cache: { hits: number; misses: number; hitRate: number };
  signals: SignalStats;
  uptime: {
    startedAt: number;
    lastRestartAt: number;
    uptimeMs: number;
    uptimeFormatted: string;
  };
  sseConnections: number;
  lastUpdated: number;
}

interface HistoryData {
  latency: LatencyPoint[];
  throughput: ThroughputPoint[];
  memory: MemoryPoint[];
  period: string;
  count: number;
}

type Period = '1h' | '6h' | '24h';

// ─── Canvas Chart ─────────────────────────────────────────────────────────────

function drawLatencyChart(canvas: HTMLCanvasElement, points: LatencyPoint[]): void {
  if (points.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (w === 0 || h === 0) return;

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 32, left: 52 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  // Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  // Y range
  const maxVal = Math.max(...points.map(p => p.p99)) * 1.08;
  const minVal = 0;

  const toX = (i: number) => pad.left + (i / (points.length - 1)) * cw;
  const toY = (v: number) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch;

  // Grid lines
  const gridLines = 4;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (ch * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();

    const val = maxVal - ((maxVal - minVal) * i) / gridLines;
    ctx.fillStyle = '#404040';
    ctx.font = `${10 * Math.min(1, w / 400)}px ui-monospace, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${val.toFixed(0)}ms`, pad.left - 6, y + 3);
  }

  // Draw line helper
  const drawLine = (values: number[], color: string, width = 1.5) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    values.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(v));
      else ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();
  };

  drawLine(points.map(p => p.p99), '#f43f5e');   // rose
  drawLine(points.map(p => p.p95), '#f59e0b');   // amber
  drawLine(points.map(p => p.p50), '#10b981', 2); // emerald (thicker)

  // X-axis labels
  ctx.fillStyle = '#404040';
  ctx.font = `${10 * Math.min(1, w / 400)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(points.length / 6));
  for (let i = 0; i < points.length; i += step) {
    const x = toX(i);
    const t = new Date(points[i].timestamp);
    const label = t.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    ctx.fillText(label, x, pad.top + ch + 20);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = 'text-white',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-600 font-mono">{sub}</span>}
    </div>
  );
}

function LatencyBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <span className="text-lg font-bold font-mono tabular-nums text-white">{value.toFixed(0)}ms</span>
    </div>
  );
}

function HBar({
  label,
  value,
  max,
  color = 'bg-emerald-500',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-mono text-zinc-400 w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-[6px] bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-zinc-400 w-10 text-right shrink-0">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function RouteColor(avg: number): string {
  if (avg < 100) return 'text-emerald-400';
  if (avg < 500) return 'text-amber-400';
  return 'text-rose-400';
}

function RouteDot(avg: number): string {
  if (avg < 100) return 'bg-emerald-500';
  if (avg < 500) return 'bg-amber-500';
  return 'bg-rose-500';
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PerformanceClient() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('6h');
  const fetchRef = useRef(0);
  const latencyCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    try {
      const [mRes, hRes] = await Promise.all([
        fetch('/api/performance'),
        fetch(`/api/performance/history?period=${period}`),
      ]);
      if (!mRes.ok || !hRes.ok) return;
      const [mData, hData] = await Promise.all([
        mRes.json() as Promise<MetricsData>,
        hRes.json() as Promise<HistoryData>,
      ]);
      if (id !== fetchRef.current) return;
      setMetrics(mData);
      setHistory(hData);
    } catch {
      // silent
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Draw latency chart when history changes
  useEffect(() => {
    const canvas = latencyCanvasRef.current;
    if (!canvas || !history?.latency?.length) return;
    drawLatencyChart(canvas, history.latency);
  }, [history]);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-4 h-4 border border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading metrics…</span>
        </div>
      </div>
    );
  }

  const m = metrics;
  const signalPairs = m
    ? Object.entries(m.signals.byPair).sort((a, b) => b[1] - a[1])
    : [];
  const maxPairCount = signalPairs[0]?.[1] ?? 1;

  const signalTfs = m
    ? Object.entries(m.signals.byTimeframe).sort((a, b) => b[1] - a[1])
    : [];
  const maxTfCount = signalTfs[0]?.[1] ?? 1;

  const buyPct = m && m.signals.total > 0
    ? (m.signals.buy / m.signals.total) * 100
    : 50;
  const sellPct = 100 - buyPct;

  const cacheRadius = 15.9;
  const cacheCircumference = 2 * Math.PI * cacheRadius;
  const cacheDash = m ? (m.cache.hitRate / 100) * cacheCircumference : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-wide text-white">PERFORMANCE</h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono">LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(['1h', '6h', '24h'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  period === p
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">

        {/* System Health Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Uptime"
            value={m?.uptime.uptimeFormatted ?? '—'}
            sub={m ? `since ${new Date(m.uptime.startedAt).toLocaleDateString()}` : undefined}
            color="text-emerald-400"
          />
          <StatCard
            label="Heap Memory"
            value={m ? `${m.memory.heapUsedMb}MB` : '—'}
            sub={m ? `${m.memory.heapPct}% of ${m.memory.heapTotalMb}MB` : undefined}
            color={
              m && m.memory.heapPct > 80
                ? 'text-rose-400'
                : m && m.memory.heapPct > 60
                ? 'text-amber-400'
                : 'text-emerald-400'
            }
          />
          <StatCard
            label="SSE Connections"
            value={m ? String(m.sseConnections) : '—'}
            sub="active streams"
            color="text-sky-400"
          />
          <StatCard
            label="Signals / hr"
            value={m ? m.throughput.perHour.toLocaleString() : '—'}
            sub={m ? `${m.throughput.perMinute.toFixed(1)}/min` : undefined}
            color="text-violet-400"
          />
        </div>

        {/* Memory usage bar */}
        {m && (
          <div className="glass-card rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Memory Usage</span>
              <span className="text-xs font-mono text-zinc-400">
                RSS {m.memory.rssMb}MB · Heap {m.memory.heapUsedMb}/{m.memory.heapTotalMb}MB
              </span>
            </div>
            <div className="flex gap-1 h-2">
              <div
                className="h-full bg-violet-500/70 rounded-l-full"
                style={{ width: `${(m.memory.heapUsedMb / m.memory.rssMb) * 100}%` }}
                title="Heap used"
              />
              <div
                className="h-full bg-sky-500/30 rounded-r-full flex-1"
                title="Other RSS"
              />
            </div>
          </div>
        )}

        {/* Latency Chart */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Signal Generation Latency
            </span>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-emerald-400">─ p50</span>
              <span className="text-amber-400">─ p95</span>
              <span className="text-rose-400">─ p99</span>
            </div>
          </div>

          <div className="relative w-full" style={{ height: '180px' }}>
            <canvas
              ref={latencyCanvasRef}
              className="absolute inset-0 w-full h-full"
            />
            {(!history || history.latency.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-mono">
                No data
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <LatencyBox label="AVG" value={m?.latency.avg ?? 0} color="text-zinc-400" />
            <LatencyBox label="p50" value={m?.latency.p50 ?? 0} color="text-emerald-400" />
            <LatencyBox label="p95" value={m?.latency.p95 ?? 0} color="text-amber-400" />
            <LatencyBox label="p99" value={m?.latency.p99 ?? 0} color="text-rose-400" />
          </div>
        </div>

        {/* API Routes + Cache */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Response Times */}
          <div className="md:col-span-2 glass-card rounded-xl p-4 space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              API Response Times
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-zinc-600 border-b border-white/5">
                    <th className="text-left pb-2 font-normal">Route</th>
                    <th className="text-right pb-2 font-normal">avg</th>
                    <th className="text-right pb-2 font-normal">p95</th>
                    <th className="text-right pb-2 font-normal">max</th>
                    <th className="text-right pb-2 font-normal">reqs</th>
                    <th className="text-right pb-2 font-normal">last</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(m?.apiRoutes ?? []).map(route => (
                    <tr key={route.route} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${RouteDot(route.avg)}`} />
                          <span className="text-zinc-300 truncate max-w-[160px]">{route.route}</span>
                        </div>
                      </td>
                      <td className={`py-2 text-right tabular-nums ${RouteColor(route.avg)}`}>
                        {route.avg}ms
                      </td>
                      <td className={`py-2 text-right tabular-nums ${RouteColor(route.p95)}`}>
                        {route.p95}ms
                      </td>
                      <td className={`py-2 text-right tabular-nums ${RouteColor(route.max)}`}>
                        {route.max}ms
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-500">
                        {route.count.toLocaleString()}
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-600">
                        {timeAgo(route.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 pt-1 text-[10px] font-mono border-t border-white/5">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> &lt;100ms
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> &lt;500ms
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> &gt;500ms
              </span>
            </div>
          </div>

          {/* Cache Performance */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Cache Performance
            </span>

            <div className="flex items-center justify-center py-2">
              <div className="relative">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle
                    cx="18" cy="18" r={cacheRadius}
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18" cy="18" r={cacheRadius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${cacheDash.toFixed(2)} ${cacheCircumference.toFixed(2)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                    {m ? m.cache.hitRate.toFixed(1) : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500">hit rate</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Cache Hits</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {m ? m.cache.hits.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Cache Misses</span>
                <span className="font-mono tabular-nums text-rose-400">
                  {m ? m.cache.misses.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-zinc-500">Total Ops</span>
                <span className="font-mono tabular-nums text-zinc-300">
                  {m ? (m.cache.hits + m.cache.misses).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signal Generation Stats */}
        <div className="glass-card rounded-xl p-4 space-y-4">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
            Signal Generation Stats
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* By Pair */}
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">By Pair</p>
              {signalPairs.map(([pair, count]) => (
                <HBar
                  key={pair}
                  label={pair.replace('USD', '')}
                  value={count}
                  max={maxPairCount}
                  color="bg-emerald-500"
                />
              ))}
            </div>

            {/* BUY vs SELL + By Timeframe */}
            <div className="space-y-4">
              {/* Direction Split */}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Direction</p>
                <div className="flex h-5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${buyPct.toFixed(1)}%` }}
                  >
                    <span className="text-[10px] font-mono text-black font-bold">
                      {buyPct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="bg-rose-500 transition-all duration-500 flex items-center justify-start pl-2"
                    style={{ width: `${sellPct.toFixed(1)}%` }}
                  >
                    <span className="text-[10px] font-mono text-black font-bold">
                      {sellPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-mono">
                  <span className="text-emerald-400">BUY {m ? m.signals.buy.toLocaleString() : '—'}</span>
                  <span className="text-rose-400">SELL {m ? m.signals.sell.toLocaleString() : '—'}</span>
                </div>
              </div>

              {/* Total */}
              <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Signals</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                  {m ? m.signals.total.toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {/* By Timeframe */}
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">By Timeframe</p>
              {signalTfs.map(([tf, count]) => (
                <HBar
                  key={tf}
                  label={tf}
                  value={count}
                  max={maxTfCount}
                  color="bg-violet-500"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer: last updated + reset */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600 pt-1">
          <span>
            Last updated:{' '}
            {m ? new Date(m.lastUpdated).toLocaleTimeString('en-US', { hour12: false }) : '—'}
          </span>
          <button
            onClick={async () => {
              await fetch('/api/performance/reset', { method: 'POST' });
              fetchData();
            }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Reset metrics
          </button>
        </div>
      </div>
    </div>
  );
}
