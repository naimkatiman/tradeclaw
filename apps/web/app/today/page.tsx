import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const TodayClient = dynamic(
  () => import('./TodayClient').then(m => ({ default: m.TodayClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: "Today's Signal — TradeClaw",
  description:
    "The single highest-confidence trading signal right now. Updated every 5 minutes with AI-analyzed entry, stop loss, and take profit levels.",
  openGraph: {
    title: "Signal of the Day — TradeClaw",
    description:
      "The #1 highest-confidence AI trading signal today. Entry, SL, TP, and full indicator analysis.",
    type: 'website',
  },
};

export default function TodayPage() {
  return <TodayClient />;
}
