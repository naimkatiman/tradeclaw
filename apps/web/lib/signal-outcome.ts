// apps/web/lib/signal-outcome.ts
export interface SignalLevels {
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number | null;
  takeProfit1: number;
  takeProfit2: number | null;
  takeProfit3: number | null;
}

export type OutcomeStatus =
  | 'active'
  | 'hit_tp1'
  | 'hit_tp2'
  | 'hit_tp3'
  | 'stopped'
  | 'expired'
  | 'unknown';

export interface SignalOutcome {
  status: OutcomeStatus;
  progressPct: number;
  hitTarget: 'TP1' | 'TP2' | 'TP3' | 'SL' | null;
}

export type HistoricalOutcome =
  | { hit: boolean; pnlPct: number; target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired' }
  | null
  | undefined;

const HISTORICAL_TARGET_STATUS: Record<'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired', OutcomeStatus> = {
  TP1: 'hit_tp1',
  TP2: 'hit_tp2',
  TP3: 'hit_tp3',
  SL: 'stopped',
  expired: 'expired',
};

export function deriveHistoricalOutcomeStatus(
  outcome: HistoricalOutcome,
): OutcomeStatus {
  if (outcome == null) return 'active';
  if (outcome.target && outcome.target in HISTORICAL_TARGET_STATUS) {
    return HISTORICAL_TARGET_STATUS[outcome.target];
  }
  if (outcome.pnlPct === 0 && !outcome.hit) return 'expired';
  return outcome.hit ? 'hit_tp1' : 'stopped';
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
  const hasStopLoss = s.stopLoss != null;
  const stopHit = hasStopLoss
    ? isBuy ? livePrice <= s.stopLoss! : livePrice >= s.stopLoss!
    : false;

  if (stopHit) return { status: 'stopped', progressPct: -100, hitTarget: 'SL' };
  if (s.takeProfit3 != null && reached(s.takeProfit3)) return { status: 'hit_tp3', progressPct: 100, hitTarget: 'TP3' };
  if (s.takeProfit2 != null && reached(s.takeProfit2)) return { status: 'hit_tp2', progressPct: 75, hitTarget: 'TP2' };
  if (reached(s.takeProfit1)) return { status: 'hit_tp1', progressPct: 50, hitTarget: 'TP1' };

  const distToTp1 = Math.abs(s.takeProfit1 - s.entry);
  const distToSl = hasStopLoss ? Math.abs(s.entry - s.stopLoss!) : 0;
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
