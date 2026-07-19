'use client';

import type { Locale } from '../../lib/translations';
import { SUPPORTED_LOCALES } from '../../lib/translations';
import { getAppShellTranslations } from '../../lib/product-i18n/app-shell';
import { useLocale } from './locale-provider';

export function ProductLocaleSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, ready } = useLocale();
  const t = getAppShellTranslations(locale);

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t.language}</span>
      <select
        aria-label={t.language}
        value={locale}
        disabled={!ready}
        onChange={(event) => setLocale(event.target.value as Locale)}
        dir="ltr"
        className="h-8 min-w-[58px] cursor-pointer rounded-sm border border-white/[0.10] bg-white/[0.035] px-2 text-[11px] font-semibold text-white/[0.70] outline-none transition-colors hover:border-white/[0.18] hover:text-white focus:border-[var(--brand)]/50 disabled:cursor-wait disabled:opacity-60"
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item.code} value={item.code} className="bg-[#090b0e] text-white">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
