import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';
import { getTrackedSignals } from '../../lib/tracked-signals';
import { applyTierSignalVisibility, resolveAccessContextFromCookies } from '../../lib/tier';
import { WATCHLIST_MIN_CONFIDENCE } from '../../lib/signal-thresholds';

export const metadata: Metadata = {
  title: 'Dashboard — TradeClaw',
  description: 'Real-time AI trading signals for forex, crypto, and commodities. Live technical analysis with RSI, MACD, EMA confluence scoring.',
};

export default async function DashboardPage() {
  // Pre-fetch signals server-side to avoid flash of empty state
  let initialSignals: Awaited<ReturnType<typeof getTrackedSignals>>['signals'] = [];
  let initialSyntheticSymbols: Awaited<ReturnType<typeof getTrackedSignals>>['syntheticSymbols'] = [];
  try {
    const ctx = await resolveAccessContextFromCookies();
    const result = await getTrackedSignals({
      minConfidence: WATCHLIST_MIN_CONFIDENCE,
      ctx,
    });
    initialSignals = applyTierSignalVisibility(result.signals, ctx.tier).visible;
    initialSyntheticSymbols = result.syntheticSymbols;
  } catch {
    // Fall through with empty arrays — client will re-fetch
  }

  return <DashboardClient initialSignals={initialSignals} initialSyntheticSymbols={initialSyntheticSymbols} />;
}
