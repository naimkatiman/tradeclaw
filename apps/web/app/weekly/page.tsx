import type { Metadata } from 'next';
import WeeklyClient from './WeeklyClient';

export const metadata: Metadata = {
  title: 'Weekly Signal Outcome Study | TradeClaw',
  description:
    'Weekly digest of canonical counted signal outcomes derived from OHLCV. Results are signal-level research, not broker fills, customer trades, or portfolio P/L.',
  keywords: ['weekly trading signals', 'signal digest', 'OHLCV signal outcomes', 'signal methodology'],
  openGraph: {
    title: 'Weekly Signal Outcome Study | TradeClaw',
    description:
      'Counted OHLCV-derived signal outcomes for the current UTC week; not broker fills or portfolio performance.',
    url: 'https://tradeclaw.win/weekly',
  },
};

export default function WeeklyPage() {
  return <WeeklyClient />;
}
