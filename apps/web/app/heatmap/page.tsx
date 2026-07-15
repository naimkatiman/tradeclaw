import type { Metadata } from 'next';
import { HeatmapClient } from './HeatmapClient';

export const metadata: Metadata = {
  title: 'Signal Heatmap — Live BUY/SELL Visualization | TradeClaw',
  description:
    'Latest available signal heatmap across major trading pairs. Compare rule directions, indicator scores, and source timestamps.',
  openGraph: {
    title: 'Signal Heatmap — Live BUY/SELL Visualization',
    description:
      'Latest available BUY/SELL/HOLD rule outputs across crypto, forex, and commodities, with source timestamps.',
  },
};

export default function HeatmapPage() {
  return <HeatmapClient />;
}
