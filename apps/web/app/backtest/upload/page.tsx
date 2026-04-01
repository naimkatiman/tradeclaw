import type { Metadata } from 'next';
import UploadBacktestLoader from './UploadBacktestLoader';

export const metadata: Metadata = {
  title: 'Upload OHLCV Backtest | TradeClaw',
  description:
    'Upload your own OHLCV CSV data and run TradeClaw signal engine on your own historical price data. Download results as CSV.',
  openGraph: {
    title: 'Upload Your OHLCV Data | TradeClaw Backtest',
    description:
      'Drag-drop a CSV with your own historical price data. TradeClaw runs RSI/MACD/EMA signal detection and shows win rate, P&L, Sharpe, and drawdown.',
    type: 'website',
  },
};

export default function UploadBacktestPage() {
  return <UploadBacktestLoader />;
}
