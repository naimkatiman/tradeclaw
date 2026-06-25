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
  title: "Wrapped — TradeClaw's Signal Year in Review | TradeClaw",
  description:
    "TradeClaw's signal year in review — total signals tracked, best pair, accuracy trend, and win streaks, all from real resolved outcomes. Like Spotify Wrapped, but for trading signals.",
  openGraph: {
    title: "TradeClaw Wrapped — The Signal Year in Review",
    description:
      'Total signals tracked, best pair, accuracy trend, win streaks — from real resolved signal history.',
    type: 'website',
  },
};

export default function WrappedPage() {
  return <WrappedClient />;
}
