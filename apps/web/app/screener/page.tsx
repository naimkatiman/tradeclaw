import type { Metadata } from 'next';
<<<<<<< HEAD
import ScreenerClient from './ScreenerClient';
=======
import dynamic from 'next/dynamic';

const ScreenerClient = dynamic(() => import('./ScreenerClient'), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
>>>>>>> origin/main

export const metadata: Metadata = {
  title: 'Asset Screener — TradeClaw',
  description: 'Scan all forex, crypto, and metals assets for setups matching your custom RSI, MACD, EMA, and confidence criteria.',
};

export default function ScreenerPage() {
  return <ScreenerClient />;
}
