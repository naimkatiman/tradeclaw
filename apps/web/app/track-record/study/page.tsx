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

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default function SignalStudyPage() {
  return <SignalStudyClient />;
}
