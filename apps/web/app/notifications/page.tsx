import type { Metadata } from 'next';
import NotificationsLoader from './NotificationsLoader';

export const metadata: Metadata = {
  title: 'Signal Notifications | TradeClaw',
  description: 'Configure best-effort browser notifications for eligible signal candidates, with pair, score, and direction filters.',
  openGraph: {
    title: 'Signal Notifications | TradeClaw',
    description: 'Configure best-effort push delivery for signal candidates that pass the active publication gates.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function NotificationsPage() {
  return <NotificationsLoader />;
}
