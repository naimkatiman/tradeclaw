import type { Metadata } from 'next';
import { ProfileWidgetLoader } from './ProfileWidgetLoader';

export const metadata: Metadata = {
  title: 'GitHub Profile Widget — TradeClaw',
  description:
    'Add live AI trading signals to your GitHub profile README. Dynamic SVG badge showing real-time BUY/SELL direction, confidence, and entry price.',
  openGraph: {
    title: 'GitHub Profile Widget — TradeClaw',
    description: 'Embed live trading signals in your GitHub profile README with one line of Markdown.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function ProfileWidgetPage() {
  return <ProfileWidgetLoader />;
}
