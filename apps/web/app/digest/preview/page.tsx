import type { Metadata } from 'next';
import { DigestPreviewClient } from './DigestPreviewClient';

export const metadata: Metadata = {
  title: 'Daily Digest Preview — TradeClaw',
  description:
    'Preview today\u2019s top-3 trading signal digest that gets auto-posted to your Telegram channel at 08:00 UTC daily.',
  openGraph: {
    title: 'Daily Telegram Digest Preview — TradeClaw',
    description:
      'See today\u2019s top-3 signals formatted for Telegram with confidence bars, entry/TP/SL, and send directly to your channel.',
    type: 'website',
  },
};

export default function DigestPreviewPage() {
  return <DigestPreviewClient />;
}
