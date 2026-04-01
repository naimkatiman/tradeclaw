import type { Metadata } from 'next';
import JournalLoader from './JournalLoader';

export const metadata: Metadata = {
  title: 'Trade Journal — TradeClaw',
  description:
    'Log and review your trades with AI signal context. Track win rate, P&L, and weekly performance. Export your trade history.',
  openGraph: {
    title: 'Trade Journal — TradeClaw',
    description: 'Log trades enriched with live TradeClaw signal data. Track your edge.',
  },
};

export default function JournalPage() {
  return <JournalLoader />;
}
