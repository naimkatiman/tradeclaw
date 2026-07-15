import type { Metadata } from 'next';
import { CardClient } from './CardClient';

export const metadata: Metadata = {
  title: 'Signal Card Generator — TradeClaw',
  description:
    'Create a share card for the latest available TradeClaw rule output, including its score and research-only boundary.',
  openGraph: {
    title: 'Generate Your TradeClaw Signal Card',
    description:
      'Share the latest available rule-generated signal candidate with its source and evidence boundary.',
    type: 'website',
  },
};

export default function CardPage() {
  return <CardClient />;
}
