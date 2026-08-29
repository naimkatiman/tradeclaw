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

  if (evidence.taskId === 'TC-257') {
    const observedBps = evidence.qa.maximumErrorPct * 100;
    const toleranceBps = evidence.qa.frozenTolerancePct * 100;
    return {
      candidateId: record.id,
      title: 'A Treasury replication stopped at its frozen data gate',
      summary:
        `One of ${evidence.qa.suppliedYieldChecks.toLocaleString('en-US')} official curve checks exceeded the preregistered ${toleranceBps.toFixed(2)} bp tolerance, so no performance result was published.`,
      body: [
        `We audited and preregistered “${record.title}” as a low-turnover, cost-aware independent replication.`,
        `The pinned sources passed hashes, dates, counts, ${evidence.qa.evaluationMonths} evaluation months, and daily financing coverage. One five-year curve check on ${evidence.qa.maximumErrorDate} differed by ${observedBps.toFixed(4)} bp, above the frozen ${toleranceBps.toFixed(2)} bp limit.`,
        'Verdict: INCONCLUSIVE. Performance gates were not evaluated, the artifact contains no return observations, and the tolerance was not loosened after seeing the source.',
        'This modeled research receipt is not live performance and does not authorize promotion, publication, allocation, broadcast, or execution.',
      ].join(' '),
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
      resultPath: evidence.resultPath,
      artifactPath: evidence.artifactPath,
    };
  }

  if (evidence.taskId === 'TC-258') {
    return {
      candidateId: record.id,
      title: 'A spectacular Bitcoin backtest failed its post-paper holdout',
      summary:
        `BTC gross ${signedPercent(evidence.btc.grossCompoundedReturn)} became ${signedPercent(evidence.btc.holdoutNetCompoundedReturn)} net in the untouched post-paper holdout under frozen spot costs.`,
      body: [
        `We independently replicated “${record.title}” from hashed Gemini inputs after freezing exact MAX10/MIN10 rules, fills, costs, folds, and a 2022-2026 holdout.`,
        `The zero-cost paper-window control annualized at ${signedPercent(evidence.paperWindowGrossControl.annualizedReturn)} versus the source's ${signedPercent(evidence.paperWindowGrossControl.sourceTargetAnnualizedReturn)} audit target.`,
        `BTC returned ${signedPercent(evidence.btc.grossCompoundedReturn)} gross and ${signedPercent(evidence.btc.netCompoundedReturn)} net over the full history, but its holdout moved from ${signedPercent(evidence.btc.holdoutGrossCompoundedReturn)} gross to ${signedPercent(evidence.btc.holdoutFeeOnlyCompoundedReturn)} with the fee alone and ${signedPercent(evidence.btc.holdoutNetCompoundedReturn)} under the ${evidence.costs.headlineTotalPctPerSide.toFixed(2)}%-per-side headline cost.`,
        `ETH repeated the break: ${signedPercent(evidence.eth.holdoutGrossCompoundedReturn)} holdout gross became ${signedPercent(evidence.eth.holdoutNetCompoundedReturn)} net. Both assets had ${evidence.btc.positiveFolds} of ${evidence.btc.totalFolds} positive chronological folds.`,
        `The separate daily two-hour lane was not backtested because its published-result break-even cost was only ${evidence.intradayCostNoGo.breakEvenCostPctPerSide.toFixed(4)}% per side, below the fee alone.`,
        'Verdict: FAIL. The adverse artifact remains visible, no better-looking MAX-only control was selected after the result, and this modeled research does not authorize promotion, publication, allocation, broadcast, or execution.',
      ].join(' '),
      evidenceBasis: 'modeled-research',
      disposition: 'human-review-draft-only',
      publishApproved: false,
      resultPath: evidence.resultPath,
      artifactPath: evidence.artifactPath,
    };
  }

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
