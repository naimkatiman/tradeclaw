import type { Metadata } from 'next';
import { CompareClient } from './CompareClient';

export const metadata: Metadata = {
  title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta — Open Source Signal Platform Comparison',
  description:
    'Compare TradeClaw against TradingView, TA-Lib, pandas-ta, and 3Commas. See why developers choose TradeClaw: open-source, self-hosted, free REST API, Docker deploy, and AI-powered signals for Forex, Crypto & Commodities.',
  openGraph: {
    title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta — Open Source Signal Platform Comparison',
    description:
      'The definitive comparison: open-source self-hosted trading signals vs locked-in SaaS and low-level libraries. TradeClaw is free, MIT-licensed, Docker-deployable.',
    type: 'website',
    images: ['/api/og'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta',
    description:
      'Open-source self-hosted trading signal platform. Free forever. Docker in 30 seconds.',
    images: ['/api/og'],
  },
};

export default function ComparePage() {
  return <CompareClient />;
}
