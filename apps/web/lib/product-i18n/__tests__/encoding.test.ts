import { SUPPORTED_LOCALES, getTranslations, type Locale } from '../../translations';
import { getAppShellTranslations } from '../app-shell';
import { getDashboardTranslations } from '../dashboard';
import { getDashboardEvidenceTranslations } from '../dashboard-evidence';
import { getDashboardLiveTranslations } from '../dashboard-live';
import { getMarketingNavTranslations } from '../marketing-nav';
import { getScreenerTranslations } from '../screener';
import { getTrackRecordTranslations } from '../track-record';
import { getTrackRecordWidgetTranslations } from '../track-record-widgets';

const MOJIBAKE = /(?:\uFFFD|Ã.|Â.|â.|ðŸ|Ø.|Ù.|å.|æ.|ç.)/u;

function leaves(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

const dictionaries: Record<string, (locale: Locale) => unknown> = {
  landing: getTranslations,
  appShell: getAppShellTranslations,
  dashboard: getDashboardTranslations,
  dashboardEvidence: getDashboardEvidenceTranslations,
  dashboardLive: getDashboardLiveTranslations,
  marketingNav: getMarketingNavTranslations,
  screener: getScreenerTranslations,
  trackRecord: getTrackRecordTranslations,
  trackRecordWidgets: getTrackRecordWidgetTranslations,
};

describe('five-locale dictionary encoding and placeholders', () => {
  it.each(Object.entries(dictionaries))('%s stays structurally clean in every locale', (_, getDictionary) => {
    const english = new Map(leaves(getDictionary('en')));
    const englishPaths = [...english.keys()].sort();

    for (const { code } of SUPPORTED_LOCALES) {
      const translated = new Map(leaves(getDictionary(code)));
      // SEO keyword lists are intentionally market-specific and can contain a
      // different number of phrases. Their values still receive the same
      // encoding check below; only their numeric array indexes are exempt from
      // the object-shape comparison.
      const structuralPaths = (paths: string[]) =>
        paths.filter((path) => !path.startsWith('meta.keywords.'));
      expect(structuralPaths([...translated.keys()].sort())).toEqual(
        structuralPaths(englishPaths),
      );

      for (const value of translated.values()) {
        expect(value).not.toMatch(MOJIBAKE);
      }

      for (const path of structuralPaths(englishPaths)) {
        const value = translated.get(path);
        expect(value).toBeDefined();
        expect(value).not.toMatch(MOJIBAKE);
        expect(placeholders(value ?? '')).toEqual(placeholders(english.get(path) ?? ''));
      }
    }
  });
});
