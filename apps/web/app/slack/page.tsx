import type { Metadata } from 'next';
import { SlackClient } from './SlackClient';

export const metadata: Metadata = {
  title: 'Slack Integration — TradeClaw',
  description:
    'Receive real-time AI trading signal alerts directly in your Slack channels via incoming webhooks.',
  openGraph: {
    title: 'Slack Integration — TradeClaw',
    description: 'Get TradeClaw trading signals delivered to Slack in real-time.',
    type: 'website',
  },
};

export default function SlackPage() {
  return <SlackClient />;
}
