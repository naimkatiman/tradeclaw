import type { Metadata } from 'next';
import { CorrelationClient } from './CorrelationClient';

export const metadata: Metadata = {
  title: 'Cross-Asset Correlation | TradeClaw',
  description: 'Live Pearson correlation heatmap across forex, crypto, and commodities. Identify diversification opportunities and correlated pairs.',
  openGraph: {
    title: 'Cross-Asset Correlation | TradeClaw',
    description: 'Real-time correlation matrix: BTC, ETH, gold, silver, EUR/USD, GBP/USD, and more.',
  },
};

export default function CorrelationPage() {
  return <CorrelationClient />;
}
