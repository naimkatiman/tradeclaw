import type { Metadata } from 'next';
import StartLoader from './StartLoader';

export const metadata: Metadata = {
  title: 'Get Started — TradeClaw',
  description: 'Interactive 5-step setup guide. Clone, configure, run, see signals, and share TradeClaw in under 5 minutes.',
  openGraph: {
    title: 'Get Started with TradeClaw in 5 Steps',
    description: 'Clone → Configure → Run → See Signals → Share. Self-host your AI trading signal platform in minutes.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function StartPage() {
  return <StartLoader />;
}
