import type { Metadata } from 'next';
import { VsClient } from './VsClient';

export const metadata: Metadata = {
  title: 'TradeClaw vs TradingView — Live Signal Comparison',
  description:
    'Side-by-side live comparison of TradeClaw confluence signals vs basic TradingView Pine Script indicators. Same asset, same time, different depth.',
  openGraph: {
    title: 'TradeClaw vs TradingView — Live Signal Comparison',
    description:
      'See what TradeClaw gives you that TradingView cannot. Live side-by-side signal comparison.',
  },
};

export default function VsTradingViewPage() {
  return <VsClient />;
}
