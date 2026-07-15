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
    "The highest rule score among the latest available provider-backed signal candidates. It is not a calibrated probability or trade recommendation.",
  openGraph: {
    title: "Signal of the Day — TradeClaw",
    description:
      "The latest candidate with the highest mechanical rule score, with its indicator inputs and evidence boundary.",
    type: 'website',
  },
};

export default function TodayPage() {
  return <TodayClient />;
}
