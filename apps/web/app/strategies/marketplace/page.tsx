import type { Metadata } from 'next';
import { MarketplaceClient } from './MarketplaceClient';

export const metadata: Metadata = {
  title: 'Strategy Template Catalog — TradeClaw',
  description:
    'Browse illustrative strategy templates and load their editable blocks into the Strategy Builder. No community reviews or measured performance are attached.',
  openGraph: {
    title: 'Strategy Template Catalog — TradeClaw',
    description:
      'Illustrative starter templates for the TradeClaw Strategy Builder, without invented reviews or performance claims.',
    type: 'website',
  },
};

export default function StrategyMarketplacePage() {
  return <MarketplaceClient />;
}
