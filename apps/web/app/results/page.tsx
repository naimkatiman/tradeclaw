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
  title: 'Backtest Results | TradeClaw',
  description: 'Verified backtesting results for 5 trading strategies across BTC, ETH, and Gold. Sharpe ratios, drawdowns, equity curves, and monthly returns.',
  openGraph: {
    title: 'Backtest Results | TradeClaw',
    description: 'Transparent backtest performance: RSI, MACD, EMA, Bollinger, and Multi-TF strategies on crypto and commodities.',
  },
};

export default function ResultsPage() {
  return <ResultsClient />;
}
