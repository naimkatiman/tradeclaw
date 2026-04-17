'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CorrelationData {
  assets: string[];
  matrix: number[][];
  updatedAt: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  rowAsset: string;
  colAsset: string;
  value: number;
}

interface PairStat {
  pair: string;
  assetA: string;
  assetB: string;
  r: number;
  absR: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function corrColor(r: number): string {
  // -1 → rose, 0 → slate, +1 → emerald
  const rose = [244, 63, 94];
  const slate = [100, 116, 139];
  const emerald = [16, 185, 129];

  let from: number[], to: number[], t: number;
  if (r < 0) {
    from = slate;
    to = rose;
    t = -r;
  } else {
    from = slate;
    to = emerald;
    t = r;
  }

  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function corrBg(r: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'rgba(100,116,139,0.25)';
  if (r < 0) {
    const alpha = Math.min(0.8, -r * 0.85);
    return `rgba(244,63,94,${alpha})`;
  }
  const alpha = Math.min(0.8, r * 0.85);
  return `rgba(16,185,129,${alpha})`;
}

function fmtR(r: number): string {
  return r.toFixed(2);
}

function buildPairs(assets: string[], matrix: number[][]): PairStat[] {
  const pairs: PairStat[] = [];
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const r = matrix[i][j];
      pairs.push({
        pair: `${assets[i]} / ${assets[j]}`,
        assetA: assets[i],
        assetB: assets[j],
        r,
        absR: Math.abs(r),
      });
    }
  }
  return pairs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? '#f4f4f5' }}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1 truncate">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CorrelationClient() {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, rowAsset: '', colAsset: '', value: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/correlation');
      if (!res.ok) throw new Error('Failed to load correlation data');
      const json = await res.json() as CorrelationData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const pairs = data ? buildPairs(data.assets, data.matrix) : [];
  const sortedByAbs = [...pairs].sort((a, b) => b.absR - a.absR);
  const sortedByR = [...pairs].sort((a, b) => b.r - a.r);
  const mostCorrelated = sortedByR[0];
  const mostInverse = sortedByR[sortedByR.length - 1];
  const avgR = pairs.length > 0
    ? pairs.reduce((s, p) => s + p.r, 0) / pairs.length
    : 0;
  const strongCount = pairs.filter(p => p.absR > 0.7).length;

  // ── Render: loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Computing correlations…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="text-center">
          <p className="text-rose-400 mb-3">{error ?? 'No data'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { assets, matrix } = data;
  const n = assets.length;

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: '#050505', color: '#f4f4f5' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-white/5 backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, #050505 80%, transparent)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Correlation Heatmap</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pearson r — 100 hourly bars ·{' '}
              <span className="tabular-nums">
                {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Most Correlated"
            value={mostCorrelated ? fmtR(mostCorrelated.r) : '—'}
            sub={mostCorrelated?.pair}
            color="#10b981"
          />
          <StatCard
            label="Most Inverse"
            value={mostInverse ? fmtR(mostInverse.r) : '—'}
            sub={mostInverse?.pair}
            color="#f43f5e"
          />
          <StatCard
            label="Avg Correlation"
            value={fmtR(avgR)}
            color={avgR >= 0 ? '#10b981' : '#f43f5e'}
          />
          <StatCard
            label="Strong Pairs"
            value={`${strongCount}`}
            sub="|r| > 0.70"
            color="#a1a1aa"
          />
        </div>

        {/* ── Heatmap ── */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Correlation Matrix</h2>

            {/* Scrollable wrapper for mobile */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${n * 52 + 72}px` }}>

                {/* Column labels */}
                <div className="flex mb-1" style={{ paddingLeft: '72px' }}>
                  {assets.map(a => (
                    <div
                      key={a}
                      className="text-[9px] text-zinc-500 font-medium text-center"
                      style={{ width: '52px', flexShrink: 0 }}
                    >
                      {a.replace('USD', '')}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {assets.map((rowAsset, i) => (
                  <div key={rowAsset} className="flex items-center mb-0.5">
                    {/* Row label */}
                    <div
                      className="text-[9px] text-zinc-500 font-medium text-right pr-2 flex-shrink-0"
                      style={{ width: '72px' }}
                    >
                      {rowAsset.replace('USD', '')}
                    </div>

                    {/* Cells */}
                    {assets.map((colAsset, j) => {
                      const r = matrix[i][j];
                      const isDiagonal = i === j;
                      return (
                        <div
                          key={colAsset}
                          className="relative flex items-center justify-center rounded cursor-default transition-transform hover:scale-110 hover:z-10"
                          style={{
                            width: '48px',
                            height: '36px',
                            margin: '0 2px',
                            flexShrink: 0,
                            background: corrBg(r, isDiagonal),
                            border: isDiagonal ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              visible: true,
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                              rowAsset,
                              colAsset,
                              value: r,
                            });
                          }}
                          onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                        >
                          <span
                            className="text-[10px] font-semibold tabular-nums select-none"
                            style={{
                              color: isDiagonal ? 'rgba(255,255,255,0.4)' : corrColor(r),
                            }}
                          >
                            {fmtR(r)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 flex items-center gap-3">
              <span className="text-[10px] text-zinc-600">-1.0</span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(to right, rgb(244,63,94), rgb(100,116,139), rgb(16,185,129))',
                  maxWidth: '240px',
                }}
              />
              <span className="text-[10px] text-zinc-600">+1.0</span>
              <div className="flex items-center gap-3 ml-2">
                <span className="flex items-center gap-1 text-[10px] text-rose-400">
                  <span className="w-2 h-2 rounded-sm" style={{ background: 'rgb(244,63,94)' }} />
                  Inverse
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-2 h-2 rounded-sm" style={{ background: 'rgb(16,185,129)' }} />
                  Positive
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Correlations Table ── */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-zinc-300">Top Pair Correlations</h2>
            <p className="text-xs text-zinc-600 mt-0.5">All unique pairs, ranked by absolute correlation</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {sortedByAbs.map((p) => (
              <div key={p.pair} className="flex items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-300">{p.assetA}</span>
                  <span className="text-xs text-zinc-600 mx-1.5">/</span>
                  <span className="text-sm font-medium text-zinc-300">{p.assetB}</span>
                </div>
                {/* Direction indicator */}
                <div className="flex items-center gap-2 mr-4">
                  {p.r > 0 ? (
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      positive
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      inverse
                    </span>
                  )}
                </div>
                {/* Bar */}
                <div className="w-20 h-1.5 rounded-full bg-white/5 mr-3 flex-shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.absR * 100}%`,
                      background: p.r >= 0 ? '#10b981' : '#f43f5e',
                    }}
                  />
                </div>
                {/* Value */}
                <span
                  className="text-sm font-bold tabular-nums w-12 text-right"
                  style={{ color: p.r >= 0 ? '#10b981' : '#f43f5e' }}
                >
                  {fmtR(p.r)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Floating Tooltip ── */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="rounded-lg border border-white/10 bg-zinc-900 shadow-xl px-3 py-2 text-xs">
            <p className="text-zinc-400">
              {tooltip.rowAsset} <span className="text-zinc-600">vs</span> {tooltip.colAsset}
            </p>
            <p
              className="text-lg font-bold tabular-nums mt-0.5"
              style={{ color: corrColor(tooltip.value) }}
            >
              {fmtR(tooltip.value)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
