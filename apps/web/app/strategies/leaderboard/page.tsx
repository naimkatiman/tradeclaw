import type { Metadata } from 'next';
import { LeaderboardClient } from './LeaderboardClient';

export const metadata: Metadata = {
  title: 'Strategy Leaderboard — TradeClaw',
  description:
    'Strategy definitions and evidence status. TradeClaw does not publish a ranking until measured backtest or live-execution results are connected.',
  openGraph: {
    title: 'Strategy Leaderboard — TradeClaw',
    description:
      'TradeClaw strategy definitions remain unranked until reproducible measured results and their source are connected.',
    type: 'website',
  },
};

export default function StrategyLeaderboardPage() {
  return <LeaderboardClient />;
}
