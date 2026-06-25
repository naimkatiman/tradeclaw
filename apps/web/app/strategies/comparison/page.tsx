import type { Metadata } from 'next';
import { ComparisonClient } from './ComparisonClient';

export const metadata: Metadata = {
  title: 'Strategy Comparison — TradeClaw',
  description:
    'Compare TradeClaw strategies by real win rate, risk:reward ratio, and Sharpe ratio. See which algorithm performs best on live tracked signals.',
  openGraph: {
    title: 'Strategy Comparison — TradeClaw',
    description:
      'Live strategy performance comparison: win rate, R:R, and Sharpe ratio for every TradeClaw algorithm.',
    type: 'website',
  },
};

export default function StrategyComparisonPage() {
  return <ComparisonClient />;
}
