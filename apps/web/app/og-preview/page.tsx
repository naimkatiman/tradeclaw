import type { Metadata } from 'next';
import { OGPreviewClient } from './OGPreviewClient';

export const metadata: Metadata = {
  title: 'OG Preview Generator — TradeClaw',
  description:
    'Create your TradeClaw signal card — share AI trading signals on social media',
  openGraph: {
    title: 'Create Your TradeClaw Signal Preview Card',
    description:
      'Personalised 1200×630 trading signal cards powered by live AI analysis. Pick a pair, customise your card, and share the link — your preview image auto-updates.',
    type: 'website',
  },
};

export default function OGPreviewPage() {
  return <OGPreviewClient />;
}
