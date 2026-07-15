import type { Metadata } from 'next';
import { BadgeClient } from './BadgeClient';

export const metadata: Metadata = {
  title: 'Recorded Signal Badges | TradeClaw',
  description:
    'Embed the latest eligible recorded TradeClaw signal in a GitHub README or website. Badges show unavailable when no qualifying record exists and carry no freshness guarantee.',
};

export default function BadgePage() {
  return <BadgeClient />;
}
