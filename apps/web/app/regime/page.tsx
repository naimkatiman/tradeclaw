import type { Metadata } from 'next';
import { RegimeClient } from './RegimeClient';

export const metadata: Metadata = {
  title: 'Market Regime Monitor — HMM Classification | TradeClaw',
  description:
    'Inspect the latest available regime classifications across supported pairs, including their input timestamp and model confidence.',
  openGraph: {
    title: 'Market Regime Monitor — HMM Classification',
    description:
      'Latest available regime classifications across crypto, forex, and metals, with model confidence and source timestamps.',
  },
};

export default function RegimePage() {
  return <RegimeClient />;
}
