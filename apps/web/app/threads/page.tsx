import type { Metadata } from 'next';
import { ThreadsClient } from '../../components/threads/ThreadsClient';

export const metadata: Metadata = {
  title: 'TradeClaw Tweet Threads — Share the Architecture',
  description:
    'Pre-written viral tweet threads breaking down TradeClaw architecture, signal engine, and deployment. One click to post, zero effort.',
  openGraph: {
    title: 'TradeClaw Tweet Threads — Share the Architecture',
    description:
      'Pre-written Twitter/X thread templates for sharing TradeClaw. Signal engine breakdown, architecture tour, self-hosting guide — all ready to post.',
    type: 'website',
  },
};

export default function ThreadsPage() {
  return <ThreadsClient />;
}
