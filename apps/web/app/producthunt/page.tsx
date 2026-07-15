import { Metadata } from 'next';
import PHLoader from './PHLoader';

export const metadata: Metadata = {
  title: 'TradeClaw Product Hunt Review Kit',
  description: 'Review evidence-aware Product Hunt draft copy for TradeClaw before publishing or sharing it.',
  keywords: ['product hunt', 'tradeclaw', 'open source', 'trading signals', 'AI trading', 'developer tools'],
  openGraph: {
    title: 'TradeClaw Product Hunt Review Kit',
    description: 'Draft launch copy for MIT-licensed, self-hostable trading-signal software. Verify before publishing.',
    type: 'website',
    url: 'https://tradeclaw.win/producthunt',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClaw Product Hunt Review Kit',
    description: 'Review TradeClaw launch copy and external links before publishing.',
  },
};

export default function ProductHuntPage() {
  return <PHLoader />;
}
