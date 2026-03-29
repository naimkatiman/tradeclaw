import type { Metadata } from 'next';
import { EmailDigestClient } from './EmailDigestClient';

export const metadata: Metadata = {
  title: 'Email Digest — TradeClaw',
  description:
    'Preview and download the weekly TradeClaw signal digest email. Copy HTML for Mailchimp, ConvertKit, or any email platform.',
  openGraph: {
    title: 'Weekly Signal Digest — TradeClaw',
    description:
      'AI-powered trading signal digest. Dark-themed email template with top signals, accuracy stats, and leaderboard.',
    type: 'website',
  },
};

export default function EmailDigestPage() {
  return <EmailDigestClient />;
}
