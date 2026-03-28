import type { Metadata } from 'next';
import { LaunchClient } from './LaunchClient';

export const metadata: Metadata = {
  title: 'Product Hunt Launch — TradeClaw',
  description:
    'TradeClaw is launching on Product Hunt. Self-hosted AI trading signal platform — real-time signals, backtesting, paper trading, Telegram alerts. MIT licensed. Deploy in 5 min.',
  openGraph: {
    title: 'TradeClaw is launching on Product Hunt',
    description:
      'Self-hosted AI trading signals, free forever. RSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. MIT licensed. Docker deploy in 5 minutes.',
    type: 'website',
  },
};

export default function LaunchPage() {
  return <LaunchClient />;
}
