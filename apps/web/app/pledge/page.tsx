import type { Metadata } from 'next';
import PledgeClient from './PledgeClient';

export const metadata: Metadata = {
  title: 'Feature Request Pledges | TradeClaw',
  description:
    'Record interest in proposed TradeClaw features. Pledges and star thresholds are not scope, priority, or delivery commitments.',
  robots: { index: false, follow: false },
};

export default function PledgePage() {
  return <PledgeClient />;
}
