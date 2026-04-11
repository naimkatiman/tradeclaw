'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, Zap, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type RegimeName = 'crash' | 'bear' | 'neutral' | 'bull' | 'euphoria';

interface RegimeEntry {
  symbol: string;
  regime: string;
  confidence: number;
  features: {
    rollingVol20d: number;
    returns5d: number;
    returns20d: number;
    volumeZScore: number;
  };
  detectedAt: string;
}

interface RegimeApiResponse {
  success: boolean;
  count: number;
  data: RegimeEntry[];
  note?: string;
}

// ─── Constants ───────────────────────────────────────────────

const REGIME_CONFIG: Record<RegimeName, { color: string; bg: string; border: string; label: string }> = {
  crash:    { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)', label: 'Crash' },
  bear:     { color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', label: 'Bear' },
  neutral:  { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', border: 'rgba(107, 114, 128, 0.3)', label: 'Neutral' },
  bull:     { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', label: 'Bull' },
  euphoria: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', label: 'Euphoria' },
};

const REGIME_ORDER: RegimeName[] = ['crash', 'bear', 'neutral', 'bull', 'euphoria'];

const ASSET_CLASSES: Record<string, string> = {
  BTCUSD: 'crypto', ETHUSD: 'crypto',
  EURUSD: 'forex', GBPUSD: 'forex', USDJPY: 'forex', GBPJPY: 'forex',
  AUDUSD: 'forex', USDCAD: 'forex',
  XAUUSD: 'metals', XAGUSD: 'metals',
};

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

function getAssetClassStyle(assetClass: string): string {
  switch (assetClass) {
    case 'crypto': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'forex': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'metals': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

// ─── Sub-components ──────────────────────────────────────────

function RegimeBadge({ regime }: { regime: RegimeName }) {
  const config = REGIME_CONFIG[regime];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{ color: config.color, backgroundColor: config.bg, borderColor: config.border }}
    >
      {getRegimeIcon(regime)}
      {config.label}
    </span>
  );
}

function SymbolCard({ entry }: { entry: RegimeEntry }) {
  const regime = normalizeRegime(entry.regime);
  const config = REGIME_CONFIG[regime];
  const assetClass = ASSET_CLASSES[entry.symbol] ?? 'other';

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">{entry.symbol}</h3>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border mt-1 ${getAssetClassStyle(assetClass)}`}
          >
            {assetClass}
          </span>
        </div>
        <RegimeBadge regime={regime} />
      </div>

      {/* Confidence bar */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Confidence</span>
          <span className="text-xs font-semibold text-[var(--foreground)]">{Math.round(entry.confidence * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${entry.confidence * 100}%`, backgroundColor: config.color }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
        <div>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Vol 20d</span>
          <p className="text-sm font-mono font-medium text-[var(--foreground)]">
            {(entry.features.rollingVol20d * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Ret 5d</span>
          <p className={`text-sm font-mono font-medium ${entry.features.returns5d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {entry.features.returns5d >= 0 ? '+' : ''}{(entry.features.returns5d * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {entry.detectedAt && (
        <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-mono">
          Detected: {new Date(entry.detectedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function RegimeDistribution({ entries }: { entries: RegimeEntry[] }) {
  const counts: Record<RegimeName, number> = { crash: 0, bear: 0, neutral: 0, bull: 0, euphoria: 0 };
  for (const e of entries) {
    const r = normalizeRegime(e.regime);
    counts[r]++;
  }
  const max = Math.max(...Object.values(counts), 1);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">Regime Distribution</h2>
      <div className="space-y-3">
        {REGIME_ORDER.map((regime) => {
          const config = REGIME_CONFIG[regime];
          const count = counts[regime];
          return (
            <div key={regime} className="flex items-center gap-3">
              <span className="w-20 text-xs font-medium text-[var(--text-secondary)]">{config.label}</span>
              <div className="flex-1 h-6 rounded bg-[var(--glass-bg)] overflow-hidden relative">
                <div
                  className="h-full rounded transition-all duration-700 flex items-center justify-end pr-2"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: config.bg,
                    borderRight: count > 0 ? `2px solid ${config.color}` : 'none',
                    minWidth: count > 0 ? '2rem' : '0',
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: config.color }}>{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function RegimeClient() {
  const [data, setData] = useState<RegimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/regime');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RegimeApiResponse = await res.json();
      if (json.success) {
        setData(json.data);
        setUpdatedAt(new Date().toISOString());
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

  // Determine dominant regime
  const regimeCounts: Record<RegimeName, number> = { crash: 0, bear: 0, neutral: 0, bull: 0, euphoria: 0 };
  for (const e of data) {
    regimeCounts[normalizeRegime(e.regime)]++;
  }
  const dominant = REGIME_ORDER.reduce((a, b) => (regimeCounts[a] >= regimeCounts[b] ? a : b), 'neutral' as RegimeName);
  const dominantConfig = REGIME_CONFIG[dominant];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Regime <span className="text-purple-400">Monitor</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                HMM regime classification across all trading pairs
              </p>
            </div>
          </div>
          {updatedAt && (
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              Last updated: {new Date(updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Dominant regime overview */}
        {!loading && data.length > 0 && (
          <div
            className="flex items-center gap-4 rounded-xl border px-5 py-3 mb-6"
            style={{ borderColor: dominantConfig.border, backgroundColor: dominantConfig.bg }}
          >
            <div className="flex items-center gap-2">
              {getRegimeIcon(dominant)}
              <span className="text-sm font-semibold" style={{ color: dominantConfig.color }}>
                Dominant Regime: {dominantConfig.label}
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {regimeCounts[dominant]} of {data.length} symbols
            </span>
            <div className="ml-auto hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Auto-refresh 60s</span>
            </div>
          </div>
        )}

        {/* Distribution + Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse h-52" />
            ))}
          </div>
        ) : data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Distribution sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <RegimeDistribution entries={data} />
            </div>
            {/* Symbol cards */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.map((entry) => (
                  <SymbolCard key={entry.symbol} entry={entry} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-[var(--text-secondary)]">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No regime data available</p>
            <p className="text-sm">Run the HMM classifier to populate regime data, or check that the market_regimes migration has been applied.</p>
          </div>
        )}
      </div>
    </div>
  );
}
