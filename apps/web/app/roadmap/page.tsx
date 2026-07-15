import type { Metadata } from 'next';
import RoadmapClient from './RoadmapClient';

export const metadata: Metadata = {
  title: 'Proposed Feature Ideas | TradeClaw',
  description:
    'A browser-local idea-ranking board. Items are proposals, votes are not global community totals, and the board is not a delivery commitment.',
  robots: { index: false, follow: false },
};

export default function RoadmapPage() {
  return <RoadmapClient />;
}
