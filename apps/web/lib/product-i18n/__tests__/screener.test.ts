import { SUPPORTED_LOCALES, type Locale } from '../../translations';
import { formatMessage } from '../format';
import { getScreenerTranslations } from '../screener';

function stringLeaves(value: unknown, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>();

  if (typeof value === 'string') {
    leaves.set(prefix, value);
    return leaves;
  }

  if (!value || typeof value !== 'object') return leaves;

  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    for (const [path, text] of stringLeaves(child, childPrefix)) {
      leaves.set(path, text);
    }
  }

  return leaves;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map(match => match[1])
    .sort();
}

describe('screener product translations', () => {
  const locales = SUPPORTED_LOCALES.map(({ code }) => code);
  const englishLeaves = stringLeaves(getScreenerTranslations('en'));

  it.each(locales)('provides the complete, non-empty screener contract for %s', locale => {
    const leaves = stringLeaves(getScreenerTranslations(locale));

    expect([...leaves.keys()]).toEqual([...englishLeaves.keys()]);
    expect([...leaves.values()].every(value => value.trim().length > 0)).toBe(true);
  });

  it.each(locales)('preserves named placeholders for %s', locale => {
    const leaves = stringLeaves(getScreenerTranslations(locale));

    for (const [path, englishMessage] of englishLeaves) {
      expect(placeholders(leaves.get(path) ?? '')).toEqual(placeholders(englishMessage));
    }
  });

  it('formats dynamic copy without changing canonical trading codes', () => {
    const arabic = getScreenerTranslations('ar');
    const chinese = getScreenerTranslations('zh');

    expect(formatMessage(arabic.subtitle, { count: 40 })).toContain('40');
    expect(formatMessage(chinese.actions.exportRows, { count: 3 })).toContain('3');

    for (const locale of locales as Locale[]) {
      const copy = getScreenerTranslations(locale);
      expect(copy.filters.rsiRange).toContain('RSI');
      expect(copy.filters.macd).toBe('MACD');
    }
  });
});
