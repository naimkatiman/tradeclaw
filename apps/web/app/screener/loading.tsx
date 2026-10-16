'use client';

import { useLocale } from '../components/locale-provider';
import { getScreenerTranslations } from '../../lib/product-i18n/screener';

export default function ScreenerLoading() {
  const { locale } = useLocale();
  const copy = getScreenerTranslations(locale);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <div className="w-4 h-4 border border-[var(--border)] border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-sm font-mono">{copy.loading}</span>
      </div>
    </div>
  );
}
