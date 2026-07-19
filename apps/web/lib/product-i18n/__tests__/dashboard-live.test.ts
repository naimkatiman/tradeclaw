import { SUPPORTED_LOCALES } from '../../translations';
import { getDashboardLiveTranslations } from '../dashboard-live';
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

describe('dashboard live-status translations', () => {
  const englishEntries = leafEntries(getDashboardLiveTranslations('en'));
  const englishPaths = englishEntries.map(([path]) => path).sort();

  it.each(SUPPORTED_LOCALES)('has complete, non-empty, placeholder-safe copy for $code', ({ code }) => {
    const entries = leafEntries(getDashboardLiveTranslations(code));
    const byPath = new Map(entries);

    expect(entries.map(([path]) => path).sort()).toEqual(englishPaths);
    for (const [path, englishValue] of englishEntries) {
      const localizedValue = byPath.get(path);
      expect(localizedValue?.trim()).toBeTruthy();
      expect(placeholders(localizedValue ?? '')).toEqual(placeholders(englishValue));
      expect(localizedValue).not.toContain('�');
    }
  });

  it('provides visibly localized live, risk-gate, and tour copy outside English', () => {
    const english = getDashboardLiveTranslations('en');

    for (const code of ['es', 'zh', 'ms', 'ar'] as const) {
      const dictionary = getDashboardLiveTranslations(code);
      expect(dictionary.ticker.connecting).not.toBe(english.ticker.connecting);
      expect(dictionary.gate.statuses.blocked).not.toBe(english.gate.statuses.blocked);
      expect(dictionary.tour.steps.marketSnapshot.title).not.toBe(
        english.tour.steps.marketSnapshot.title,
      );
    }
  });

  it.each(SUPPORTED_LOCALES)('labels toast scores on a /100 rule scale for $code', ({ code }) => {
    const scoreLabel = getDashboardLiveTranslations(code).toast.ruleScore;
    expect(scoreLabel).toContain('/100');
    expect(scoreLabel).not.toContain('%');
  });

  it('formats localized named values while keeping invariant trading tokens intact', () => {
    const copy = getDashboardLiveTranslations('ar');

    expect(formatMessage(copy.entryStaleness.unfavorable, { change: '+1.25' })).toContain('+1.25%');
    expect(formatMessage(copy.gate.tooltip.streakLosses, { current: 2, limit: 3 })).toContain('2/3');
    expect(formatMessage(copy.tour.dialogAria, { current: 1, total: 6 })).toContain('1');
    expect(copy.tour.steps.signalCard.description).toContain('ATR');
    expect(copy.tour.steps.signalCard.description).toContain('TP1–TP3');
  });

  it('keeps the English tour evidence wording calibrated', () => {
    const copy = getDashboardLiveTranslations('en').tour.steps;

    expect(copy.signalCard.description).toContain('not a probability');
    expect(copy.accuracy.description).toContain('not broker fills or portfolio returns');
    expect(copy.deeper.description.toLowerCase()).not.toContain('never miss');
  });
});
