import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multi-Timeframe Analysis — TradeClaw',
  description: 'Cross-check signal confluence across M5, M15, H1, H4, and D1 timeframes.',
};

export default function MultiTimeframeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
