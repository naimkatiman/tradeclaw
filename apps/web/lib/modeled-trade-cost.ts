import { costModelFor } from '@tradeclaw/strategies';
import type { SignalHistoryRecord } from './signal-history';

export type ModeledCostSource =
  | 'emission-time-model'
  | 'current-asset-class-fallback-model';

export interface ModeledTradeR {
  riskPct: number;
  outcomePnlPct: number;
  grossR: number;
  costNotionalPct: number;
  costR: number;
  netR: number;
  costSource: ModeledCostSource;
}

/**
 * Returns the modeled round-trip fee + slippage assumption as a percentage of
 * notional. A persisted value is a snapshot of the model used at emission; it
 * is not a broker fill or an observed account charge. Funding is not included.
 */
export function modeledRoundTripCostNotionalPct(
  record: Pick<SignalHistoryRecord, 'pair' | 'costEstimatePct'>,
): { pct: number; source: ModeledCostSource } {
  if (record.costEstimatePct != null && record.costEstimatePct > 0) {
    return { pct: record.costEstimatePct, source: 'emission-time-model' };
  }

  const model = costModelFor(record.pair);
  return {
    pct: 2 * (model.feePctPerSide + model.slippagePctPerSide),
    source: 'current-asset-class-fallback-model',
  };
}

/** Risk-normalized gross, modeled cost, and net result for a sized 24h row. */
export function modeledTradeR(
  record: Pick<
    SignalHistoryRecord,
    'pair' | 'entryPrice' | 'sl' | 'costEstimatePct' | 'outcomes'
  >,
): ModeledTradeR | null {
  if (record.sl == null || record.entryPrice <= 0) return null;
  const outcome = record.outcomes['24h'];
  if (!outcome) return null;

  const riskPct = (Math.abs(record.entryPrice - record.sl) / record.entryPrice) * 100;
  if (!Number.isFinite(riskPct) || riskPct <= 0) return null;

  const cost = modeledRoundTripCostNotionalPct(record);
  const grossR = outcome.pnlPct / riskPct;
  const costR = cost.pct / riskPct;
  return {
    riskPct,
    outcomePnlPct: outcome.pnlPct,
    grossR,
    costNotionalPct: cost.pct,
    costR,
    netR: grossR - costR,
    costSource: cost.source,
  };
}
