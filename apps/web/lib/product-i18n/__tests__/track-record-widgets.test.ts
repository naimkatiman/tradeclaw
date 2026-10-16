import { SUPPORTED_LOCALES } from '../../translations';
import { formatMessage } from '../format';
import { getTrackRecordWidgetTranslations } from '../track-record-widgets';

function leafEntries(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

describe('track-record widget translations', () => {
  const englishEntries = leafEntries(getTrackRecordWidgetTranslations('en'));
  const englishPaths = englishEntries.map(([path]) => path).sort();

  it.each(SUPPORTED_LOCALES)('has a complete placeholder-safe dictionary for $code', ({ code }) => {
    const localizedEntries = leafEntries(getTrackRecordWidgetTranslations(code));
    const localizedByPath = new Map(localizedEntries);

    expect(localizedEntries.map(([path]) => path).sort()).toEqual(englishPaths);
    for (const [path, englishValue] of englishEntries) {
      const localizedValue = localizedByPath.get(path);
      expect(localizedValue?.trim()).toBeTruthy();
      expect(placeholders(localizedValue ?? '')).toEqual(placeholders(englishValue));
      expect(localizedValue).not.toContain('�');
    }
  });

  it.each(['es', 'zh', 'ms', 'ar'] as const)('localizes every owned widget layer for %s', (code) => {
    const english = getTrackRecordWidgetTranslations('en');
    const localized = getTrackRecordWidgetTranslations(code);

    expect(localized.embed.trackRecordTitle).not.toBe(english.embed.trackRecordTitle);
    expect(localized.share.xObserved).not.toBe(english.share.xObserved);
    expect(localized.trailingWeek.archiveSummary).not.toBe(english.trailingWeek.archiveSummary);
    expect(localized.equity.sequentialHint).not.toBe(english.equity.sequentialHint);
    expect(localized.equity.tooltipCumulative).not.toBe(english.equity.tooltipCumulative);
  });

  it.each(SUPPORTED_LOCALES)('preserves trading and product tokens for $code', ({ code }) => {
    const copy = getTrackRecordWidgetTranslations(code);

    expect(copy.share.xObserved).toContain('TradeClaw');
    expect(copy.share.xObserved).toContain('OHLCV');
    expect(copy.equity.smoothTitle).toContain('P95');
    expect(copy.equity.sequentialHint).toContain('R');
    expect(copy.equity.sequentialHint).toContain('FX');
    expect(copy.equity.winRateHint).toContain('OHLCV');
    expect(copy.equity.winRateHint).toContain('TP');
    expect(copy.equity.winRateHint).toContain('SL');
  });

  it('formats the complete Arabic share sentence without leaving placeholders', () => {
    const template = getTrackRecordWidgetTranslations('ar').share.xObserved;
    const message = formatMessage(template, { winRate: '58.2%', resolved: '1,240' });

    expect(message).toContain('58.2%');
    expect(message).toContain('1,240');
    expect(message).not.toMatch(/\{[A-Za-z0-9_]+\}/);
  });
});
