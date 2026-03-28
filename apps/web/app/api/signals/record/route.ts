import { NextResponse } from 'next/server';
import { getSignals } from '../../../lib/signals';
import {
  recordSignal,
  getRecentRecordForSymbol,
} from '../../../../lib/signal-history';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/signals/record
 *
 * Generate current signals via the real TA engine, then persist every
 * signal with confidence >= 60 that does not already have a recent
 * duplicate (same symbol + direction within the last 2 hours).
 */
export async function POST(): Promise<Response> {
  try {
    const { signals } = await getSignals({ minConfidence: 60 });

    let recorded = 0;

    for (const sig of signals) {
      // Skip synthetic / fallback signals
      if (sig.dataQuality !== 'real') continue;

      // De-duplicate: skip if a record for this symbol + direction exists within 2h
      const existing = getRecentRecordForSymbol(sig.symbol, sig.direction, TWO_HOURS_MS);
      if (existing) continue;

      const id = `${sig.symbol}-${sig.timeframe}-${Date.now()}`;

      recordSignal(
        sig.symbol,
        sig.timeframe,
        sig.direction,
        sig.confidence,
        sig.entry,
        id,
        sig.takeProfit1,
        sig.stopLoss,
        Date.now(),
      );

      recorded++;
    }

    return NextResponse.json({ recorded, totalSignals: signals.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  // Allow GET for easy testing — delegates to POST logic
  return POST();
}
