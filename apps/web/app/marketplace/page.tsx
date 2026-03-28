import type { Metadata } from 'next';
import { MarketplaceClient } from '../../components/marketplace-client';

export const metadata: Metadata = {
  title: 'Webhook Marketplace — TradeClaw',
  description:
    'Connect TradeClaw trading signals to Notion, Airtable, Zapier, Discord, Slack, Google Sheets, and 6,000+ more apps via webhooks.',
  openGraph: {
    title: 'Webhook Marketplace — TradeClaw',
    description: '12 one-click integrations for routing live trading signals to your favourite tools.',
  },
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
