import type { ResearchIntakeRecord } from './research-intake';

export const RESEARCH_LOOP_DURATION_HOURS = 3;
export const RESEARCH_LOOP_DURATION_MS = RESEARCH_LOOP_DURATION_HOURS * 60 * 60 * 1000;

export interface ResearchLoopWindow {
  id: string;
  startAt: string;
  endsAt: string;
  durationHours: 3;
}

export interface MarketingReviewDraft {
  candidateId: string;
  title: string;
  summary: string;
  body: string;
  evidenceBasis: 'modeled-research';
  disposition: 'human-review-draft-only';
  publishApproved: false;
  resultPath: string;
  artifactPath: string;
}

export function getResearchLoopWindow(at: Date | string | number): ResearchLoopWindow {
  const timestamp = at instanceof Date ? at.getTime() : new Date(at).getTime();
  if (!Number.isFinite(timestamp)) throw new Error('research loop time must be a valid instant');

  const startMs = Math.floor(timestamp / RESEARCH_LOOP_DURATION_MS) * RESEARCH_LOOP_DURATION_MS;
  const endMs = startMs + RESEARCH_LOOP_DURATION_MS;
  const startAt = new Date(startMs).toISOString();
  const endsAt = new Date(endMs).toISOString();

  return {
    id: `${startAt}/PT3H`,
    startAt,
    endsAt,
    durationHours: RESEARCH_LOOP_DURATION_HOURS,
  };
}

function signedPercent(ratio: number): string {
  const value = ratio * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function buildMarketingReviewDraft(
  record: ResearchIntakeRecord,
): MarketingReviewDraft | null {
  const evidence = record.tradeClawEvidence;
  if (!evidence || record.marketingDisposition !== 'human-review-draft-only') return null;

  return {
    candidateId: record.id,
    title: 'A high-turnover Bitcoin trend idea failed after realistic costs',
    summary: `BTC gross ${signedPercent(evidence.btc.grossCompoundedReturn)} became net ${signedPercent(evidence.btc.netCompoundedReturn)} under the frozen TradeClaw cost model.`,
    body: [
      `We independently replicated “${record.title}” under a preregistered rule and TradeClaw's frozen crypto-perpetual costs.`,
      `BTC returned ${signedPercent(evidence.btc.grossCompoundedReturn)} gross but ${signedPercent(evidence.btc.netCompoundedReturn)} net across ${evidence.btc.completedTrades.toLocaleString('en-US')} trades; ETH returned ${signedPercent(evidence.eth.grossCompoundedReturn)} gross and ${signedPercent(evidence.eth.netCompoundedReturn)} net.`,
      `The fixed 50/50 portfolio finished ${signedPercent(evidence.portfolio.netCompoundedReturn)} net, and its holdout returned ${signedPercent(evidence.portfolio.holdoutNetCompoundedReturn)}. Both assets had ${evidence.btc.positiveFolds} of ${evidence.btc.totalFolds} positive chronological folds.`,
      `The useful result is the cost boundary: BTC averaged ${signedPercent(evidence.btc.meanGrossTradeReturn)} gross per trade against ${(
        2 * (evidence.costs.feePctPerSide + evidence.costs.slippagePctPerSide)
      ).toFixed(2)}% round-trip fee and slippage before funding.`,
      'Verdict: FAIL. This modeled research result is not live performance and does not authorize promotion, allocation, broadcast, or execution.',
    ].join(' '),
    evidenceBasis: 'modeled-research',
    disposition: 'human-review-draft-only',
    publishApproved: false,
    resultPath: evidence.resultPath,
    artifactPath: evidence.artifactPath,
  };
}
