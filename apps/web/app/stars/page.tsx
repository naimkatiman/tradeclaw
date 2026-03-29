import type { Metadata } from 'next';
<<<<<<< HEAD
import { StarsClient } from './StarsClient';
=======
import dynamic from 'next/dynamic';

const StarsClient = dynamic(() => import('./StarsClient').then(m => ({ default: m.StarsClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
>>>>>>> origin/main

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
