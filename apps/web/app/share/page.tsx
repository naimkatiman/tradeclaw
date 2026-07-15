import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ShareClient = dynamic(() => import('./ShareClient').then(m => ({ default: m.ShareClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Share TradeClaw Source and Research',
  description:
    'Review and share TradeClaw as MIT-licensed, self-hostable trading-signal software. Verify pre-written claims before publishing them.',
  openGraph: {
    title: 'Share TradeClaw Source and Research',
    description:
      'Draft posts for Reddit, Hacker News, X, LinkedIn, Discord, and Telegram. Review the evidence and external-service terms before publishing.',
    type: 'website',
  },
};

export default function SharePage() {
  return <ShareClient />;
}
