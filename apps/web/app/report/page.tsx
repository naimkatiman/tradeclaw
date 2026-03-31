import { Metadata } from 'next';
import ReportLoader from './ReportLoader';

export const metadata: Metadata = {
  title: 'Weekly Report | TradeClaw',
  description: 'Weekly pulse: signals generated, win rate, top asset, and community stats for TradeClaw open-source trading platform.',
  openGraph: {
    title: 'TradeClaw Weekly Report',
    description: 'Weekly pulse: signals generated, win rate, top asset, and community stats.',
    type: 'website',
  },
};

export default function ReportPage() {
  return <ReportLoader />;
}
