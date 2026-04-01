import type { Metadata } from 'next';
import VoteClient from './VoteClient';

export const metadata: Metadata = {
  title: 'Community Signal Vote | TradeClaw',
  description:
    'Vote on trading signals for BTC, ETH, Gold, Forex and more. See what the TradeClaw community thinks — BUY, SELL, or HOLD.',
  keywords: [
    'trading signals vote',
    'community sentiment',
    'crypto vote',
    'forex poll',
    'TradeClaw community',
    'BTC sentiment',
    'trading poll',
  ],
  openGraph: {
    title: 'Community Signal Vote | TradeClaw',
    description:
      'What does the community think? Vote BUY, SELL, or HOLD on 10 major assets and compare with TradeClaw AI signals.',
  },
};

export default function VotePage() {
  return <VoteClient />;
}
