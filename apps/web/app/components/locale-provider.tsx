'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  type Locale,
  type Translations,
  getHtmlLanguage,
  getLandingLocale,
  getLocaleHref,
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
 * Core product surfaces consume typed dictionaries from this provider. Routes
 * without an extracted dictionary continue to use their canonical copy until
 * they are migrated deliberately rather than receiving brittle text rewrites.
 */

const STORAGE_KEY = 'tc_locale';
const COOKIE_KEY = 'tc_locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.some(l => l.code === value);
}

function readCookieLocale(): Locale | null {
  try {
    const value = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${COOKIE_KEY}=`))
      ?.slice(COOKIE_KEY.length + 1) ?? null;
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function readPersistedLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage can be blocked by browser/privacy policy; the cookie remains a
    // separate fallback rather than leaving locale hydration unfinished.
  }
  return readCookieLocale();
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Continue to the cookie fallback when browser storage is unavailable.
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_KEY}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    // The in-memory preference still updates even if both persistence lanes fail.
  }
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const routeLocale = getLandingLocale(pathname);
  const [preferredLocale, setPreferredLocale] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(routeLocale !== null);
  const locale = routeLocale ?? preferredLocale;

  // Landing URLs are authoritative. Everywhere else, hydrate the persisted
  // app-shell preference after mount to avoid an SSR/client markup mismatch.
  useEffect(() => {
    if (routeLocale) {
      const stored = readPersistedLocale();
      const nextPreferred = routeLocale === DEFAULT_LOCALE && stored
        ? stored
        : routeLocale;
      // Keep the landing URL authoritative while preloading the preference that
      // should take over immediately on the next client-side product navigation.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate post-hydration preference handoff
      setPreferredLocale(nextPreferred);
      // The English root is also the shared brand destination. Visiting it
      // should render the English landing page without erasing an app-language
      // preference chosen on a product route. Explicitly choosing EN still
      // persists EN in setLocale before navigation.
      if (routeLocale !== DEFAULT_LOCALE || !stored) {
        persistLocale(routeLocale);
      }
      setReady(true);
      return;
    }

    const stored = readPersistedLocale();
    // Hydration must happen after mount to avoid an SSR/client markup mismatch.
    if (stored) setPreferredLocale(stored);
    // Keep selectors disabled until hydration has attached their handlers.
    setReady(true);
  }, [routeLocale]);

  // Keep <html lang/dir> in sync so RTL locales (ar) flip layout direction.
  useEffect(() => {
    document.documentElement.lang = getHtmlLanguage(locale);
    document.documentElement.dir = getTextDirection(locale);
  }, [locale]);

  const setLocale = (l: Locale) => {
    setPreferredLocale(l);
    persistLocale(l);

    // Changing language on a landing page must also change the translated
    // route. App routes keep their URL and use the preference as shell state.
    if (routeLocale !== null && routeLocale !== l) {
      router.push(getLocaleHref(l));
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getTranslations(locale), ready }}>
      <style>{'html[data-tc-js="true"] [data-tc-locale-ready="false"] { visibility: hidden; }'}</style>
      <div
        data-tc-locale-ready={ready ? 'true' : 'false'}
        aria-hidden={ready ? undefined : true}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
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
