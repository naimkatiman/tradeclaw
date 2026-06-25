'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

interface GateSnapshot {
  mode: 'shadow' | 'active' | 'off';
  gatesAllow: boolean;
  reason: string | null;
  // Wire value — resolved through resolveRegimeStyle so an unexpected label
  // (legacy vocabulary, future additions) degrades gracefully instead of
  // crashing the badge at render (plan D1).
  regime: string;
  streakLossCount: number;
  currentDrawdownPct: number;
  dataPoints: number;
  thresholds: { streakN: number; drawdownThreshold: number; lookback: number };
  volMultiplier: number;
  effectiveDrawdownThreshold: number;
}

interface RegimeStyle {
  label: string;
  className: string;
}

const REGIME_STYLES: Record<'trend' | 'volatile' | 'range', RegimeStyle> = {
  trend:    { label: 'TREND',    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  volatile: { label: 'VOLATILE', className: 'text-red-400 bg-red-500/10 border-red-500/30' },
  range:    { label: 'RANGE',    className: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/30' },
};

const FALLBACK_CLASS = 'text-zinc-500 bg-zinc-500/10 border-zinc-500/30';

/**
 * Lookup-with-default: unknown labels surface the raw value in a muted style
 * rather than throwing at render. Exported for tests.
 */
export function resolveRegimeStyle(regime: string | null | undefined): RegimeStyle {
  if (regime && Object.prototype.hasOwnProperty.call(REGIME_STYLES, regime)) {
    return REGIME_STYLES[regime as keyof typeof REGIME_STYLES];
  }
  return { label: regime ? regime.toUpperCase() : 'UNKNOWN', className: FALLBACK_CLASS };
}

export function GateStateBadge() {
  const [snap, setSnap] = useState<GateSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/risk/gate-state', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as GateSnapshot;
        if (!cancelled) setSnap(data);
      } catch {
        // silent — the badge just doesn't render
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!snap) return null;

  const regimeStyle = resolveRegimeStyle(snap.regime);
  const Icon =
    snap.mode === 'off' ? ShieldOff : snap.gatesAllow ? ShieldCheck : ShieldAlert;
  const statusColor =
    snap.mode === 'off'
      ? 'text-zinc-500'
      : snap.gatesAllow
      ? 'text-emerald-400'
      : 'text-red-400';
  const statusText =
    snap.mode === 'off'
      ? 'gates off'
      : snap.gatesAllow
      ? 'gates allow'
      : 'GATES BLOCKED';

  const volNote = snap.volMultiplier !== 1.0 ? ` (vol×${snap.volMultiplier.toFixed(2)})` : '';
  const tooltip = [
    `Mode: ${snap.mode}`,
    `Regime: ${snap.regime}`,
    `Streak losses: ${snap.streakLossCount}/${snap.thresholds.streakN}`,
    `Drawdown: ${snap.currentDrawdownPct}% / ${(snap.effectiveDrawdownThreshold * 100).toFixed(1)}%${volNote}`,
    `Lookback: ${snap.dataPoints}/${snap.thresholds.lookback} resolved signals`,
    snap.reason ? `Reason: ${snap.reason}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-mono"
      title={tooltip}
      aria-label={`Risk gate status: ${statusText}, regime ${snap.regime}`}
    >
      <Icon className={`h-3 w-3 ${statusColor}`} aria-hidden="true" />
      <span className={statusColor}>{statusText}</span>
      <span className="text-zinc-600">|</span>
      <span className={`px-1.5 py-0.5 rounded border ${regimeStyle.className}`}>
        {regimeStyle.label}
      </span>
    </div>
  );
}
