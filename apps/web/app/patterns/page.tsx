import type { Metadata } from 'next';
import PatternsLoader from './PatternsLoader';

export const metadata: Metadata = {
  title: 'Trading Pattern Library | TradeClaw',
  description:
    'Explore 12 classic trading patterns — RSI Divergence, MACD crossovers, Head & Shoulders, Double Top/Bottom, Bollinger Squeeze and more. See which patterns TradeClaw detects automatically.',
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
    title: 'Trading Pattern Library | TradeClaw',
    description: '12 classic technical patterns with animated diagrams, reliability scores, and TradeClaw signal detection status.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function PatternsPage() {
  return <PatternsLoader />;
}
