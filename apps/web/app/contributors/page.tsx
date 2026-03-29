import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ContributorsClient = dynamic(
  () => import('./ContributorsClient').then(m => ({ default: m.ContributorsClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Contributors — TradeClaw',
  description:
    'Meet the people building TradeClaw. Contributor leaderboard with GitHub stats, PR count, merged PRs, and issues closed.',
  openGraph: {
    title: 'TradeClaw Contributors',
    description:
      'The open-source community building the best AI trading signal platform. See who contributes, how much, and join them.',
    type: 'website',
  },
};

export default function ContributorsPage() {
  return <ContributorsClient />;
}
