import { DashboardClient } from './DashboardClient';
import { getSignals } from '../lib/signals';

export default async function DashboardPage() {
  // Pre-fetch signals server-side to avoid flash of empty state
  const initialSignals = await getSignals({ minConfidence: 50 });

  return <DashboardClient initialSignals={initialSignals} />;
}
