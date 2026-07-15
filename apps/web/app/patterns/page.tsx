import type { Metadata } from 'next';
import PatternsLoader from './PatternsLoader';

export const metadata: Metadata = {
  title: 'Educational Pattern Reference | TradeClaw',
  description:
    'Educational reference for 12 classic technical-analysis patterns. Reliability is unmeasured and no live pattern detector backs the catalog.',
  keywords: [
    'trading patterns',
    'RSI divergence',
    'MACD crossover',
    'head and shoulders',
    'double bottom',
    'bollinger band squeeze',
    'technical analysis patterns',
    'candlestick patterns',
  ],
  openGraph: {
    title: 'Educational Pattern Reference | TradeClaw',
    description: 'Illustrative technical-analysis diagrams and textbook interpretations, with no measured reliability or live detector claims.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function PatternsPage() {
  return <PatternsLoader />;
}
