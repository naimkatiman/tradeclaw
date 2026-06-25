import type { Metadata } from 'next';
import { TermsClient } from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms of Service | TradeClaw',
  description:
    'TradeClaw Terms of Service — not financial advice, risk disclosure, subscription terms, and liability limitations.',
  openGraph: {
    title: 'Terms of Service | TradeClaw',
    description:
      'TradeClaw Terms of Service — not financial advice, risk disclosure, subscription terms, and liability limitations.',
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
