'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, TrendingUp, TrendingDown, Minus, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type RegimeName = 'crash' | 'bear' | 'neutral' | 'bull' | 'euphoria';

interface RegimeEntry {
  symbol: string;
  regime: string;
  confidence: number;
  detectedAt: string;
}

interface AllocationRule {
  regime: RegimeName;
  maxExposure: string;
  leverage: string;
  directions: string;
  maxPosition: string;
  tightenStops: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const REGIME_COLORS: Record<RegimeName, { color: string; bg: string; border: string }> = {
  crash:    { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)' },
  bear:     { color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)' },
  neutral:  { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', border: 'rgba(107, 114, 128, 0.3)' },
  bull:     { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  euphoria: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)' },
};

const ALLOCATION_RULES: AllocationRule[] = [
  { regime: 'crash',    maxExposure: '0%',   leverage: '1x', directions: 'None',       maxPosition: '0%',  tightenStops: true },
  { regime: 'bear',     maxExposure: '25%',  leverage: '1x', directions: 'SELL only',  maxPosition: '5%',  tightenStops: true },
  { regime: 'neutral',  maxExposure: '50%',  leverage: '2x', directions: 'BUY & SELL', maxPosition: '10%', tightenStops: false },
  { regime: 'bull',     maxExposure: '80%',  leverage: '3x', directions: 'BUY & SELL', maxPosition: '15%', tightenStops: false },
  { regime: 'euphoria', maxExposure: '60%',  leverage: '2x', directions: 'BUY only',   maxPosition: '10%', tightenStops: true },
];

const REGIME_ORDER: RegimeName[] = ['crash', 'bear', 'neutral', 'bull', 'euphoria'];

// ─── Helpers ─────────────────────────────────────────────────

function normalizeRegime(raw: string): RegimeName {
  const lower = raw.toLowerCase();
  if (REGIME_ORDER.includes(lower as RegimeName)) return lower as RegimeName;
  return 'neutral';
}

function getRegimeIcon(regime: RegimeName) {
  switch (regime) {
    case 'crash': return <AlertTriangle className="w-4 h-4" />;
    case 'bear': return <TrendingDown className="w-4 h-4" />;
    case 'neutral': return <Minus className="w-4 h-4" />;
    case 'bull': return <TrendingUp className="w-4 h-4" />;
    case 'euphoria': return <Zap className="w-4 h-4" />;
  }
}

// ─── Main Component ──────────────────────────────────────────

export function AllocationClient() {
  const [regimeData, setRegimeData] = useState<RegimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/regime');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setRegimeData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Determine dominant regime from API data
  const regimeCounts: Record<RegimeName, number> = { crash: 0, bear: 0, neutral: 0, bull: 0, euphoria: 0 };
  for (const e of regimeData) {
    regimeCounts[normalizeRegime(e.regime)]++;
  }
  const dominant = REGIME_ORDER.reduce((a, b) => (regimeCounts[a] >= regimeCounts[b] ? a : b), 'neutral' as RegimeName);
  const activeRule = ALLOCATION_RULES.find((r) => r.regime === dominant);

  // Calculate current allocation summary
  const maxExposureNum = activeRule ? parseInt(activeRule.maxExposure) : 50;
  // TODO: replace with real portfolio allocation from API
  const currentExposure = maxExposureNum > 0 ? Math.round(maxExposureNum * 0.6) : 0;
  const headroom = maxExposureNum - currentExposure;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Allocation <span className="text-cyan-400">Strategy</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Regime-based exposure limits and position sizing rules
              </p>
            </div>
          </div>
        </div>

        {/* Current allocation summary */}
        {!loading && regimeData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: REGIME_COLORS[dominant].border, backgroundColor: REGIME_COLORS[dominant].bg }}
            >
              <div className="flex items-center gap-2 mb-2">
                {getRegimeIcon(dominant)}
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Active Regime</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: REGIME_COLORS[dominant].color }}>
                {dominant.charAt(0).toUpperCase() + dominant.slice(1)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Current Exposure</span>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{currentExposure}%</p>
              <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${maxExposureNum > 0 ? (currentExposure / maxExposureNum) * 100 : 0}%`,
                    backgroundColor: REGIME_COLORS[dominant].color,
                  }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                of {maxExposureNum}% max
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Headroom</span>
              </div>
              <p className={`text-2xl font-bold ${headroom > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {headroom}%
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Available for new positions
              </p>
            </div>
          </div>
        )}

        {/* Allocation rules table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Allocation Rules by Regime</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Regime</th>
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Max Exposure</th>
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Leverage</th>
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Directions</th>
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Max Position</th>
                  <th className="text-left px-5 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Tighten Stops</th>
                </tr>
              </thead>
              <tbody>
                {ALLOCATION_RULES.map((rule) => {
                  const isActive = rule.regime === dominant && regimeData.length > 0;
                  const colors = REGIME_COLORS[rule.regime];
                  return (
                    <tr
                      key={rule.regime}
                      className={`border-b border-[var(--border)] last:border-b-0 transition-colors ${isActive ? '' : ''}`}
                      style={isActive ? { backgroundColor: colors.bg } : {}}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                            style={{ color: colors.color, backgroundColor: colors.bg, borderColor: colors.border }}
                          >
                            {getRegimeIcon(rule.regime)}
                            {rule.regime.charAt(0).toUpperCase() + rule.regime.slice(1)}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono font-medium text-[var(--foreground)]">{rule.maxExposure}</td>
                      <td className="px-5 py-3 font-mono font-medium text-[var(--foreground)]">{rule.leverage}</td>
                      <td className="px-5 py-3 text-[var(--foreground)]">{rule.directions}</td>
                      <td className="px-5 py-3 font-mono font-medium text-[var(--foreground)]">{rule.maxPosition}</td>
                      <td className="px-5 py-3">
                        {rule.tightenStops ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Yes</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-symbol allocation */}
        {!loading && regimeData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">Per-Symbol Regime Allocation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {regimeData.map((entry) => {
                const regime = normalizeRegime(entry.regime);
                const colors = REGIME_COLORS[regime];
                const rule = ALLOCATION_RULES.find((r) => r.regime === regime);
                return (
                  <div
                    key={entry.symbol}
                    className="rounded-lg border p-3"
                    style={{ borderColor: colors.border, backgroundColor: colors.bg }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[var(--foreground)]">{entry.symbol}</span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: colors.color }}>
                        {regime}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] space-y-0.5">
                      <p>Max pos: {rule?.maxPosition ?? 'N/A'}</p>
                      <p>Dir: {rule?.directions ?? 'N/A'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse h-24" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
