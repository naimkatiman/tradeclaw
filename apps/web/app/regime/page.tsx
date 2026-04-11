import type { Metadata } from 'next';
import { RegimeClient } from './RegimeClient';

export const metadata: Metadata = {
  title: 'Market Regime Monitor — HMM Classification | TradeClaw',
  description:
    'Real-time Hidden Markov Model regime classification across all trading pairs. Track crash, bear, neutral, bull, and euphoria states.',
  openGraph: {
    title: 'Market Regime Monitor — HMM Classification',
    description:
      'Real-time HMM regime classification across crypto, forex, and metals. Monitor market states and confidence levels.',
  },
};

export default function RegimePage() {
  return <RegimeClient />;
}
