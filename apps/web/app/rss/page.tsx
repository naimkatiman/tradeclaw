import { readHistory, type SignalHistoryRecord } from '../../lib/signal-history';
import { RSSClient } from './RSSClient';

export const metadata = {
  title: 'RSS & Live Feed — TradeClaw',
  description:
    'Subscribe to TradeClaw live trading signals via RSS, Atom, or JSON Feed. Get AI-generated forex, crypto, and metals signals in your favorite RSS reader.',
};

export default function RSSPage() {
  const history = readHistory();
  const recentSignals: SignalHistoryRecord[] = history.slice(0, 10);
  return <RSSClient recentSignals={recentSignals} />;
}
