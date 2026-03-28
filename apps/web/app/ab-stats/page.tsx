import type { Metadata } from 'next';
import { ABStatsClient } from './ABStatsClient';

export const metadata: Metadata = {
  title: 'A/B Hero Stats — TradeClaw',
  description: 'Internal A/B test dashboard for hero variant performance.',
  robots: { index: false, follow: false },
};

export default function ABStatsPage() {
  return <ABStatsClient />;
}
