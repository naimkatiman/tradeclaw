import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ContributorsClient = dynamic(
  () =>
    import('./ContributorsClient').then((m) => ({
      default: m.ContributorsClient,
    })),
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
    'GitHub contributor totals reported by the repository contributors API. TradeClaw does not estimate pull requests, merges, or issue counts from contribution totals.',
  openGraph: {
    title: 'TradeClaw Contributors',
    description: 'Repository contributor totals from GitHub, shown only when the upstream API is available.',
    type: 'website',
  },
};

export default function ContributorsPage() {
  return <ContributorsClient />;
}
