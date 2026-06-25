'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, TrendingUp, MoveHorizontal, Zap, ShieldCheck } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type RegimeName = 'trend' | 'volatile' | 'range';

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

interface PortfolioSnapshot {
  grossExposurePct: number;
  netExposurePct: number;
  openPositions: number;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────

const REGIME_COLORS: Record<RegimeName, { color: string; bg: string; border: string }> = {
  trend:    { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  volatile: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)' },
  range:    { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', border: 'rgba(107, 114, 128, 0.3)' },
};

// Display mirror of REGIME_ALLOCATION_RULES in
// packages/signals/src/allocation/regime-rules.ts (plan D3) — the previous
// table showed values that never matched the engine. Keep in sync.
const ALLOCATION_RULES: AllocationRule[] = [
  { regime: 'trend',    maxExposure: '80%', leverage: '2x', directions: 'BUY & SELL', maxPosition: '15%', tightenStops: false },
  { regime: 'volatile', maxExposure: '40%', leverage: '1x', directions: 'BUY & SELL', maxPosition: '8%',  tightenStops: true },
  { regime: 'range',    maxExposure: '30%', leverage: '1x', directions: 'BUY & SELL', maxPosition: '6%',  tightenStops: false },
];

const REGIME_ORDER: RegimeName[] = ['trend', 'volatile', 'range'];

// ─── Helpers ─────────────────────────────────────────────────

function normalizeRegime(raw: string): RegimeName {
  const lower = raw.toLowerCase();
  if (REGIME_ORDER.includes(lower as RegimeName)) return lower as RegimeName;
  return 'range'; // unified unknown-label fallback (plan D1)
}

function getRegimeIcon(regime: RegimeName) {
  switch (regime) {
    case 'trend': return <TrendingUp className="w-4 h-4" />;
    case 'volatile': return <Zap className="w-4 h-4" />;
    case 'range': return <MoveHorizontal className="w-4 h-4" />;
  }
}

// ─── Main Component ──────────────────────────────────────────

export function AllocationClient() {
  const [regimeData, setRegimeData] = useState<RegimeEntry[]>([]);
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [regimeResult, portfolioResult] = await Promise.allSettled([
        fetch('/api/v1/regime'),
        fetch('/api/widget/portfolio'),
      ]);

      if (regimeResult.status === 'fulfilled' && regimeResult.value.ok) {
        const json = await regimeResult.value.json();
        if (json.success) {
          setRegimeData(json.data);
        }
      }

      if (portfolioResult.status === 'fulfilled' && portfolioResult.value.ok) {
        const json = await portfolioResult.value.json();
        setPortfolioSnapshot({
          grossExposurePct: Number(json.grossExposurePct ?? 0),
          netExposurePct: Number(json.netExposurePct ?? 0),
          openPositions: Number(json.openPositions ?? 0),
          updatedAt: typeof json.updatedAt === 'string' ? json.updatedAt : new Date().toISOString(),
        });
      } else {
        setPortfolioSnapshot(null);
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
  const regimeCounts: Record<RegimeName, number> = { trend: 0, volatile: 0, range: 0 };
  for (const e of regimeData) {
    regimeCounts[normalizeRegime(e.regime)]++;
  }
  const dominant = REGIME_ORDER.reduce((a, b) => (regimeCounts[a] >= regimeCounts[b] ? a : b), 'range' as RegimeName);
  // dominant is normalized onto the 3-state union and ALLOCATION_RULES covers
  // all three, so this lookup cannot miss.
  const activeRule = ALLOCATION_RULES.find((r) => r.regime === dominant)!;

  // Calculate current allocation summary
  const maxExposureNum = parseInt(activeRule.maxExposure);
  const currentExposure = portfolioSnapshot?.grossExposurePct ?? null;
  const headroom = currentExposure !== null ? +(maxExposureNum - currentExposure).toFixed(1) : null;

  // Regime freshness — most recent classification timestamp across symbols and
  // how many symbols were classified, so the "Active Regime" figure shows when
  // and over how many symbols it was detected rather than reading as live.
  const classifiedCount = regimeData.length;
  const latestDetectedAt = regimeData.reduce<string | null>((latest, e) => {
    if (!e.detectedAt) return latest;
    if (!latest || e.detectedAt > latest) return e.detectedAt;
    return latest;
  }, null);
  const detectedAtLabel = latestDetectedAt
    ? new Date(latestDetectedAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : null;

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
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                {classifiedCount} symbol{classifiedCount === 1 ? '' : 's'} classified
                {detectedAtLabel ? ` · detected ${detectedAtLabel}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Current Exposure</span>
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25"
                  title="These exposure figures come from a paper-trading demo account, not real capital."
                >
                  Paper / demo account
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {currentExposure === null ? 'N/A' : `${currentExposure.toFixed(1)}%`}
              </p>
              <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${maxExposureNum > 0 && currentExposure !== null ? Math.min((currentExposure / maxExposureNum) * 100, 100) : 0}%`,
                    backgroundColor: REGIME_COLORS[dominant].color,
                  }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                {currentExposure === null ? 'waiting for portfolio snapshot' : `of ${maxExposureNum}% max`}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Headroom</span>
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25"
                  title="Headroom is derived from the paper-trading demo account exposure, not real capital."
                >
                  Paper / demo account
                </span>
              </div>
              <p className={`text-2xl font-bold ${headroom === null ? 'text-[var(--foreground)]' : headroom > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {headroom === null ? 'N/A' : `${headroom.toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {portfolioSnapshot
                  ? `Snapshot: ${portfolioSnapshot.openPositions} open · gross ${portfolioSnapshot.grossExposurePct.toFixed(1)}% · net ${portfolioSnapshot.netExposurePct.toFixed(1)}%`
                  : 'Available for new positions'}
              </p>
            </div>
          </div>
        )}

        {/* Allocation rules table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Allocation Rules by Regime</h2>
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25"
                title="Static display mirror of the engine's REGIME_ALLOCATION_RULES (packages/signals/src/allocation/regime-rules.ts). Not fetched live — kept in sync manually."
              >
                Policy rules — not fetched live from the engine
              </span>
            </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Per-Symbol Regime Allocation</h2>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {classifiedCount} symbol{classifiedCount === 1 ? '' : 's'} classified
                {detectedAtLabel ? ` · detected ${detectedAtLabel}` : ''}
                {' · Max pos / Dir are policy rules, not live engine values'}
              </span>
            </div>
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
