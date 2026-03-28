import type { Metadata } from 'next';
import { BadgeClient } from './BadgeClient';

export const metadata: Metadata = {
  title: 'Live Signal Badges | TradeClaw',
  description:
    'Embed live BTC, ETH, Gold and forex signal badges directly in your GitHub README or website. Auto-refreshing SVG badges powered by real technical analysis.',
};

export default function BadgePage() {
  return <BadgeClient />;
}
