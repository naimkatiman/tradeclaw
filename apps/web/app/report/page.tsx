import { Metadata } from 'next';
import ReportLoader from './ReportLoader';

export const metadata: Metadata = {
  title: 'Weekly Report | TradeClaw',
  description: 'Weekly counted signal outcomes resolved against OHLCV. Not broker fills, customer trades, or portfolio returns.',
  openGraph: {
    title: 'TradeClaw Weekly Report',
    description: 'Weekly OHLCV-resolved signal study, not broker or portfolio performance.',
    type: 'website',
  },
};

export default function ReportPage() {
  return <ReportLoader />;
}
