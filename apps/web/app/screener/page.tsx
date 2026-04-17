import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ScreenerClient = dynamic(() => import('./ScreenerClient'), {
  loading: () => (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Asset Screener — TradeClaw',
  description: 'Scan all forex, crypto, and metals assets for setups matching your custom RSI, MACD, EMA, and confidence criteria.',
};

export default function ScreenerPage() {
  return <ScreenerClient />;
}
