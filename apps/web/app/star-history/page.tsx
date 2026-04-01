import type { Metadata } from 'next';
import StarHistoryLoader from './StarHistoryLoader';

export const metadata: Metadata = {
  title: 'Star History | TradeClaw',
  description:
    'GitHub star growth calendar for TradeClaw — see how the open-source AI trading signal platform is growing week by week.',
  openGraph: {
    title: 'TradeClaw Star History',
    description: 'Track TradeClaw GitHub star growth — week by week contribution-style calendar.',
    type: 'website',
  },
};

export default function StarHistoryPage() {
  return <StarHistoryLoader />;
}
