import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getScreenerTranslations } from '../../lib/product-i18n/screener';
import { getPreferredLocaleFromCookie } from '../../lib/product-i18n/server-locale';

const ScreenerClient = dynamic(() => import('./ScreenerClient'), {
  loading: () => (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocaleFromCookie();
  return {
    title: getScreenerTranslations(locale).documentTitle,
    description: 'Scan all forex, crypto, and metals assets for setups matching your custom RSI, MACD, EMA, and rule-score criteria.',
  };
}

export default function ScreenerPage() {
  return <ScreenerClient />;
}
