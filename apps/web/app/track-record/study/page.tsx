import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTrackRecordWidgetTranslations } from '../../../lib/product-i18n/track-record-widgets';
import { getPreferredLocaleFromCookie } from '../../../lib/product-i18n/server-locale';

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocaleFromCookie();
  const title = `${getTrackRecordWidgetTranslations(locale).equity.title} | TradeClaw`;
  const description =
    'A hypothetical, fee/slippage-adjusted sequential equity study built from OHLCV-resolved signals. It is not the observed track record, broker fills, or customer portfolio performance.';

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
