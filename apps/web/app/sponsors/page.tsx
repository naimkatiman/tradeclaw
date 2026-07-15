import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SponsorsClient = dynamic(
  () => import('./SponsorsClient').then((module) => ({ default: module.SponsorsClient })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Sponsors | TradeClaw',
  description: 'Open the TradeClaw GitHub Sponsors page and review the availability of published sponsor records.',
  openGraph: {
    title: 'Support TradeClaw',
    description: 'Support maintenance and development of the TradeClaw open-source repository.',
    type: 'website',
  },
  keywords: ['github sponsors', 'open source trading', 'tradeclaw sponsor', 'support oss'],
};

export default function SponsorsPage() {
  return <SponsorsClient />;
}
