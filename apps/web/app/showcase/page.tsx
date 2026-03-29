import type { Metadata } from 'next';
import { ShowcaseClient } from '../../components/showcase/ShowcaseClient';

export const metadata: Metadata = {
  title: 'TradeClaw Showcase — Real Traders, Real Setups',
  description:
    'See how traders, quants, and crypto hobbyists use TradeClaw to track signals, automate alerts, and self-host their own trading intelligence platform.',
  openGraph: {
    title: 'TradeClaw Showcase — Real Traders, Real Setups',
    description:
      'Day traders, quant developers, and crypto hobbyists share how they use TradeClaw. Deploy your own free AI trading signal platform in minutes.',
    type: 'website',
  },
};

export default function ShowcasePage() {
  return <ShowcaseClient />;
}
