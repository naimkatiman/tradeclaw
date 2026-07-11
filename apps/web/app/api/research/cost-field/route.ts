import { NextRequest, NextResponse } from 'next/server';
import type { SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice, parseScope } from '../../../../lib/signal-slice';
import {
  CRYPTO_PERP_COSTS,
  METALS_COSTS,
  costModelFor,
} from '@tradeclaw/strategies';

export const revalidate = 60;

/**
 * Per-trade cost field — the dataset behind the homepage Cost Field scene
 * and free for anyone to consume. One entry per resolved SIZED trade (rows
 * with an SL, same population as /api/signals/equity's sizedTrades):
 *
 *   t[i]      trade timestamp (ms epoch)
 *   grossR[i] raw R-multiple before cost (pnl% ÷ risk%), uncapped
 *   costR[i]  the trade's real recorded round-trip cost in R
 *             (cost_estimate_pct ÷ risk%; model fallback for pre-051 rows)
 *   cls[i]    index into `classes` (crypto / metals / fx)
 *
 * Net R per trade is grossR[i] − costR[i]. No new math: gross R and cost R
 * are the exact primitives /api/signals/equity compounds — this endpoint
 * just refuses to aggregate them away.
 */

const CLASSES = ['crypto', 'metals', 'fx'] as const;

function classIndexFor(pair: string): number {
  const model = costModelFor(pair);
  if (model === CRYPTO_PERP_COSTS) return 0;
  if (model === METALS_COSTS) return 1;
  return 2;
}

function roundTripCostNotionalPct(
  record: Pick<SignalHistoryRecord, 'pair' | 'costEstimatePct'>,
): number {
  if (record.costEstimatePct != null && record.costEstimatePct > 0) {
    return record.costEstimatePct;
  }
  const c = costModelFor(record.pair);
  return 2 * (c.feePctPerSide + c.slippagePctPerSide);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = parseScope(searchParams.get('scope'));
    const period = searchParams.get('period');

    const slice = await getResolvedSlice({ scope, period });
    const sorted = [...slice.resolved].sort((a, b) => a.timestamp - b.timestamp);

    const t: number[] = [];
    const grossR: number[] = [];
    const costR: number[] = [];
    const cls: number[] = [];

    for (const r of sorted) {
      if (r.sl == null || r.entryPrice <= 0) continue;
      const riskPct = (Math.abs(r.entryPrice - r.sl) / r.entryPrice) * 100;
      if (riskPct <= 0) continue;

      t.push(r.timestamp);
      grossR.push(+(r.outcomes['24h']!.pnlPct / riskPct).toFixed(3));
      costR.push(+(roundTripCostNotionalPct(r) / riskPct).toFixed(3));
      cls.push(classIndexFor(r.pair));
    }

    return NextResponse.json(
      {
        classes: CLASSES,
        count: t.length,
        resolvedTotal: slice.resolved.length,
        t,
        grossR,
        costR,
        cls,
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
