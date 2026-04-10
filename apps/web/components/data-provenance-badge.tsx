'use client';

import { ShieldCheck, FlaskConical } from 'lucide-react';

export type Provenance = 'simulated' | 'live';

/**
 * Inspect a data source shape and determine whether it represents
 * live-audited outcomes or simulated seed data.
 *
 * Heuristic (no signal-gen logic touched):
 *  - Explicit `isSimulated: true` field → simulated
 *  - Any record with `isSimulated: true` in the sample → simulated
 *  - Zero real (resolved, non-simulated) records but non-zero total → simulated
 *  - Otherwise → live
 */
export function getDataProvenance(source: unknown): Provenance {
  if (source == null) return 'simulated';

  if (typeof source === 'object') {
    const obj = source as Record<string, unknown>;

    // Direct flag on object (e.g. calibration API response)
    if (obj.isSimulated === true) return 'simulated';
    if (obj.isSimulated === false) {
      // Still verify we actually have real audited outcomes
      const realSignals = typeof obj.realSignals === 'number' ? obj.realSignals : undefined;
      const resolved = typeof obj.resolvedSignals === 'number' ? obj.resolvedSignals : undefined;
      if (realSignals === 0 && (resolved === undefined || resolved === 0)) return 'simulated';
      return 'live';
    }

    // Aggregate shape from /api/proof or /api/signals/history stats
    const realSignals = typeof obj.realSignals === 'number' ? obj.realSignals : undefined;
    const resolved = typeof obj.resolvedSignals === 'number'
      ? obj.resolvedSignals
      : typeof obj.resolved === 'number' ? obj.resolved : undefined;
    const total = typeof obj.totalSignals === 'number' ? obj.totalSignals : undefined;

    if (realSignals !== undefined) {
      if (realSignals > 0 && (resolved === undefined || resolved > 0)) return 'live';
      return 'simulated';
    }
    if (resolved !== undefined && total !== undefined) {
      return resolved > 0 ? 'live' : 'simulated';
    }

    // Array of records (e.g. records: SignalRecord[])
    if (Array.isArray(obj.records)) {
      return getDataProvenance(obj.records);
    }
  }

  if (Array.isArray(source)) {
    if (source.length === 0) return 'simulated';
    const hasSim = source.some(
      (r) => r && typeof r === 'object' && (r as { isSimulated?: boolean }).isSimulated === true,
    );
    if (hasSim) return 'simulated';
    const hasResolved = source.some((r) => {
      if (!r || typeof r !== 'object') return false;
      const rec = r as {
        outcomes?: { '4h'?: unknown; '24h'?: unknown };
        outcome4h?: { resolved?: boolean };
        outcome24h?: { resolved?: boolean };
      };
      if (rec.outcomes && (rec.outcomes['4h'] != null || rec.outcomes['24h'] != null)) return true;
      if (rec.outcome4h?.resolved || rec.outcome24h?.resolved) return true;
      return false;
    });
    return hasResolved ? 'live' : 'simulated';
  }

  return 'simulated';
}

interface DataProvenanceBadgeProps {
  provenance: Provenance;
  /** Optional label for where the data came from (e.g. "signal-history table"). */
  source?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function DataProvenanceBadge({
  provenance,
  source,
  className = '',
  size = 'md',
}: DataProvenanceBadgeProps) {
  const isLive = provenance === 'live';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const baseTone = isLive
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${padding} ${baseTone} ${className}`}
      title={
        isLive
          ? `Live audited data${source ? ` — source: ${source}` : ''}. Outcomes recorded from real signal-history.`
          : `Simulated / seed data${source ? ` — source: ${source}` : ''}. Excluded from trust-critical stats.`
      }
    >
      {isLive ? (
        <ShieldCheck className={iconSize} aria-hidden />
      ) : (
        <FlaskConical className={iconSize} aria-hidden />
      )}
      <span>{isLive ? 'Live Audited' : 'Simulated'}</span>
    </span>
  );
}
