import type { Metadata } from 'next';
import DeveloperClient from './DeveloperClient';

export const metadata: Metadata = {
  title: 'Developer API — TradeClaw',
  description:
    'Get a free API key for the TradeClaw signal API. Access live trading signals, leaderboard, prices, and more via REST — everything is free.',
  openGraph: {
    title: 'TradeClaw Developer API — Free API Keys',
    description: 'Free API access to live trading signals. No credit card needed.',
    images: ['/api/og'],
  },
};

export default function DeveloperPage() {
  return <DeveloperClient />;
}
