import { Metadata } from 'next';
import LiveLoader from './LiveLoader';

export const metadata: Metadata = {
  title: 'Latest Signal Feed | TradeClaw',
  description: 'Latest available rule-generated signal candidates across supported assets, with an embeddable read-only widget.',
  keywords: ['trading signal research', 'bitcoin indicators', 'forex indicators', 'embeddable widget'],
  openGraph: {
    title: 'TradeClaw — Latest Signal Feed',
    description: 'Latest available rule-generated signal candidates in a read-only embeddable feed.',
    type: 'website',
  },
};

export default function LivePage() {
  return <LiveLoader />;
}
