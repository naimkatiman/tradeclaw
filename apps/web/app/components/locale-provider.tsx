'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Locale,
  type Translations,
  getTranslations,
  getTextDirection,
  SUPPORTED_LOCALES,
} from '../../lib/translations';

/**
 * Runtime locale context for the authenticated app shell (issue #16).
 *
 * The marketing landing pages keep their server-rendered, URL-prefixed i18n
 * (/es, /zh, /ms, /ar) for SEO. The app shell (navbar + dashboard/app surfaces)
 * has no SEO requirement, so it reads the chosen locale from this client context,
 * persisted to localStorage and reflected in <html lang/dir> for RTL.
 *
 * Phase 1 ships the foundation + navbar switcher; per-surface string extraction
 * (dashboard/signals/settings/backtest/compare) is the documented Phase 2.
 */

const STORAGE_KEY = 'tc_locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.some(l => l.code === value);
}

export function LocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Hydrate from the persisted preference after mount (avoids SSR mismatch).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Hydration must happen after mount to avoid an SSR/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  // Keep <html lang/dir> in sync so RTL locales (ar) flip layout direction.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getTextDirection(locale);
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getTranslations(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}

/** Convenience hook returning the active translation dictionary. */
export function useTranslations(): Translations {
  return useLocale().t;
}
