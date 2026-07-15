import type { Metadata } from 'next';
import APIUsageClient from './APIUsageClient';

export const metadata: Metadata = {
  title: 'API Usage Dashboard — TradeClaw',
  description:
    'Look up recorded TradeClaw API usage, configured rate limits, and scope access for a specific API key.',
  openGraph: {
    title: 'API Usage Dashboard — TradeClaw',
    description:
      'Recorded API usage, configured rate limits, and scope access for a supplied key.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function APIUsagePage() {
  return <APIUsageClient />;
}
