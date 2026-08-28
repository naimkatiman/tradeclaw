import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SignalStudyClient = dynamic(
  () => import('./SignalStudyClient').then((module) => ({ default: module.SignalStudyClient })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    ),
  },
);

export function generateMetadata(): Metadata {
  const title = `Strategy Study Catalog | TradeClaw`;
  const description =
    'Seven artifact-backed modeled strategy studies, an evidence-ranked paper-pass default, and the complete experiment shelf. It is not the observed track record, broker fills, or customer portfolio returns.';
  const url = 'https://tradeclaw.win/track-record/study';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'TradeClaw',
      type: 'website',
      images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw strategy study catalog' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/api/og'] },
  };
}

export default function SignalStudyPage() {
  return <SignalStudyClient />;
}
