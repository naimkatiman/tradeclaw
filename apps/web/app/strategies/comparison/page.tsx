import type { Metadata } from 'next';
import { ComparisonClient } from './ComparisonClient';

export const metadata: Metadata = {
  title: 'Strategy Comparison — TradeClaw',
  description:
    'Compare TradeClaw strategy labels within the recorded, OHLCV-resolved signal cohort. Results are not broker fills or customer-account returns.',
  openGraph: {
    title: 'Strategy Comparison — TradeClaw',
    description:
      'Recorded-signal study by strategy label, with period and sample counts. Not live execution or portfolio performance.',
    type: 'website',
  },
};

export default function StrategyComparisonPage() {
  return <ComparisonClient />;
}
