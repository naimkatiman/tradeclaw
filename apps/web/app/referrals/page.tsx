import type { Metadata } from 'next';
import { ReferralsClient } from './ReferralsClient';

export const metadata: Metadata = {
  title: 'Referrals — TradeClaw Affiliate Dashboard',
  description:
    'Track your TradeClaw referrals, earnings, and revenue share. Earn 20% for every Pro or Elite subscriber you refer.',
  openGraph: {
    title: 'Referrals — TradeClaw Affiliate Dashboard',
    description:
      'Track your TradeClaw referrals, earnings, and revenue share. Earn 20% for every Pro or Elite subscriber you refer.',
  },
};

export default function ReferralsPage() {
  return <ReferralsClient />;
}
