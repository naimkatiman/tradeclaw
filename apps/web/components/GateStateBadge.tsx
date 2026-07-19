'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { useLocale } from '../app/components/locale-provider';
import { getDashboardLiveTranslations } from '../lib/product-i18n/dashboard-live';
import { formatMessage } from '../lib/product-i18n/format';
import { getHtmlLanguage } from '../lib/translations';

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
  const { locale } = useLocale();
  const t = getDashboardLiveTranslations(locale);
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
  const regimeLabel =
    snap.regime === 'trend'
      ? t.gate.regimes.trend
      : snap.regime === 'volatile'
        ? t.gate.regimes.volatile
        : snap.regime === 'range'
          ? t.gate.regimes.range
          : snap.regime
            ? regimeStyle.label
            : t.gate.regimes.unknown;
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
      ? t.gate.statuses.off
      : snap.gatesAllow
      ? t.gate.statuses.allow
      : t.gate.statuses.blocked;

  const language = getHtmlLanguage(locale);
  const countFormatter = new Intl.NumberFormat(language);
  const decimalFormatter = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  const thresholdFormatter = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const volNote = snap.volMultiplier !== 1.0
    ? ` (vol×${decimalFormatter.format(snap.volMultiplier)})`
    : '';
  const tooltip = [
    formatMessage(t.gate.tooltip.mode, { mode: snap.mode }),
    formatMessage(t.gate.tooltip.regime, { regime: regimeLabel }),
    formatMessage(t.gate.tooltip.streakLosses, {
      current: countFormatter.format(snap.streakLossCount),
      limit: countFormatter.format(snap.thresholds.streakN),
    }),
    formatMessage(t.gate.tooltip.drawdown, {
      current: decimalFormatter.format(snap.currentDrawdownPct),
      limit: thresholdFormatter.format(snap.effectiveDrawdownThreshold * 100),
      volatility: volNote,
    }),
    formatMessage(t.gate.tooltip.lookback, {
      current: countFormatter.format(snap.dataPoints),
      limit: countFormatter.format(snap.thresholds.lookback),
    }),
    snap.reason ? formatMessage(t.gate.tooltip.reason, { reason: snap.reason }) : '',
  ]
    .filter(Boolean)
    .join('\n');
  const ariaLabel = formatMessage(t.gate.aria, { status: statusText, regime: regimeLabel });

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-mono"
      title={tooltip}
      aria-label={ariaLabel}
    >
      <Icon className={`h-3 w-3 ${statusColor}`} aria-hidden="true" />
      <span className={statusColor}>{statusText}</span>
      <span className="text-zinc-600">|</span>
      <span className={`px-1.5 py-0.5 rounded border ${regimeStyle.className}`}>
        <bdi dir="auto">{regimeLabel}</bdi>
      </span>
    </div>
  );
}
