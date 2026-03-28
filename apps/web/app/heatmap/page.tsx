import type { Metadata } from 'next';
import HeatmapClient from './HeatmapClient';

export const metadata: Metadata = {
  title: 'Global Signal Heatmap — Live Trading Signals | TradeClaw',
  description:
    'Real-time treemap visualization of AI-generated trading signals across crypto, forex, commodities and indices. See market sentiment at a glance.',
  openGraph: {
    title: 'Global Signal Heatmap — Live Trading Signals',
    description:
      'Bloomberg-style heatmap of AI trading signals across 20 global assets. BUY/SELL confidence, RSI, MACD — all in one view.',
  },
};

export default function HeatmapPage() {
  return <HeatmapClient />;
}
