import type { Metadata } from 'next';
import PledgeClient from './PledgeClient';

export const metadata: Metadata = {
  title: 'Stars-for-Features Pledge | TradeClaw',
  description:
    'Pledge your support for TradeClaw features unlocked at star milestones — PostgreSQL at 100 stars, multi-exchange at 250, mobile app at 500, AI copilot at 1000. Sign the pledge wall and help us get there.',
  openGraph: {
    title: 'Stars-for-Features Pledge | TradeClaw',
    description:
      'Pledge support for features unlocked at 100/250/500/1000 GitHub stars. Every star counts.',
    url: 'https://tradeclaw.win/pledge',
    siteName: 'TradeClaw',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stars-for-Features Pledge | TradeClaw',
    description:
      'Pledge support for features unlocked at star milestones. PostgreSQL, mobile app, AI copilot — all unlocked by community stars.',
  },
  alternates: {
    canonical: 'https://tradeclaw.win/pledge',
  },
};

export default function PledgePage() {
  return <PledgeClient />;
}
