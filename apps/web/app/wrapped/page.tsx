import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const WrappedClient = dynamic(
  () => import('./WrappedClient').then(m => ({ default: m.WrappedClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Wrapped — Your Trading Year in Review | TradeClaw',
  description:
    'See your trading year in review — total signals, best pair, accuracy trend, win streaks, and more. Like Spotify Wrapped, but for trading.',
  openGraph: {
    title: 'TradeClaw Wrapped — Your Trading Year in Review',
    description:
      'Total signals, best pair, accuracy trend, win streaks. Your year in trading, beautifully summarized.',
    type: 'website',
  },
};

export default function WrappedPage() {
  return <WrappedClient />;
}
