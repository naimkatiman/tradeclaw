import type { Metadata } from 'next';
import { MarketplaceClient } from './MarketplaceClient';

export const metadata: Metadata = {
  title: 'Strategy Marketplace — TradeClaw',
  description:
    'Browse 20+ community trading strategies and one-click load them into the Strategy Builder. Trend, momentum, reversal, volatility, and volume strategies.',
  openGraph: {
    title: 'Strategy Marketplace — TradeClaw',
    description:
      'Browse 20+ community trading strategies and load them into the Strategy Builder with one click.',
    type: 'website',
  },
};

export default function StrategyMarketplacePage() {
  return <MarketplaceClient />;
}
