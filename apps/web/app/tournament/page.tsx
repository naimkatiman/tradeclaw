import type { Metadata } from 'next';
import TournamentClient from './TournamentClient';

export const metadata: Metadata = {
  title: 'Strategy Tournament — TradeClaw',
  description:
    '5 built-in trading strategies compete in a 90-day backtest league bracket. See which strategy wins the TradeClaw tournament.',
  keywords: ['trading tournament', 'backtest', 'strategy comparison', 'RSI', 'MACD', 'EMA', 'Bollinger Bands'],
  openGraph: {
    title: 'Strategy Tournament — TradeClaw',
    description: '5 strategies battle it out over 90 days. Who wins?',
    url: 'https://tradeclaw.win/tournament',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Tournament — TradeClaw',
    description: '5 strategies battle it out over 90 days. Who wins?',
  },
};

export default function TournamentPage() {
  return <TournamentClient />;
}
