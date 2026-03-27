import type { Metadata } from 'next';
import { ContributeClient } from './ContributeClient';

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
