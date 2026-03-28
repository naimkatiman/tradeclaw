import type { Metadata } from 'next';
import { HeatmapClient } from './HeatmapClient';

export const metadata: Metadata = {
  title: 'Signal Heatmap — Live BUY/SELL Visualization | TradeClaw',
  description:
    'Real-time global signal heatmap across 10 major trading pairs. See BUY/SELL signals, confidence levels, RSI and MACD at a glance.',
  openGraph: {
    title: 'Signal Heatmap — Live BUY/SELL Visualization',
    description:
      'Real-time BUY/SELL signal heatmap across crypto, forex, and commodities. Confidence bars, RSI, MACD — all in one view.',
  },
};

export default function HeatmapPage() {
  return <HeatmapClient />;
}
