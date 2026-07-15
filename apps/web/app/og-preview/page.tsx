import type { Metadata } from 'next';
import { OGPreviewClient } from './OGPreviewClient';

export const metadata: Metadata = {
  title: 'Signal Candidate Card Generator | TradeClaw',
  description:
    'Create a social card only when the TradeClaw signal API returns a rule-scored candidate. Unavailable data is never replaced with synthetic values.',
  openGraph: {
    title: 'Create a TradeClaw Signal Candidate Card',
    description:
      'Personalised 1200x630 cards sourced from available signal API candidates, with explicit limitations and no synthetic fallback.',
    type: 'website',
  },
};

export default function OGPreviewPage() {
  return <OGPreviewClient />;
}
