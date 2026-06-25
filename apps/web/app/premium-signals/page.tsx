import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PremiumSignalsClient = dynamic(
  () => import('./PremiumSignalsClient').then(m => ({ default: m.PremiumSignalsClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Premium Signals — TradeClaw',
  description:
    'Exclusive TradingView-sourced premium signals from Zaky\'s personal strategies. Real-time delivery for Pro subscribers.',
  openGraph: {
    title: 'Premium Signals — TradeClaw',
    description: 'TradingView-integrated premium signal feed. Verified track record, real-time delivery.',
    type: 'website',
  },
};

export default function PremiumSignalsPage() {
  return <PremiumSignalsClient />;
}
