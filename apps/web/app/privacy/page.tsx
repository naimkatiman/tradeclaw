import type { Metadata } from 'next';
import { PrivacyClient } from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy | TradeClaw',
  description:
    'TradeClaw Privacy Policy — minimal data collection, no tracking cookies, self-hosting sovereignty, and third-party disclosures.',
  openGraph: {
    title: 'Privacy Policy | TradeClaw',
    description:
      'TradeClaw Privacy Policy — minimal data collection, no tracking cookies, self-hosting sovereignty, and third-party disclosures.',
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
