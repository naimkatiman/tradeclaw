import type { Metadata } from 'next';
import WeeklyClient from './WeeklyClient';

export const metadata: Metadata = {
  title: 'Signal of the Week | TradeClaw',
  description:
    'Weekly digest of the top 5 AI trading signals — P&L breakdown, accuracy stats, and win-rate trends across forex, crypto, and commodities.',
  keywords: ['weekly trading signals', 'signal digest', 'AI trading performance', 'weekly P&L', 'signal accuracy'],
  openGraph: {
    title: 'Signal of the Week | TradeClaw',
    description: 'Top 5 signals from the past 7 days with P&L breakdown and accuracy stats.',
    url: 'https://tradeclaw.win/weekly',
  },
};

export default function WeeklyPage() {
  return <WeeklyClient />;
}
