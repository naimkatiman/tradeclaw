import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategies — TradeClaw',
  description: 'Live trading strategies with per-strategy performance — win rate, profit factor, Sharpe, and drawdown.',
};

export default function StrategiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
