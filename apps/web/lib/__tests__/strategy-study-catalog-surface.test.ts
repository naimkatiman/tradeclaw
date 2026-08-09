import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

describe('strategy study catalog surface', () => {
  const page = source('app/track-record/study/SignalStudyClient.tsx');

  it('renders the fixed catalog, evidence-ranked default, and complete shelf', () => {
    expect(page).toContain('FEATURED_STRATEGY_STUDIES.map');
    expect(page).toContain('DEFAULT: EVIDENCE RANK');
    expect(page).toContain('STRATEGY_STUDY_SELECTION_POLICY');
    expect(page).toContain('data-testid="selected-strategy-study"');
    expect(page).toContain('data-testid="experiment-shelf"');
    expect(page).toContain('all {EXPERIMENT_SHELF.length} committed JSON artifacts');
  });

  it('keeps adverse aggregate evidence on the same page instead of shelving it away', () => {
    expect(page).toContain('Adverse result retained');
    expect(page).toContain('changing the default cannot erase the losing record');
    expect(page).toContain('<TrailingWeekBandCallout');
    expect(page).toContain('<EquityCurve');
  });

  it('states the green result boundary and links the observed record', () => {
    const catalog = source('lib/strategy-study-catalog.ts');
    expect(catalog).toMatch(/not live performance/i);
    expect(catalog).toMatch(/prospective tracking began without backfilling/i);
    expect(page).toContain('href="/track-record"');
    expect(page).toContain('historical modeled studies');
  });
});
