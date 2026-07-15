import type { Metadata } from 'next';
import { MarketplaceClient } from '../../components/marketplace-client';

export const metadata: Metadata = {
  title: 'Webhook Recipe Catalog | TradeClaw',
  description:
    'Review manual outbound-webhook recipes for TradeClaw. These examples are not one-click or native integrations, and some services require a relay or payload transform.',
  openGraph: {
    title: 'Webhook Recipe Catalog | TradeClaw',
    description:
      'Manual setup examples for outbound webhook destinations; no one-click installation or automatic every-signal delivery.',
  },
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
