import { SUPPORTED_LOCALES } from '../../translations';
import { formatMessage } from '../format';
import { getDashboardEvidenceTranslations } from '../dashboard-evidence';

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

describe('dashboard evidence translations', () => {
  const locales = SUPPORTED_LOCALES.map(({ code }) => code);
  const english = getDashboardEvidenceTranslations('en');
  const englishLeaves = stringLeaves(english);

  it.each(locales)('provides the complete, non-empty contract for %s', locale => {
    const leaves = stringLeaves(getDashboardEvidenceTranslations(locale));

    expect([...leaves.keys()]).toEqual([...englishLeaves.keys()]);
    expect([...leaves.values()].every(value => value.trim().length > 0)).toBe(true);
  });

  it.each(locales)('preserves every named placeholder for %s', locale => {
    const leaves = stringLeaves(getDashboardEvidenceTranslations(locale));

    for (const [path, englishMessage] of englishLeaves) {
      expect(placeholders(leaves.get(path) ?? '')).toEqual(placeholders(englishMessage));
    }
  });

  it('states the score threshold as a 0-100 rule score, not a probability', () => {
    for (const locale of locales) {
      const copy = getDashboardEvidenceTranslations(locale);
      expect(copy.accuracy.noResolved).toContain('70/100');
      expect(copy.accuracy.noResolved).not.toContain('70%+');
      expect(copy.export.message.scoreLine).toContain('/100');
    }
  });

  it('localizes tooltip bodies and distinguishes win rate from return', () => {
    for (const locale of locales.filter(locale => locale !== 'en')) {
      const copy = getDashboardEvidenceTranslations(locale);
      expect(copy.accuracy.hints.resolved).not.toBe(english.accuracy.hints.resolved);
      expect(copy.accuracy.hints.winRate).not.toBe(english.accuracy.hints.winRate);
      expect(copy.accuracy.hints.averageReturn).not.toBe(english.accuracy.hints.averageReturn);
      expect(copy.accuracy.hints.streak).not.toBe(english.accuracy.hints.streak);
      expect(copy.accuracy.bestWinRate).not.toBe(copy.accuracy.bestReturn);
    }
  });

  it('formats dynamic evidence copy without rewriting canonical provider IDs', () => {
    const arabic = getDashboardEvidenceTranslations('ar');
    const tooltip = formatMessage(arabic.dataSource.tooltip, { source: 'Binance' });

    expect(tooltip).toContain('Binance');
    expect(tooltip).toContain('/data-freshness');
    expect(formatMessage(arabic.accuracy.bestWinRate, { pair: 'BTCUSD' })).toContain('BTCUSD');
  });
});
