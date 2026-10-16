import { SUPPORTED_LOCALES } from '../../translations';
import { getAppShellTranslations } from '../app-shell';
import { formatMessage } from '../format';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe('product app-shell translations', () => {
  const englishPaths = leafPaths(getAppShellTranslations('en')).sort();

  it.each(SUPPORTED_LOCALES)('has the complete non-empty shell for $code', ({ code }) => {
    const dictionary = getAppShellTranslations(code);

    expect(leafPaths(dictionary).sort()).toEqual(englishPaths);
    for (const path of englishPaths) {
      const value = path.split('.').reduce<unknown>(
        (current, key) => (current as Record<string, unknown>)[key],
        dictionary,
      );
      expect(typeof value).toBe('string');
      expect((value as string).trim()).not.toBe('');
      const englishValue = path.split('.').reduce<unknown>(
        (current, key) => (current as Record<string, unknown>)[key],
        getAppShellTranslations('en'),
      ) as string;
      expect(placeholders(value as string)).toEqual(placeholders(englishValue));
      expect(value as string).not.toMatch(/�|Ã|Â|â€|Ø|Ù/);
    }
  });

  it('provides a visibly localized language label outside English', () => {
    for (const code of ['es', 'zh', 'ms', 'ar'] as const) {
      expect(getAppShellTranslations(code).language).not.toBe(
        getAppShellTranslations('en').language,
      );
      expect(getAppShellTranslations(code).theme.toggle).not.toBe(
        getAppShellTranslations('en').theme.toggle,
      );
    }
  });

  it('formats named values and leaves unknown placeholders intact', () => {
    expect(formatMessage('{count} of {total}; {unknown}', { count: 3, total: 8 })).toBe(
      '3 of 8; {unknown}',
    );
  });
});
