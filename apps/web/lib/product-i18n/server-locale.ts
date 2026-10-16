import 'server-only';

import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '../translations';

export async function getPreferredLocaleFromCookie(): Promise<Locale> {
  const value = (await cookies()).get('tc_locale')?.value;
  return SUPPORTED_LOCALES.some(({ code }) => code === value)
    ? value as Locale
    : DEFAULT_LOCALE;
}
