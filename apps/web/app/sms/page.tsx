import type { Metadata } from 'next';
import SmsClient from './SmsClient';

export const metadata: Metadata = {
  title: 'SMS Signal Alerts — TradeClaw',
  description:
    'Get AI-generated trading signals delivered to your phone via SMS. Choose pairs, set confidence thresholds, and receive alerts every 6 hours via Twilio.',
  openGraph: {
    title: 'SMS Signal Alerts — TradeClaw',
    description:
      'Free SMS trading signal alerts. BTC, ETH, XAU, EUR, and more — delivered to your phone every 6 hours.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function SmsPage() {
  return <SmsClient />;
}
