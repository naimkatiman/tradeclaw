import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SUPPORTED_LOCALES } from '../../translations';
import { getMarketingNavTranslations } from '../marketing-nav';

function leaves(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('marketing navbar translations', () => {
  const english = getMarketingNavTranslations('en');
  const englishPaths = leaves(english).map(([path]) => path).sort();

  it.each(SUPPORTED_LOCALES)('has a complete, clean dictionary for $code', ({ code }) => {
    const translatedLeaves = leaves(getMarketingNavTranslations(code));

    expect(translatedLeaves.map(([path]) => path).sort()).toEqual(englishPaths);
    expect(translatedLeaves.every(([, value]) => value.trim().length > 0)).toBe(true);
    expect(translatedLeaves.map(([, value]) => value).join('\n')).not.toMatch(/(?:Ã.|Â.|â€|Ø.|�)/);
  });

  it.each(['es', 'zh', 'ms', 'ar'] as const)('localizes every shared navbar control for %s', (code) => {
    const translated = getMarketingNavTranslations(code);

    expect(translated.actions.more).not.toBe(english.actions.more);
    expect(translated.actions.liveSignals).not.toBe(english.actions.liveSignals);
    expect(translated.actions.star).not.toBe(english.actions.star);
    expect(translated.actions.openApp).not.toBe(english.actions.openApp);
    expect(translated.aria.mainNavigation).not.toBe(english.aria.mainNavigation);
    expect(translated.aria.mobileNavigation).not.toBe(english.aria.mobileNavigation);
    expect(translated.aria.openMenu).not.toBe(english.aria.openMenu);
    expect(translated.aria.closeMenu).not.toBe(english.aria.closeMenu);
    expect(translated.aria.starCount).not.toBe(english.aria.starCount);
    expect(translated.aria.starPage).not.toBe(english.aria.starPage);
    expect(translated.links.research).not.toBe(english.links.research);
    expect(translated.links.weeklyReport).not.toBe(english.links.weeklyReport);
    expect(translated.links.howItWorks).not.toBe(english.links.howItWorks);
  });

  it.each(SUPPORTED_LOCALES)('preserves external product names for $code', ({ code }) => {
    const translated = getMarketingNavTranslations(code);

    expect(translated.links.discord).toBe('Discord');
    expect(translated.links.productHunt).toBe('Product Hunt');
    expect(translated.links.supabaseSetup).toContain('Supabase');
  });

  it('renders link, action, and aria copy through the typed dictionary', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/components/navbar.tsx'),
      'utf8',
    );

    expect(source).not.toMatch(/\blabel:\s*['"]/);
    expect(source).not.toContain('aria-label="Main navigation"');
    expect(source).not.toContain('aria-label="Mobile navigation"');
    expect(source).toContain('copy.links[link.labelKey]');
    expect(source).not.toContain('copy.actions.liveSignals');
    expect(source).not.toContain('copy.actions.star');
    expect(source).toContain("labelKey: 'evidence'");
    expect(source).toContain("labelKey: 'lab'");
    expect(source).toContain("labelKey: 'build'");
    expect(source).toContain('copy.aria.mobileNavigation');
    expect(source).toContain('const { locale, setLocale, ready } = useLocale()');
    expect(source.match(/disabled=\{!ready\}/g)).toHaveLength(2);
    expect(source).toContain("aria-current={isActiveHref(link.href) ? 'page' : undefined}");
    expect(source).not.toContain('aria-haspopup="true"');
  });
});
