import { SYSTEMATIC_RESEARCH_INTAKE } from '../research-intake';
import {
  RESEARCH_LOOP_DURATION_MS,
  buildMarketingReviewDraft,
  getResearchLoopWindow,
} from '../research-loop';

describe('three-hour research and marketing loop', () => {
  it('creates stable UTC-aligned three-hour windows', () => {
    const window = getResearchLoopWindow('2026-08-29T06:44:38.000Z');
    expect(window).toEqual({
      id: '2026-08-29T06:00:00.000Z/PT3H',
      startAt: '2026-08-29T06:00:00.000Z',
      endsAt: '2026-08-29T09:00:00.000Z',
      durationHours: 3,
    });
    expect(Date.parse(window.endsAt) - Date.parse(window.startAt)).toBe(RESEARCH_LOOP_DURATION_MS);
    expect(getResearchLoopWindow('2026-08-29T08:59:59.999Z').id).toBe(window.id);
    expect(getResearchLoopWindow('2026-08-29T09:00:00.000Z').id).toBe(
      '2026-08-29T09:00:00.000Z/PT3H',
    );
  });

  it('fails closed on invalid cycle time', () => {
    expect(() => getResearchLoopWindow('not-a-time')).toThrow(/valid instant/i);
  });

  it('creates a factual review-only draft for completed local evidence', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => candidate.tradeClawEvidence);
    if (!record) throw new Error('TC-255 intake record is missing');
    const draft = buildMarketingReviewDraft(record);
    expect(draft).toMatchObject({
      candidateId: record.id,
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(draft?.summary).toContain('BTC gross +69.43% became net -99.21%');
    expect(draft?.body).toContain('ETH returned -12.75% gross and -99.55% net');
    expect(draft?.body).toContain('fixed 50/50 portfolio finished -99.38% net');
    expect(draft?.body).toContain('0 of 4 positive chronological folds');
    expect(draft?.body).toContain('0.40% round-trip fee and slippage before funding');
    expect(draft?.body).toMatch(/Verdict: FAIL/);
    expect(draft?.body).toMatch(/not live performance/i);
    expect(draft?.body).toMatch(/does not authorize promotion, allocation, broadcast, or execution/i);
  });

  it('does not manufacture a marketing draft for untested upstream rows', () => {
    const untested = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => !candidate.tradeClawEvidence);
    if (!untested) throw new Error('untested intake record is missing');
    expect(buildMarketingReviewDraft(untested)).toBeNull();
  });

  it('does not turn a source-audit no-go into a TradeClaw result or marketing claim', () => {
    const sourceNoGo = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawSourceAudit?.disposition === 'no-go',
    );
    if (!sourceNoGo) throw new Error('source-audit no-go is missing');
    expect(sourceNoGo).toMatchObject({
      stage: 'source-audited',
      verdict: 'not-tested',
      marketingDisposition: 'none',
      tradeClawEvidence: null,
    });
    expect(buildMarketingReviewDraft(sourceNoGo)).toBeNull();
  });
});
