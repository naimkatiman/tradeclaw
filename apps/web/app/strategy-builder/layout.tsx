import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategy Builder — TradeClaw',
  description: 'Build your own trading strategy with RSI, MACD, EMA, and custom confluence rules. Backtest against real OHLCV data.',
};

export default function StrategyBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
