'use client';

import { AlertTriangle, TrendingUp } from 'lucide-react';

interface Props {
  /** Direction of the signal — determines what counts as favorable. */
  direction: 'BUY' | 'SELL';
  /** Entry price stamped at signal generation time. */
  entry: number;
  /** Current live price for the same symbol; undefined/null hides the notice. */
  livePrice: number | null | undefined;
  /** Absolute % move below which the notice is hidden. Default 0.3%. */
  thresholdPct?: number;
}

/**
 * Free-tier signals can be 15+ minutes delayed; even for paid users prices move
 * between signal generation and the first read. This notice surfaces how far
 * the market has drifted from the stamped entry and whether that drift is
 * favorable for the signal's direction. Hidden when |delta| <= threshold.
 */
export function EntryStalenessNotice({ direction, entry, livePrice, thresholdPct = 0.3 }: Props) {
  if (typeof livePrice !== 'number' || !Number.isFinite(livePrice) || entry <= 0) {
    return null;
  }
  const pct = ((livePrice - entry) / entry) * 100;
  if (Math.abs(pct) < thresholdPct) {
    return null;
  }
  const unfavorable =
    (direction === 'BUY' && pct > 0) || (direction === 'SELL' && pct < 0);

  const sign = pct > 0 ? '+' : '';
  const cls = unfavorable
    ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
    : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300';
  const Icon = unfavorable ? AlertTriangle : TrendingUp;
  const label = unfavorable
    ? `Price moved ${sign}${pct.toFixed(2)}% — entry may be stale`
    : `Price now ${sign}${pct.toFixed(2)}% — better than entry`;

  return (
    <div
      data-testid="entry-staleness"
      role="status"
      className={`mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-medium ${cls}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
