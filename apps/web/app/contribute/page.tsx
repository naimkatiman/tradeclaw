import type { Metadata } from 'next';
<<<<<<< HEAD
import { ContributeClient } from './ContributeClient';
=======
import dynamic from 'next/dynamic';

const ContributeClient = dynamic(() => import('./ContributeClient').then(m => ({ default: m.ContributeClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
>>>>>>> origin/main

export const metadata: Metadata = {
  title: 'Contribute — TradeClaw',
  description:
    'Join contributors building the first open-source AI trading signal platform. Find good first issues, setup guides, and mentorship to make your first PR.',
  openGraph: {
    title: 'Contribute to TradeClaw',
    description:
      'Good first issues, dev setup guide, and mentorship for first-time contributors. Open-source AI trading signals.',
    type: 'website',
  },
};

export default function ContributePage() {
  return <ContributeClient />;
}
