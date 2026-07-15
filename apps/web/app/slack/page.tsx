import type { Metadata } from 'next';
import { SlackClient } from './SlackClient';

export const metadata: Metadata = {
  title: 'Slack Webhook Manager | TradeClaw',
  description:
    'Configure and manually test an operator-managed Slack incoming webhook. This standalone manager is not connected to the automatic signal cron.',
  openGraph: {
    title: 'Slack Webhook Manager | TradeClaw',
    description:
      'Manual Slack incoming-webhook configuration and test delivery; automatic cron fan-out is not implemented for this manager.',
    type: 'website',
  },
};

export default function SlackPage() {
  return <SlackClient />;
}
