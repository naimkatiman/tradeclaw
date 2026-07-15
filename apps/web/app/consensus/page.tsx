import type { Metadata } from 'next';
import ConsensusClient from './ConsensusClient';

export const metadata: Metadata = {
  title: 'H1 + H4 Signal Distribution — TradeClaw',
  description: 'Available BUY/SELL signal-direction counts derived from observed OHLCV for H1 and H4. Missing records are left unavailable, not estimated.',
  keywords: ['market consensus', 'buy sell ratio', 'signal consensus', 'market bias', 'bullish bearish', 'trading signals'],
  openGraph: {
    title: 'H1 + H4 Signal Distribution — TradeClaw',
    description: 'Observed-data-derived signal counts with explicit empty and partial-source states.',
    url: 'https://tradeclaw.win/consensus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'H1 + H4 Signal Distribution — TradeClaw',
    description: 'Observed-data-derived signal counts; missing records are not synthesized.',
  },
};

export default function ConsensusPage() {
  return <ConsensusClient />;
}
