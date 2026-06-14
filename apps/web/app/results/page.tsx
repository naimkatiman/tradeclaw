import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ResultsClient = dynamic(() => import('./ResultsClient').then(m => ({ default: m.ResultsClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Strategy Profiles (Illustrative) | TradeClaw',
  description: 'Illustrative strategy profiles for 5 trading strategy archetypes across BTC, ETH, and Gold. Hand-authored example metrics — not engine output. See /track-record for live, tracked performance.',
  openGraph: {
    title: 'Strategy Profiles (Illustrative) | TradeClaw',
    description: 'Illustrative examples of RSI, MACD, EMA, Bollinger, and Multi-TF strategy behavior. For real performance, see the live track record.',
  },
};

export default function ResultsPage() {
  return <ResultsClient />;
}
