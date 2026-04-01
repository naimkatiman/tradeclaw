import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SponsorsClient = dynamic(
  () => import('./SponsorsClient').then((m) => ({ default: m.SponsorsClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Sponsors — TradeClaw',
  description:
    'Support TradeClaw\'s open-source mission. Sponsor to keep the AI trading signal platform free forever and unlock roadmap milestones.',
  openGraph: {
    title: 'Sponsor TradeClaw — Open Source AI Trading Signals',
    description:
      'TradeClaw is MIT-licensed and free forever. Your sponsorship funds new features, a hosted demo, and full-time maintenance.',
    type: 'website',
  },
  keywords: ['github sponsors', 'open source trading', 'tradeclaw sponsor', 'support oss', 'trading signals'],
};

export default function SponsorsPage() {
  return <SponsorsClient />;
}
