import type { Metadata } from 'next';
import StarHistoryLoader from './StarHistoryLoader';

export const metadata: Metadata = {
  title: 'Star History | TradeClaw',
  description:
    'GitHub-provided TradeClaw stargazer timestamps when a complete history is available. Missing data is not estimated.',
  openGraph: {
    title: 'TradeClaw Star History',
    description: 'View sourced weekly GitHub star history with no generated fallback data.',
    type: 'website',
  },
};

export default function StarHistoryPage() {
  return <StarHistoryLoader />;
}
