import type { Metadata } from 'next';
import RoastClient from './RoastClient';

export const metadata: Metadata = {
  title: 'Roast My Strategy | TradeClaw',
  description:
    'A deterministic text parser that flags strategy-rule structure. It does not run a backtest, measure market edge, or estimate portfolio risk.',
  keywords: ['trading strategy text review', 'strategy rule parser', 'strategy critique'],
  openGraph: {
    title: 'Roast My Strategy | TradeClaw',
    description: 'A deterministic strategy text review, not a backtest or performance measurement.',
    url: 'https://tradeclaw.win/roast',
  },
};

export default function RoastPage() {
  return <RoastClient />;
}
