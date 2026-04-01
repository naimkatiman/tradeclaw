import { Metadata } from 'next';
import PHLoader from './PHLoader';

export const metadata: Metadata = {
  title: 'TradeClaw on Product Hunt',
  description: 'Discover TradeClaw on Product Hunt — the open-source AI trading signal platform. Upvote, share, and join the launch.',
  keywords: ['product hunt', 'tradeclaw', 'open source', 'trading signals', 'AI trading', 'developer tools'],
  openGraph: {
    title: 'TradeClaw on Product Hunt',
    description: 'Open-source AI trading signals. Upvote TradeClaw on Product Hunt and join the launch.',
    type: 'website',
    url: 'https://tradeclaw.win/producthunt',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClaw on Product Hunt',
    description: 'Open-source AI trading signals. Upvote TradeClaw on Product Hunt.',
  },
};

export default function ProductHuntPage() {
  return <PHLoader />;
}
