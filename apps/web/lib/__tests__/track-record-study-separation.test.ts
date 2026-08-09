import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

describe('track-record evidence-surface separation', () => {
  it('keeps modeled equity widgets off the observed record', () => {
    const record = source('app/track-record/TrackRecordClient.tsx');

    expect(record).toContain('<EvidenceSurfaceNav active="record" />');
    expect(record).not.toContain('<EquityCurve');
    expect(record).not.toContain('<TrailingWeekBandCallout');
    expect(record).not.toContain('headlineCompoundedReturn');
    expect(record).not.toContain('headlineMaxDrawdown');
  });

  it('owns simulations on a distinct, directly linked study route', () => {
    const study = source('app/track-record/study/SignalStudyClient.tsx');
    const record = source('app/track-record/TrackRecordClient.tsx');

    expect(study).toContain('<EvidenceSurfaceNav active="study" />');
    expect(study).toContain('<TrailingWeekBandCallout');
    expect(study).toContain('<EquityCurve');
    expect(study).toContain('period={period}');
    expect(study).not.toMatch(/period === ['"]7d['"][\s\S]*period === ['"]30d['"][\s\S]*['"]all['"]/);
    expect(study).toContain('const hasSizedStudy = Boolean(summary && summary.sizedTrades > 0)');
    expect(study).toContain("value={hasSizedStudy && summary ? signedPercent(language, summary.totalReturn) : '—'}");
    expect(record).toContain('/track-record/study');
  });

  it('keeps each route metadata inside its own evidence boundary', () => {
    const recordPage = source('app/track-record/page.tsx');
    const studyPage = source('app/track-record/study/page.tsx');

    expect(recordPage).toMatch(/source-backed|OHLCV-resolved/i);
    expect(recordPage).not.toMatch(/sequential (equity )?simulation/i);
    expect(studyPage).toMatch(/hypothetical|modeled/i);
    expect(studyPage).toMatch(/not (?:the )?observed track record|not broker fills/i);
  });
});
