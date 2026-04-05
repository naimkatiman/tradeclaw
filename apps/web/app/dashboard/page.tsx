import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';
import { getTrackedSignals } from '../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../lib/signal-thresholds';

export const metadata: Metadata = {
  title: 'Dashboard — TradeClaw',
  description: 'Real-time AI trading signals for forex, crypto, and commodities. Live technical analysis with RSI, MACD, EMA confluence scoring.',
};

export default async function DashboardPage() {
  // Pre-fetch signals server-side to avoid flash of empty state
  let initialSignals: Awaited<ReturnType<typeof getTrackedSignals>>['signals'] = [];
  let initialSyntheticSymbols: Awaited<ReturnType<typeof getTrackedSignals>>['syntheticSymbols'] = [];
  try {
    const result = await getTrackedSignals({
      minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    });
    initialSignals = result.signals;
    initialSyntheticSymbols = result.syntheticSymbols;
  } catch {
    // Fall through with empty arrays — client will re-fetch
  }

  return <DashboardClient initialSignals={initialSignals} initialSyntheticSymbols={initialSyntheticSymbols} />;
}
