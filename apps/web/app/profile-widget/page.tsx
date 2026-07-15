import type { Metadata } from 'next';
import { ProfileWidgetLoader } from './ProfileWidgetLoader';

export const metadata: Metadata = {
  title: 'GitHub Profile Widget — TradeClaw',
  description:
    'Add a read-only TradeClaw signal badge to a GitHub profile README. The badge shows the latest available rule output and source timestamp.',
  openGraph: {
    title: 'GitHub Profile Widget — TradeClaw',
    description: 'Embed the latest available TradeClaw rule output in a GitHub profile README.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function ProfileWidgetPage() {
  return <ProfileWidgetLoader />;
}
