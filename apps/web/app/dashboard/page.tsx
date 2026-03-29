import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';
import { getTrackedSignals } from '../../lib/tracked-signals';

export const metadata: Metadata = {
  title: 'Dashboard — TradeClaw',
  description: 'Real-time AI trading signals for forex, crypto, and commodities. Live technical analysis with RSI, MACD, EMA confluence scoring.',
};

export default async function DashboardPage() {
  // Pre-fetch signals server-side to avoid flash of empty state
  const { signals: initialSignals, syntheticSymbols: initialSyntheticSymbols } = await getTrackedSignals({ minConfidence: 70 });

  return <DashboardClient initialSignals={initialSignals} initialSyntheticSymbols={initialSyntheticSymbols} />;
}
