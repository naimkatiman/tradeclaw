import type { Metadata } from 'next';
import RoadmapClient from './RoadmapClient';

export const metadata: Metadata = {
  title: 'Roadmap — TradeClaw',
  description: 'Vote on upcoming TradeClaw features. See what the community wants built next — PostgreSQL storage, Python SDK, mobile app, and more.',
  openGraph: {
    title: 'TradeClaw Roadmap — Vote on Features',
    description: 'Public roadmap with community upvotes. Shape the future of TradeClaw.',
    url: 'https://tradeclaw.win/roadmap',
  },
};

export default function RoadmapPage() {
  return <RoadmapClient />;
}
