'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

interface GateSnapshot {
  mode: 'shadow' | 'active' | 'off';
  gatesAllow: boolean;
  reason: string | null;
  regime: 'crash' | 'bear' | 'neutral' | 'bull' | 'euphoria';
  streakLossCount: number;
  currentDrawdownPct: number;
  dataPoints: number;
  thresholds: { streakN: number; drawdownThreshold: number; lookback: number };
  volMultiplier: number;
  effectiveDrawdownThreshold: number;
}

const REGIME_STYLES: Record<GateSnapshot['regime'], { label: string; className: string }> = {
  crash:    { label: 'CRASH',    className: 'text-red-400 bg-red-500/10 border-red-500/30' },
  bear:     { label: 'BEAR',     className: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  neutral:  { label: 'NEUTRAL',  className: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/30' },
  bull:     { label: 'BULL',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  euphoria: { label: 'EUPHORIA', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
};

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

  const regimeStyle = REGIME_STYLES[snap.regime];
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
