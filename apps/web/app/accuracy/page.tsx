import type { Metadata } from 'next';
import { AccuracyClient } from './AccuracyClient';

export const metadata: Metadata = {
  title: 'Signal Accuracy | TradeClaw',
  description: 'Verifiable signal accuracy tracker — every signal, every outcome, transparent.',
  openGraph: {
    title: 'Signal Accuracy Tracker | TradeClaw',
    description: 'Public proof of AI trading signal performance. Every signal tracked with timestamps and P&L.',
  },
};

export default function AccuracyPage() {
  return <AccuracyClient />;
}
