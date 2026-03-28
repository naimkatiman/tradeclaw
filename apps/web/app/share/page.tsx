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
  title: 'Share TradeClaw — Help Us Reach 1,000 GitHub Stars',
  description:
    'Spread the word about TradeClaw — self-hosted AI trading signals, MIT licensed, free forever. Pre-written posts for Reddit, HN, Twitter, LinkedIn, Discord and more.',
  openGraph: {
    title: 'Help TradeClaw reach 1,000 GitHub Stars',
    description:
      'Pre-written posts for Reddit, Hacker News, Twitter, LinkedIn, Discord and Telegram. One click to share — helps indie traders discover a free alternative to expensive signal platforms.',
    type: 'website',
  },
};

export default function SharePage() {
  return <ShareClient />;
}
