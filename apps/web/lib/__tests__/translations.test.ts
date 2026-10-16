import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getHtmlLanguage,
  getLandingLocale,
  getLanguageAlternates,
  getLocaleHref,
  getTextDirection,
  getTranslations,
  isLocalizedLandingPath,
} from '../translations';

describe('locale routing', () => {
  it.each(SUPPORTED_LOCALES)('maps $href to $code', ({ code, href }) => {
    expect(getLandingLocale(href)).toBe(code);
    expect(getLandingLocale(href === '/' ? href : `${href}/`)).toBe(code);
    expect(getLocaleHref(code)).toBe(href);
  });

  it('does not treat product routes as localized landing pages', () => {
    expect(getLandingLocale('/dashboard')).toBeNull();
    expect(getLandingLocale('/es/dashboard')).toBeNull();
    expect(isLocalizedLandingPath('/')).toBe(false);
    expect(isLocalizedLandingPath('/es')).toBe(true);
  });

  it('returns valid document language and direction values', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(getHtmlLanguage('zh')).toBe('zh-CN');
    expect(getHtmlLanguage('ms')).toBe('ms');
    expect(getTextDirection('ar')).toBe('rtl');
    expect(getTextDirection('es')).toBe('ltr');
  });

  it('publishes every supported landing URL as an alternate', () => {
    expect(getLanguageAlternates('https://example.test/')).toEqual({
      en: 'https://example.test',
      es: 'https://example.test/es',
      'zh-CN': 'https://example.test/zh',
      ms: 'https://example.test/ms',
      ar: 'https://example.test/ar',
      'x-default': 'https://example.test',
    });
  });

  it.each(SUPPORTED_LOCALES)('has complete navbar copy for $code', ({ code }) => {
    expect(Object.values(getTranslations(code).nav).every(Boolean)).toBe(true);
  });

  it.each(SUPPORTED_LOCALES)('documents every required Compose secret for $code', ({ code }) => {
    const deploymentAnswer = getTranslations(code).faq.items.at(-1)?.answer ?? '';

    for (const key of ['DB_PASSWORD', 'USER_SESSION_SECRET', 'ADMIN_SECRET', 'AUTH_SECRET']) {
      expect(deploymentAnswer).toContain(key);
    }
  });
});
