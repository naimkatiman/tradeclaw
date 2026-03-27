import type { Metadata } from 'next';
import ReplayClient from './ReplayClient';

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
