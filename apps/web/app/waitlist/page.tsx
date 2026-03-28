import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const WaitlistClient = dynamic(() => import('./WaitlistClient'), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Join the Waitlist | TradeClaw',
  description:
    'Get early access to TradeClaw — the open-source AI trading platform with real-time signals, backtesting, and self-hosting.',
  openGraph: {
    title: 'Join the TradeClaw Waitlist',
    description:
      'Get early access to the open-source AI trading platform with real-time signals, backtesting, and self-hosting.',
  },
};

export default function WaitlistPage() {
  return <WaitlistClient />;
}
