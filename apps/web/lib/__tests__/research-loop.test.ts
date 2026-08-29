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
    expect(getResearchLoopWindow('2026-08-29T14:44:38.000+08:00')).toEqual(window);
    expect(getResearchLoopWindow(new Date('2026-08-29T06:44:38.000Z'))).toEqual(window);
    expect(getResearchLoopWindow(Date.parse('2026-08-29T06:44:38.000Z'))).toEqual(window);
    expect(getResearchLoopWindow('2026-08-29T08:59:59.999Z').id).toBe(window.id);
    expect(getResearchLoopWindow('2026-08-29T09:00:00.000Z').id).toBe(
      '2026-08-29T09:00:00.000Z/PT3H',
    );
  });

  it('fails closed on invalid cycle time', () => {
    expect(() => getResearchLoopWindow('not-a-time')).toThrow(/valid instant/i);
    expect(() => getResearchLoopWindow('2026-08-29T06:44:38.000')).toThrow(
      /explicit UTC offset/i,
    );
    expect(() => getResearchLoopWindow('2026-08-29')).toThrow(/explicit UTC offset/i);
    expect(() => getResearchLoopWindow(8_640_000_000_000_000)).toThrow(/valid instant/i);
  });

  it('creates a factual review-only draft for completed local evidence', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-255',
    );
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

  it('creates a no-performance review draft for the QA-only Treasury receipt', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-257',
    );
    if (!record) throw new Error('TC-257 intake record is missing');
    const draft = buildMarketingReviewDraft(record);
    expect(draft).toMatchObject({
      candidateId: 'predictable-end-of-month-treasury-returns',
      title: 'A Treasury replication stopped at its frozen data gate',
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(draft?.summary).toContain('27,453 official curve checks');
    expect(draft?.body).toContain('0.0301 bp');
    expect(draft?.body).toMatch(/Verdict: INCONCLUSIVE/);
    expect(draft?.body).toMatch(/Performance gates were not evaluated/i);
    expect(draft?.body).toMatch(/does not authorize promotion, publication, allocation, broadcast, or execution/i);
    expect(draft?.body).not.toMatch(/returned|profitable|Sharpe|holdout returned/i);
  });

  it('creates a review-only decay-and-cost draft for the failed MAX10/MIN10 receipt', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-258',
    );
    if (!record) throw new Error('TC-258 intake record is missing');
    const draft = buildMarketingReviewDraft(record);
    expect(draft).toMatchObject({
      candidateId: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
      title: 'Bitcoin MAX10/MIN10 failed its post-paper holdout',
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(draft?.summary).toBe(
      'BTC holdout gross +56.54% became -65.66% net under frozen spot costs.',
    );
    expect(draft?.summary).not.toContain('+13177.69%');
    expect(draft?.body).toContain('annualized at +105.56%');
    expect(draft?.body).toContain('+56.54% gross to -14.63% with the fee alone and -65.66%');
    expect(draft?.body).toContain('ETH repeated the break: +30.27% holdout gross became -67.28% net');
    expect(draft?.body).toContain('2 of 4 positive chronological folds');
    expect(draft?.body).toContain('0.0390% per side, below the fee alone');
    expect(draft?.body).toMatch(/Verdict: FAIL/);
    expect(draft?.body).toMatch(/no better-looking MAX-only control was selected/i);
    expect(draft?.body).toMatch(/does not authorize promotion, publication, allocation, broadcast, or execution/i);
  });

  it('creates a same-window benchmark draft for the failed term-premium receipt', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-259',
    );
    if (!record) throw new Error('TC-259 intake record is missing');
    const draft = buildMarketingReviewDraft(record);
    expect(draft).toMatchObject({
      candidateId: 'trading-the-term-premium',
      title: 'Term-spread timing failed stability and its holdout cash benchmark',
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
    });
    expect(draft?.summary).toBe(
      'Holdout headline return was +10.35% versus +15.62% for the identically costed one-month sleeve; only 1/4 paper folds beat both frozen benchmarks.',
    );
    expect(draft?.summary).not.toContain('+3917.50%');
    expect(draft?.body).toContain('full-history headline return was +3917.50%');
    expect(draft?.body).toContain('only 1 of 4 paper folds beat both benchmarks');
    expect(draft?.body).toContain('+10.35% after modeled costs versus +15.62%');
    expect(draft?.body).toContain('prior-only ambiguity control returned +13.70%');
    expect(draft?.body).toMatch(/Verdict: FAIL/);
    expect(draft?.body).toMatch(/fitted current-vintage curve results/i);
    expect(draft?.body).toMatch(
      /do not authorize promotion, publication, allocation, broadcast, or execution/i,
    );
  });

  it('does not manufacture a marketing draft for untested upstream rows', () => {
    const untested = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => !candidate.tradeClawEvidence);
    if (!untested) throw new Error('untested intake record is missing');
    expect(buildMarketingReviewDraft(untested)).toBeNull();
  });

  it('does not turn any source-audit no-go into a TradeClaw result or marketing claim', () => {
    const sourceNoGos = SYSTEMATIC_RESEARCH_INTAKE.filter(
      (candidate) => candidate.tradeClawSourceAudit?.disposition === 'no-go',
    );
    expect(sourceNoGos.map((record) => record.tradeClawSourceAudit?.taskId)).toEqual([
      'TC-262',
      'TC-261',
      'TC-256',
      'TC-260',
    ]);
    for (const sourceNoGo of sourceNoGos) {
      expect(sourceNoGo).toMatchObject({
        stage: 'source-audited',
        verdict: 'not-tested',
        marketingDisposition: 'none',
        tradeClawEvidence: null,
      });
      expect(buildMarketingReviewDraft(sourceNoGo)).toBeNull();
    }
  });

  it('fails closed when a future evidence task has no explicit marketing branch', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-255',
    );
    if (!record?.tradeClawEvidence) throw new Error('TC-255 intake record is missing');

    const unsupported = {
      ...record,
      tradeClawEvidence: {
        ...record.tradeClawEvidence,
        taskId: 'TC-999',
      },
    } as unknown as Parameters<typeof buildMarketingReviewDraft>[0];

    expect(buildMarketingReviewDraft(unsupported)).toBeNull();
  });
});
