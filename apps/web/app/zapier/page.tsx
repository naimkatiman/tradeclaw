import { Metadata } from 'next';
import ZapierClient from './ZapierClient';

export const metadata: Metadata = {
  title: 'Zapier Webhook Setup Guide | TradeClaw',
  description:
    'Manual setup recipes for routing authenticated, evidence-gated TradeClaw webhook deliveries into Zapier. TradeClaw has no native Zapier app or automatic every-signal trigger.',
  openGraph: {
    title: 'TradeClaw and Zapier Webhook Guide',
    description:
      'Use Webhooks by Zapier as an operator-configured destination. Recipes are examples, not a native Zapier integration.',
  },
};

export default function ZapierPage() {
  return <ZapierClient />;
}
