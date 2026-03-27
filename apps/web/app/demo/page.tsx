import type { Metadata } from 'next';
import DemoClient from './DemoClient';

export const metadata: Metadata = {
  title: 'Live Demo — TradeClaw',
  description:
    'See TradeClaw AI trading signals in action. BTC, ETH, XAUUSD, EURUSD — live confidence updates every 10 seconds. No login required.',
  openGraph: {
    title: 'Live Demo — TradeClaw',
    description: 'AI trading signals for BTC, ETH, XAUUSD, EURUSD. Free. Self-hosted. Open source.',
    images: ['/api/og'],
  },
};

export default function DemoPage() {
  return <DemoClient />;
}
