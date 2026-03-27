import type { Metadata } from 'next';
import { StarsClient } from './StarsClient';

export const metadata: Metadata = {
  title: 'TradeClaw GitHub Stars — Track Our Journey to 1,000 Stars',
  description:
    'Watch TradeClaw grow in real time. Live star counter, milestone celebrations, progress toward 1,000 stars, and features that unlock along the way.',
  openGraph: {
    title: 'TradeClaw Stars — Join the Journey to 1,000',
    description:
      'Live star count, growth chart, milestone unlocks, and share tools. Help TradeClaw reach 1,000 GitHub stars and unlock free managed cloud, mobile app, and enterprise features.',
    type: 'website',
  },
};

export default function StarsPage() {
  return <StarsClient />;
}
