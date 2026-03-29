import type { Metadata } from 'next';
import RoastClient from './RoastClient';

export const metadata: Metadata = {
  title: 'Roast My Strategy | TradeClaw',
  description:
    'Paste your trading strategy and get brutal AI feedback — risk score, edge assessment, strengths, weaknesses, and actionable improvements.',
  keywords: ['trading strategy review', 'strategy critique', 'AI trading feedback', 'risk score', 'strategy analyzer'],
  openGraph: {
    title: 'Roast My Strategy | TradeClaw',
    description: 'We roast your strategy so the market doesn\'t have to.',
    url: 'https://tradeclaw.win/roast',
  },
};

export default function RoastPage() {
  return <RoastClient />;
}
