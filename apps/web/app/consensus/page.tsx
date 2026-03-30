import type { Metadata } from 'next';
import ConsensusClient from './ConsensusClient';

export const metadata: Metadata = {
  title: 'Market Consensus — TradeClaw',
  description: 'Real-time buy/sell signal consensus across all tracked forex, crypto, and metals assets. See which direction the market is leaning right now.',
  keywords: ['market consensus', 'buy sell ratio', 'signal consensus', 'market bias', 'bullish bearish', 'trading signals'],
  openGraph: {
    title: 'Market Consensus — TradeClaw',
    description: 'Real-time buy/sell signal consensus across all tracked forex, crypto, and metals assets.',
    url: 'https://tradeclaw.win/consensus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Consensus — TradeClaw',
    description: 'Real-time buy/sell signal consensus across all tracked forex, crypto, and metals assets.',
  },
};

export default function ConsensusPage() {
  return <ConsensusClient />;
}
