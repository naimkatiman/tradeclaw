import { readHistoryAsync, type SignalHistoryRecord } from '../../lib/signal-history';
import { RSSClient } from './RSSClient';

export const metadata = {
  title: 'RSS Signal Archive — TradeClaw',
  description:
    'Subscribe to available TradeClaw signal records via RSS, Atom, or JSON Feed. Confidence is indicator agreement, not a probability of profit.',
};

export default async function RSSPage() {
  const history = await readHistoryAsync();
  const recentSignals: SignalHistoryRecord[] = history.slice(0, 10);
  return <RSSClient recentSignals={recentSignals} />;
}
