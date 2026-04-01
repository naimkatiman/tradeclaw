import { Metadata } from 'next';
import { NotionSignalsClient } from './NotionSignalsClient';

export const metadata: Metadata = {
  title: 'Notion Signal Sync — TradeClaw',
  description:
    'Sync TradeClaw trading signals directly to your Notion database. One-click push with live status, filters, and setup guide.',
  openGraph: {
    title: 'Notion Signal Sync — TradeClaw',
    description: 'Push live trading signals to Notion with one click.',
  },
};

export default function NotionSignalsPage() {
  return <NotionSignalsClient />;
}
