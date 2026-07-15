import type { Metadata } from 'next';
import { RiskClient } from './RiskClient';

export const metadata: Metadata = {
  title: 'Observed Signal Risk Gate | TradeClaw',
  description:
    'Current gate state derived from recorded OHLCV-resolved signal outcomes, not broker equity or portfolio results.',
  robots: { index: false, follow: false },
};

export default function RiskPage() {
  return <RiskClient />;
}
