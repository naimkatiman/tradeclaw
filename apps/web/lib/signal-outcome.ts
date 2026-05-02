// apps/web/lib/signal-outcome.ts
export interface SignalLevels {
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;
  takeProfit3: number | null;
}

export type OutcomeStatus =
  | 'active'
  | 'tp1_hit'
  | 'tp2_hit'
  | 'tp3_hit'
  | 'stopped'
  | 'unknown';

export interface SignalOutcome {
  status: OutcomeStatus;
  progressPct: number;
  hitTarget: 'TP1' | 'TP2' | 'TP3' | 'SL' | null;
}

export function classifySignalOutcome(
  s: SignalLevels,
  livePrice: number | null | undefined,
): SignalOutcome {
  if (livePrice == null || !Number.isFinite(livePrice)) {
    return { status: 'unknown', progressPct: 0, hitTarget: null };
  }

  const isBuy = s.direction === 'BUY';
  const reached = (target: number) =>
    isBuy ? livePrice >= target : livePrice <= target;
  const stopHit =
    isBuy ? livePrice <= s.stopLoss : livePrice >= s.stopLoss;

  if (stopHit) return { status: 'stopped', progressPct: -100, hitTarget: 'SL' };
  if (s.takeProfit3 != null && reached(s.takeProfit3)) return { status: 'tp3_hit', progressPct: 100, hitTarget: 'TP3' };
  if (s.takeProfit2 != null && reached(s.takeProfit2)) return { status: 'tp2_hit', progressPct: 75, hitTarget: 'TP2' };
  if (reached(s.takeProfit1)) return { status: 'tp1_hit', progressPct: 50, hitTarget: 'TP1' };

  const distToTp1 = Math.abs(s.takeProfit1 - s.entry);
  const distToSl = Math.abs(s.entry - s.stopLoss);
  const moved = livePrice - s.entry;
  const movedSigned = isBuy ? moved : -moved;

  let progressPct: number;
  if (movedSigned >= 0) {
    progressPct = distToTp1 > 0 ? Math.min(50, (movedSigned / distToTp1) * 50) : 0;
  } else {
    progressPct = distToSl > 0 ? Math.max(-99, (movedSigned / distToSl) * 100) : 0;
  }

  return { status: 'active', progressPct: Number(progressPct.toFixed(1)), hitTarget: null };
}
