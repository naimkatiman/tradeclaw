import type { Metadata } from 'next';
import IndicatorBuilderLoader from './IndicatorBuilderLoader';

export const metadata: Metadata = {
  title: 'Custom Indicator Builder | TradeClaw',
  description:
    'Build custom trading indicators by combining RSI, MACD, EMA, and more. Test live against candle data, save as a plugin, and share with a URL.',
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
      'Visual formula editor for trading indicators — test live, save as plugin, share with URL.',
    type: 'website',
  },
};

export default function IndicatorBuilderPage() {
  return <IndicatorBuilderLoader />;
}
