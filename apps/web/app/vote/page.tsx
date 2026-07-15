import type { Metadata } from 'next';
import VoteClient from './VoteClient';

export const metadata: Metadata = {
  title: 'Public Signal Poll | TradeClaw',
  description:
    'Submit a browser-limited BUY, SELL, or HOLD poll response and compare it with the current TradeClaw direction. Counts are unverified submissions, not unique people.',
  robots: { index: false, follow: false },
};

export default function VotePage() {
  return <VoteClient />;
}
