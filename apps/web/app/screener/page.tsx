import type { Metadata } from 'next';
import ScreenerClient from './ScreenerClient';

export const metadata: Metadata = {
  title: 'Asset Screener — TradeClaw',
  description: 'Scan all forex, crypto, and metals assets for setups matching your custom RSI, MACD, EMA, and confidence criteria.',
};

export default function ScreenerPage() {
  return <ScreenerClient />;
}
