import type { Metadata } from 'next';
import { AllocationClient } from './AllocationClient';

export const metadata: Metadata = {
  title: 'Allocation Strategy — Regime-Based Position Sizing | TradeClaw',
  description:
    'Dynamic portfolio allocation based on HMM regime classification. View exposure limits, leverage rules, and position sizing per market state.',
  openGraph: {
    title: 'Allocation Strategy — Regime-Based Position Sizing',
    description:
      'Dynamic portfolio allocation driven by HMM regime detection. Exposure limits, leverage, and position sizing at a glance.',
  },
};

export default function AllocationPage() {
  return <AllocationClient />;
}
