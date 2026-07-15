import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '../../../lib/signals';
import {
  recordSignalAsync,
  getRecentRecordForSymbolAsync,
} from '../../../../lib/signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';
import { requireCronAuth } from '../../../../lib/cron-auth';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function POST(request: NextRequest): Promise<Response> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const { signals } = await getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });

    let recorded = 0;

    for (const sig of signals) {
      if (sig.dataQuality !== 'real') continue;

      const existing = await getRecentRecordForSymbolAsync(sig.symbol, sig.direction, TWO_HOURS_MS);
      if (existing) continue;

      // Use the canonical SIG-* id from the generator so detail-page URLs
      // (/signal/{id}) round-trip back to a parseable record.
      await recordSignalAsync(
        sig.symbol,
        sig.timeframe,
        sig.direction,
        sig.confidence,
        sig.entry,
        sig.id,
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
  return NextResponse.json({ error: 'Method not allowed' }, {
    status: 405,
    headers: { Allow: 'POST' },
  });
}
