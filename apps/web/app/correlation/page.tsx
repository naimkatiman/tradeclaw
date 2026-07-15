import type { Metadata } from 'next';
import { CorrelationClient } from './CorrelationClient';

export const metadata: Metadata = {
  title: 'Cross-Asset Correlation | TradeClaw',
  description: 'Pearson correlation of aligned provider-backed hourly log returns. No synthetic or zero-filled fallback matrix.',
  openGraph: {
    title: 'Cross-Asset Correlation | TradeClaw',
    description: 'Observed-source correlation matrix with aligned timestamps, sample size, and provider provenance.',
  },
};

export default function CorrelationPage() {
  return <CorrelationClient />;
}
