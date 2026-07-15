'use client';

// ---------------------------------------------------------------------------
// Data Provenance Badge — distinguishes recorded signal rows from synthetic
// demo rows. OHLCV resolution is not execution verification.
// ---------------------------------------------------------------------------

export type DataProvenance = 'live' | 'mixed' | 'simulated' | 'empty';

const PROVENANCE_CONFIG: Record<DataProvenance, { label: string; color: string; bg: string; border: string; tooltip: string }> = {
  live: {
    label: 'Recorded / OHLCV',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    tooltip: 'Stats use non-synthetic recorded signals and provider OHLCV outcomes. They are not broker fills or account returns.',
  },
  mixed: {
    label: 'Mixed data',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    tooltip: 'Stats include a mix of live-tracked and simulated signals. Simulated rows are excluded from accuracy calculations.',
  },
  simulated: {
    label: 'Simulated',
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.25)',
    tooltip: 'All displayed data is simulated seed data for demonstration purposes.',
  },
  empty: {
    label: 'No data',
    color: '#71717a',
    bg: 'rgba(113,113,122,0.08)',
    border: 'rgba(113,113,122,0.25)',
    tooltip: 'No signal data available yet.',
  },
};

interface DataProvenanceBadgeProps {
  /** The provenance classification for the displayed data. */
  provenance?: DataProvenance;
  /** The data source identifier (e.g. "signal-history", "win-rates"). */
  source?: string;
}

/**
 * Small badge that signals data provenance for signal-study stats.
 * Attach to any component that displays win rate, P&L, or signal outcomes
 * so users know whether the rows are recorded or synthetic.
 */
export function DataProvenanceBadge({
  provenance = 'live',
  source,
}: DataProvenanceBadgeProps) {
  const cfg = PROVENANCE_CONFIG[provenance];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono leading-none select-none"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
      title={source ? `${cfg.tooltip} Source: ${source}` : cfg.tooltip}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

/**
 * Derive data provenance from a set of signal records and stats.
 * Returns 'live' if all records are real, 'mixed' if some are simulated,
 * 'simulated' if all are simulated, or 'empty' if there are none.
 */
export function getDataProvenance(data: {
  records?: Array<{ isSimulated?: boolean }>;
  totalSignals?: number;
  resolved?: number;
}): DataProvenance {
  const records = data.records ?? [];
  if (records.length === 0 && (!data.totalSignals || data.totalSignals === 0)) return 'empty';

  const hasLive = records.some((r) => !r.isSimulated);
  const hasSim = records.some((r) => r.isSimulated);

  if (hasLive && hasSim) return 'mixed';
  if (hasSim && !hasLive) return 'simulated';
  return 'live';
}

/**
 * Derive provenance from current-archive counts (live vs simulated), not a
 * paginated page slice. A page can be all-live while the current archive is
 * mixed — `getDataProvenance` over the visible page would mislabel that as
 * mixed. Callers with archive-level totals must use this instead.
 */
export function getDataProvenanceFromCounts(counts: {
  live?: number;
  simulated?: number;
}): DataProvenance {
  const live = counts.live ?? 0;
  const simulated = counts.simulated ?? 0;
  if (live === 0 && simulated === 0) return 'empty';
  if (live > 0 && simulated > 0) return 'mixed';
  if (simulated > 0 && live === 0) return 'simulated';
  return 'live';
}
