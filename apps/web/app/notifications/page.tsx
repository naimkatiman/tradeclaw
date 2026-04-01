import type { Metadata } from 'next';
import NotificationsLoader from './NotificationsLoader';

export const metadata: Metadata = {
  title: 'Signal Notifications | TradeClaw',
  description: 'Enable browser push notifications for real-time trading signals. Configure per-pair alerts, confidence thresholds, and direction filters.',
  openGraph: {
    title: 'Signal Notifications | TradeClaw',
    description: 'Get instant push notifications when high-confidence trading signals fire.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function NotificationsPage() {
  return <NotificationsLoader />;
}
