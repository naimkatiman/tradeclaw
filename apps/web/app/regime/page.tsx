import type { Metadata } from 'next';
import { RegimeClient } from './RegimeClient';

export const metadata: Metadata = {
  title: 'Market Regime Monitor — HMM Classification | TradeClaw',
  description:
    'Live Hidden Markov Model regime classification across all trading pairs (refreshed every 5 minutes). Track trend, volatile, and range states.',
  openGraph: {
    title: 'Market Regime Monitor — HMM Classification',
    description:
      'Live HMM regime classification across crypto, forex, and metals on a 5-minute cadence. Monitor market states and confidence levels.',
  },
};

export default function RegimePage() {
  return <RegimeClient />;
}
