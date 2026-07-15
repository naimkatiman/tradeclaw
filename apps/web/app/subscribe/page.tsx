import type { Metadata } from 'next';
import SubscribeLoader from './SubscribeLoader';

export const metadata: Metadata = {
  title: 'Weekly Signal Digest | TradeClaw',
  description: 'Save digest preferences for TradeClaw rule-generated market research. Delivery depends on the deployment email and scheduler configuration.',
  openGraph: {
    title: 'Weekly Signal Digest | TradeClaw',
    description: 'Save pair, frequency, and minimum rule-score preferences for an operator-configured digest.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function SubscribePage() {
  return <SubscribeLoader />;
}
