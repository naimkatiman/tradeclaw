import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategy Rules — TradeClaw',
  description: 'Build nested trading rules with AND / OR groups and preview the result against sample market snapshots.',
};

export default function StrategyRulesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
