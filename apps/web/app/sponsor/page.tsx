import type { Metadata } from 'next';
import { SponsorClient } from './SponsorClient';

export const metadata: Metadata = {
  title: 'Sponsor TradeClaw — Support Open-Source Trading',
  description:
    'Keep TradeClaw free, independent, and fast. Sponsor tiers from $5/mo — unlock roadmap milestones and support open-source AI trading signals.',
  openGraph: {
    title: 'Sponsor TradeClaw — Support Open-Source Trading',
    description:
      'Monthly sponsorship keeps TradeClaw ad-free and moving fast. See tiers, roadmap unlocks, and why open source needs your support.',
    type: 'website',
  },
};

export default function SponsorPage() {
  return <SponsorClient />;
}
