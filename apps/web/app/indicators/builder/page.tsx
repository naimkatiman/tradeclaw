import type { Metadata } from 'next';
import IndicatorBuilderLoader from './IndicatorBuilderLoader';

export const metadata: Metadata = {
  title: 'Custom Indicator Builder | TradeClaw',
  description:
    'Build visual indicator formulas and inspect them against a fixed deterministic fixture. Results are illustrative, not live data or backtest performance.',
  keywords: [
    'custom indicator',
    'indicator builder',
    'trading formula',
    'RSI MACD EMA',
    'tradeclaw plugin',
    'open source trading',
  ],
  openGraph: {
    title: 'Custom Indicator Builder | TradeClaw',
    description:
      'Visual formula editor with a deterministic illustrative fixture and a clearly marked non-running plugin scaffold.',
    type: 'website',
  },
};

export default function IndicatorBuilderPage() {
  return <IndicatorBuilderLoader />;
}
