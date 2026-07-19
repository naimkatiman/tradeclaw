import { SUPPORTED_LOCALES } from '../../translations';
import { getTrackRecordTranslations } from '../track-record';

function leaves(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe('track-record translations', () => {
  const englishPaths = leaves(getTrackRecordTranslations('en')).map(([path]) => path).sort();

  it.each(SUPPORTED_LOCALES)('matches the complete English contract for $code', ({ code }) => {
    const translatedLeaves = leaves(getTrackRecordTranslations(code));
    const englishByPath = new Map(leaves(getTrackRecordTranslations('en')));

    expect(translatedLeaves.map(([path]) => path).sort()).toEqual(englishPaths);
    expect(translatedLeaves.every(([, value]) => value.trim().length > 0)).toBe(true);
    for (const [path, value] of translatedLeaves) {
      expect(placeholders(value)).toEqual(placeholders(englishByPath.get(path) ?? ''));
      expect(value).not.toMatch(/�|Ã|Â|â€|Ø|Ù/);
    }
  });

  it.each(['es', 'zh', 'ms', 'ar'] as const)('localizes visible trust copy for %s', (code) => {
    const english = getTrackRecordTranslations('en');
    const translated = getTrackRecordTranslations(code);

    expect(translated.header.eyebrow).not.toBe(english.header.eyebrow);
    expect(translated.header.riskBody).not.toBe(english.header.riskBody);
    expect(translated.populationBody).not.toBe(english.populationBody);
  });

  it.each(SUPPORTED_LOCALES)('keeps required dynamic placeholders for $code', ({ code }) => {
    const t = getTrackRecordTranslations(code);

    expect(t.table.range).toEqual(expect.stringContaining('{total}'));
    expect(t.aria.viewSignal).toEqual(expect.stringContaining('{pair}'));
    expect(t.header.breakEven).toEqual(expect.stringContaining('{value}'));
  });
});
