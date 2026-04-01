import type { Metadata } from 'next';
import { CommentaryClient } from './CommentaryClient';

export const metadata: Metadata = {
  title: 'Market Commentary | TradeClaw',
  description:
    'Daily AI-generated market commentary with signal consensus, fear & greed index, top movers, and key support/resistance levels.',
  openGraph: {
    title: 'Market Commentary | TradeClaw',
    description:
      'Auto-generated daily market analysis — top movers, signal consensus, fear & greed, key levels.',
  },
};

export default function CommentaryPage() {
  return <CommentaryClient />;
}
