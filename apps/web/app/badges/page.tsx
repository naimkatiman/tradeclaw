<<<<<<< HEAD
import type { Metadata } from 'next';
import { BadgesClient } from '../../components/badges-client';

export const metadata: Metadata = {
  title: 'Live Signal Badges | TradeClaw',
  description:
    'Embed live BTC, ETH, Gold and forex signal badges directly in your GitHub README or website. Auto-refreshing SVG badges powered by real technical analysis.',
};

export default function BadgesPage() {
  return <BadgesClient />;
=======
import { redirect } from 'next/navigation';

export default function BadgesRedirect() {
  redirect('/badge');
>>>>>>> origin/main
}
