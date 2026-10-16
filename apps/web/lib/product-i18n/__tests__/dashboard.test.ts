import { SUPPORTED_LOCALES } from '../../translations';
import { getDashboardTranslations } from '../dashboard';
import { formatMessage } from '../format';

function leafEntries(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe('dashboard product translations', () => {
  const englishEntries = leafEntries(getDashboardTranslations('en'));
  const englishPaths = englishEntries.map(([path]) => path).sort();

  it.each(SUPPORTED_LOCALES)('has a complete, non-empty, placeholder-safe dictionary for $code', ({ code }) => {
    const entries = leafEntries(getDashboardTranslations(code));
    const byPath = new Map(entries);

    expect(entries.map(([path]) => path).sort()).toEqual(englishPaths);
    for (const [path, englishValue] of englishEntries) {
      const localizedValue = byPath.get(path);
      expect(localizedValue?.trim()).toBeTruthy();
      expect(placeholders(localizedValue ?? '')).toEqual(placeholders(englishValue));
      expect(localizedValue).not.toContain('�');
    }
  });

  it('provides visibly localized dashboard copy outside English', () => {
    const english = getDashboardTranslations('en');

    for (const code of ['es', 'zh', 'ms', 'ar'] as const) {
      const dictionary = getDashboardTranslations(code);
      expect(dictionary.document.title).not.toBe(english.document.title);
      expect(dictionary.onboarding.title).not.toBe(english.onboarding.title);
      expect(dictionary.empty.generating).not.toBe(english.empty.generating);
      expect(dictionary.footer.disclaimer).not.toBe(english.footer.disclaimer);
    }
  });

  it.each(SUPPORTED_LOCALES)('keeps trading tokens and /100 score semantics stable for $code', ({ code }) => {
    const dictionary = getDashboardTranslations(code);

    expect(dictionary.levels.sl).toBe('SL');
    expect(dictionary.levels.tp1).toBe('TP1');
    expect(dictionary.levels.tp2).toBe('TP2');
    expect(dictionary.levels.tp3).toBe('TP3');
    expect(dictionary.filters.highRuleScore).toContain('≥80/100');
    expect(dictionary.filters.highRuleScore).not.toContain('>80/100');
    expect(dictionary.hero.score).toContain('/100');
    expect(dictionary.potential.scoreBand).toContain('/100');
    expect(dictionary.empty.noHighScoreCandidates).toContain('/100');
  });

  it('formats dashboard named values without changing invariant tokens', () => {
    const copy = getDashboardTranslations('ar');
    expect(formatMessage(copy.warning.syntheticSymbols, { count: 3, total: 10 }))
      .toContain('3');
    expect(formatMessage(copy.signal.atrBadge, { multiplier: 1.5 }))
      .toContain('SL 1.5× ATR');
  });
});
