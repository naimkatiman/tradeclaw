import type { Metadata } from 'next';
import TournamentClient from './TournamentClient';

export const metadata: Metadata = {
  title: 'Strategy Tournament — TradeClaw',
  description:
    'Five illustrative strategy profiles in a deterministic synthetic tournament fixture. Values are generated, not historical performance.',
  keywords: ['synthetic strategy fixture', 'UI demonstration', 'RSI', 'MACD', 'EMA', 'Bollinger Bands'],
  openGraph: {
    title: 'Strategy Tournament — TradeClaw',
    description: 'A deterministic synthetic UI fixture, not a historical backtest or measured performance.',
    url: 'https://tradeclaw.win/tournament',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Tournament — TradeClaw',
    description: 'A deterministic synthetic UI fixture, not a historical backtest or measured performance.',
  },
  robots: { index: false, follow: false },
};

export default function TournamentPage() {
  return <TournamentClient />;
}
