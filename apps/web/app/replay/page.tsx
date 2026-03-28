import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ReplayClient = dynamic(() => import('./ReplayClient'), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Signal Replay — TradeClaw',
  description:
    'Step through historical trading signals with animated price simulation. Watch how RSI, MACD, and EMA played out on BTC, ETH, XAU and more.',
  openGraph: {
    title: 'Signal Replay — TradeClaw',
    description: 'Animated historical signal replay with price simulation.',
    images: ['/api/og'],
  },
};

export default function ReplayPage() {
  return <ReplayClient />;
}
