import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paper Trading — TradeClaw',
  description: 'Practice live signals risk-free. Paper trading with real-time prices and realistic slippage.',
};

export default function PaperTradingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
