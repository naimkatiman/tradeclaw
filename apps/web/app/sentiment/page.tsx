import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SentimentClient = dynamic(
  () => import('./SentimentClient').then(m => ({ default: m.SentimentClient })),
  {
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: 'Market Sentiment — Crypto Fear & Greed Index | TradeClaw',
  description:
    'Latest available provider-reported crypto sentiment data, with no synthetic fallback when upstream data is unavailable.',
  openGraph: {
    title: 'Market Sentiment — Crypto Fear & Greed Index',
    description:
      'Provider-reported Fear & Greed, market dominance, trending coins, and volume data.',
  },
};

export default function SentimentPage() {
  return <SentimentClient />;
}
