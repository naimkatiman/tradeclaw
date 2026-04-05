import { NextResponse } from 'next/server';
import { getSignals } from '../../../lib/signals';
import {
  recordSignalAsync,
  getRecentRecordForSymbolAsync,
} from '../../../../lib/signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function POST(): Promise<Response> {
  try {
    const { signals } = await getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });

    let recorded = 0;

    for (const sig of signals) {
      if (sig.dataQuality !== 'real') continue;

      const existing = await getRecentRecordForSymbolAsync(sig.symbol, sig.direction, TWO_HOURS_MS);
      if (existing) continue;

      const id = `${sig.symbol}-${sig.timeframe}-${Date.now()}`;

      await recordSignalAsync(
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
  return POST();
}
