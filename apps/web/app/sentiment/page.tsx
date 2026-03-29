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
    'Live crypto market sentiment dashboard with Fear & Greed Index, BTC dominance, global market cap, trending coins, and 24h volume heatmap.',
  openGraph: {
    title: 'Market Sentiment — Crypto Fear & Greed Index',
    description:
      'Real-time crypto sentiment: Fear & Greed gauge, BTC dominance, trending coins, and volume heatmap — all in one view.',
  },
};

export default function SentimentPage() {
  return <SentimentClient />;
}
