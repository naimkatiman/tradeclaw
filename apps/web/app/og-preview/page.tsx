import type { Metadata } from 'next';
import { OGPreviewClient } from './OGPreviewClient';

export const metadata: Metadata = {
  title: 'OG Preview Generator — TradeClaw',
  description:
    'Generate a custom Open Graph social card with your name, favourite trading pair, and live AI signal. Share on Twitter, LinkedIn, or Reddit to grow the TradeClaw community.',
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
