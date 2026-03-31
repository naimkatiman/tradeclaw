import { Metadata } from 'next';
import LiveLoader from './LiveLoader';

export const metadata: Metadata = {
  title: 'Live Signal Feed | TradeClaw',
  description: 'Real-time trading signals across BTC, ETH, XAU, EUR, GBP and more. Embeddable widget for your blog or site.',
  keywords: ['live trading signals', 'real-time signals', 'bitcoin signals', 'forex signals', 'embeddable widget'],
  openGraph: {
    title: 'TradeClaw — Live Signal Feed',
    description: 'Real-time AI trading signals. Embed in your blog or site with one script tag.',
    type: 'website',
  },
};

export default function LivePage() {
  return <LiveLoader />;
}
