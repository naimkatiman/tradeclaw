import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paper Trading — TradeClaw',
  description: 'Run a local simulation against available market-price snapshots. Results are modeled and do not reproduce broker fills, liquidity, or portfolio risk.',
};

export default function PaperTradingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
