import { NextRequest, NextResponse } from 'next/server';
import type { SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice, parseScope } from '../../../../lib/signal-slice';
import { modeledTradeR, type ModeledCostSource } from '../../../../lib/modeled-trade-cost';
import {
  CRYPTO_PERP_COSTS,
  METALS_COSTS,
  costModelFor,
} from '@tradeclaw/strategies';

export const revalidate = 60;

/**
 * Per-trade cost field: one entry per counted 24h outcome with a valid stop.
 * `grossR` is OHLCV-derived P&L divided by entry-to-stop risk. `costR` is a
 * fee + slippage model divided by the same risk, not an observed broker charge.
 * Request `?include=provenance` to receive the inputs and source fields needed
 * to reconstruct every displayed point.
 */
const CLASSES = ['crypto', 'metals', 'fx_or_fallback'] as const;

interface CostFieldProvenanceRow {
  id: string;
  pair: string;
  timeframe: string;
  direction: SignalHistoryRecord['direction'];
  strategyId: string | null;
  signalTimestamp: number;
  entryPrice: number;
  stopLoss: number;
  outcomePrice: number;
  outcomePnlPct: number;
  outcomeHit: boolean;
  outcomeTarget: string | null;
  outcomeResolvedAt: string | null;
  outcomeSource: string | null;
  riskPct: number;
  grossR: number;
  modeledCostNotionalPct: number;
  modeledCostR: number;
  modeledNetR: number;
  modeledCostSource: ModeledCostSource;
  broadcastDecision: 'approved' | 'blocked' | 'not-recorded';
}

function classIndexFor(pair: string): number {
  const model = costModelFor(pair);
  if (model === CRYPTO_PERP_COSTS) return 0;
  if (model === METALS_COSTS) return 1;
  return 2;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = parseScope(searchParams.get('scope'));
    const period = searchParams.get('period');
    const includeProvenance = searchParams.get('include') === 'provenance'
      || searchParams.get('provenance') === '1'
      || searchParams.get('provenance') === 'true';

    const slice = await getResolvedSlice({ scope, period });
    const sorted = [...slice.resolved].sort((a, b) => a.timestamp - b.timestamp);

    const ids: string[] = [];
    const t: number[] = [];
    const grossR: number[] = [];
    const costR: number[] = [];
    const cls: number[] = [];
    const provenance: CostFieldProvenanceRow[] = [];

    for (const record of sorted) {
      const outcome = record.outcomes?.['24h'];
      const tradeR = modeledTradeR(record);
      if (!outcome || !tradeR || record.sl == null) continue;

      ids.push(record.id);
      t.push(record.timestamp);
      grossR.push(+tradeR.grossR.toFixed(3));
      costR.push(+tradeR.costR.toFixed(3));
      cls.push(classIndexFor(record.pair));

      if (includeProvenance) {
        provenance.push({
          id: record.id,
          pair: record.pair,
          timeframe: record.timeframe,
          direction: record.direction,
          strategyId: record.strategyId ?? null,
          signalTimestamp: record.timestamp,
          entryPrice: record.entryPrice,
          stopLoss: record.sl,
          outcomePrice: outcome.price,
          outcomePnlPct: outcome.pnlPct,
          outcomeHit: outcome.hit,
          outcomeTarget: outcome.target ?? null,
          outcomeResolvedAt: outcome.resolvedAt ?? null,
          outcomeSource: outcome.source ?? null,
          riskPct: +tradeR.riskPct.toFixed(8),
          grossR: +tradeR.grossR.toFixed(8),
          modeledCostNotionalPct: +tradeR.costNotionalPct.toFixed(8),
          modeledCostR: +tradeR.costR.toFixed(8),
          modeledNetR: +tradeR.netR.toFixed(8),
          modeledCostSource: tradeR.costSource,
          broadcastDecision: record.broadcastBlocked === false
            ? 'approved'
            : record.broadcastBlocked === true
              ? 'blocked'
              : 'not-recorded',
        });
      }
    }

    return NextResponse.json(
      {
        classes: CLASSES,
        count: t.length,
        resolvedTotal: slice.resolved.length,
        ids,
        t,
        grossR,
        costR,
        cls,
        methodology: {
          population: 'non-simulated, non-gate-blocked rows with a non-placeholder 24h outcome and a valid stop loss',
          outcomeBasis: 'OHLCV-derived TP/SL or 24h close; not broker fills',
          costBasis: 'modeled round-trip fees and slippage; funding and actual broker charges excluded',
          sizingBasis: 'risk-normalized per signal by entry-to-stop distance; not a concurrent portfolio simulation',
          netFormula: 'grossR - costR',
        },
        window: {
          requestedScope: scope,
          requestedPeriod: period,
          effectivePeriod: slice.cutoffTs === null ? 'available-window' : period,
          startTimestamp: t.length > 0 ? t[0] : null,
          endTimestamp: t.length > 0 ? t[t.length - 1] : null,
          sourceRecordsLoaded: slice.sourceRecordsLoaded,
          sourceReadLimit: slice.sourceReadLimit,
          potentiallyTruncatedBeforeStart: slice.sourceWindowPotentiallyTruncated,
        },
        ...(includeProvenance ? { provenance } : {}),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
