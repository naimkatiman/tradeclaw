import { DashboardClient } from './DashboardClient';
import { getTrackedSignals } from '../../lib/tracked-signals';

export default async function DashboardPage() {
  // Pre-fetch signals server-side to avoid flash of empty state
  const { signals: initialSignals, syntheticSymbols: initialSyntheticSymbols } = await getTrackedSignals({ minConfidence: 50 });

  return <DashboardClient initialSignals={initialSignals} initialSyntheticSymbols={initialSyntheticSymbols} />;
}
