import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Strategies — TradeClaw',
  description: 'Inspectable strategy definitions and recorded-signal studies. OHLCV-resolved outcomes are not broker fills or portfolio performance.',
};

export default function StrategiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
