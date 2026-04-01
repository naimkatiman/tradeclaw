import type { Metadata } from 'next';
import SubscribeLoader from './SubscribeLoader';

export const metadata: Metadata = {
  title: 'Weekly Signal Digest | TradeClaw',
  description: 'Get top AI-generated trading signals delivered to your inbox every week. Choose your pairs, set confidence thresholds, and never miss a high-conviction signal.',
  openGraph: {
    title: 'Weekly Signal Digest | TradeClaw',
    description: 'Free weekly email with top BUY/SELL signals, accuracy stats, and leaderboard highlights.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function SubscribePage() {
  return <SubscribeLoader />;
}
