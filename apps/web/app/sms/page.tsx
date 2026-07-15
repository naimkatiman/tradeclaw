import type { Metadata } from 'next';
import SmsClient from './SmsClient';

export const metadata: Metadata = {
  title: 'SMS Signal Alerts — TradeClaw',
  description:
    'Configure scheduled Twilio SMS delivery for eligible TradeClaw signal records. Confidence is indicator agreement, not a probability of profit.',
  openGraph: {
    title: 'SMS Signal Alerts — TradeClaw',
    description:
      'Configure scheduled Twilio SMS delivery for eligible TradeClaw signal records. Twilio and carrier charges may apply.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function SmsPage() {
  return <SmsClient />;
}
