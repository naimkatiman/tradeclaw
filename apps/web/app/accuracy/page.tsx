import type { Metadata } from 'next';
import { AccuracyClient } from './AccuracyClient';

export const metadata: Metadata = {
  title: 'Signal Accuracy | TradeClaw',
  description: 'Recorded signal accuracy tracker with outcomes resolved against provider OHLCV and population exclusions disclosed.',
  openGraph: {
    title: 'Signal Accuracy Tracker | TradeClaw',
    description: 'Public recorded-signal study with timestamps and OHLCV-resolved price outcomes; not broker fills or account P&L.',
  },
};

export default function AccuracyPage() {
  return <AccuracyClient />;
}
