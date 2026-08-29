import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RESEARCH_INTAKE_SELECTION_POLICY,
  RESEARCH_INTAKE_WORKFLOW,
  SYSTEMATIC_INTAKE_COMMIT,
  SYSTEMATIC_INTAKE_EXPECTED_CANDIDATES,
  SYSTEMATIC_INTAKE_README_SHA256,
  SYSTEMATIC_RESEARCH_INTAKE,
  SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
  filterResearchIntake,
  parseSystematicResearchIntakeSnapshot,
  summarizeResearchIntake,
} from '../research-intake';

const root = resolve(__dirname, '../../../..');
const manifestPath = resolve(root, 'apps/web/data/systematic-research-intake.json');
const artifactPath = resolve(
  root,
  'docs/research/experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json',
);
const priceOverreactionsAuditPath = resolve(
  root,
  'docs/research/2026-08-29-price-overreactions-source-audit.md',
);
const treasuryAuditPath = resolve(
  root,
  'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
);
const treasuryResultPath = resolve(
  root,
  'docs/research/2026-08-29-end-of-month-treasury-replication-result.md',
);
const treasuryArtifactPath = resolve(
  root,
  'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json',
);

interface ReplicationMetrics {
  grossCompoundedReturn: number;
  netCompoundedReturn: number;
  completedTrades: number;
  meanGrossTradeReturn: number;
  meanNetTradeReturn: number;
  netTradeTStatistic: number;
}

interface ReplicationArtifact {
  meta: {
    task: string;
    catalogCommit: string;
    preregistrationSha256: string;
    sourceAuditCorrection: { gateInputsChanged: boolean; verdictChanged: boolean };
  };
  spec: {
    costs: { feePctPerSide: number; slippagePctPerSide: number; fundingPctPer8h: number };
  };
  results: {
    symbols: Record<
      'BTCUSD' | 'ETHUSD',
      {
        configurations: {
          'd1h1-macd-negative-bar-exit': {
            full: ReplicationMetrics;
            holdout: ReplicationMetrics;
            folds: Array<{ metrics: ReplicationMetrics }>;
          };
        };
      }
    >;
    portfolio: {
      strategy: {
        full: {
          grossCompoundedReturn: number;
          netCompoundedReturn: number;
          maximumDrawdown: number;
          calmar: number;
        };
        holdout: { netCompoundedReturn: number };
      };
    };
  };
  decision: {
    btcReplication: { verdict: string; positiveFolds: number };
    portfolioCandidate: { verdict: string; ethPositiveFolds: number };
    eligibleForProspectiveReview: boolean;
    activationApproved: boolean;
  };
}

interface TreasuryArtifact {
  meta: {
    task: string;
    preregistrationSha256: string;
    sourceAuditSha256: string;
  };
  qa: {
    nominalRows: number;
    financingRows: number;
    evaluationMonths: number;
    holdoutMonths: number;
    suppliedYieldChecks: number;
    suppliedYieldChecksAboveTolerance: number;
    maximumSuppliedYieldErrorPct: number;
    maximumSuppliedYieldError: {
      date: string;
      maturityYears: number;
    };
    passed: boolean;
  };
  results: null;
  observations: null;
  decision: {
    verdict: string;
    performanceGatesEvaluated: boolean;
    eligibleForProspectiveReview: boolean;
    activationApproved: boolean;
    publicationApproved: boolean;
  };
}

function manifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
}

describe('systematic research intake', () => {
  it('pins and validates every upstream discovery row without promoting gross metadata', () => {
    expect(SYSTEMATIC_RESEARCH_INTAKE_SOURCE).toMatchObject({
      commit: SYSTEMATIC_INTAKE_COMMIT,
      readmeSha256: SYSTEMATIC_INTAKE_README_SHA256,
      reportedPerformanceBasis: 'gross-of-trading-costs',
      tradeClawTreatment: 'discovery-only',
    });
    expect(SYSTEMATIC_RESEARCH_INTAKE).toHaveLength(SYSTEMATIC_INTAKE_EXPECTED_CANDIDATES);
    expect(new Set(SYSTEMATIC_RESEARCH_INTAKE.map((record) => record.id)).size).toBe(61);
    expect(SYSTEMATIC_RESEARCH_INTAKE.every((record) => record.discoveryBasis === 'upstream-gross-metadata')).toBe(true);
    expect(RESEARCH_INTAKE_SELECTION_POLICY).toMatch(/gross discovery metadata/i);
    expect(RESEARCH_INTAKE_SELECTION_POLICY).toMatch(/never .*default sort|never .*promotion/i);
  });

  it('preserves the exact asset-class population and source order', () => {
    const summary = summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE);
    expect(summary.byAssetClass).toEqual({
      Equities: 12,
      Bonds: 12,
      Commodities: 3,
      Currencies: 4,
      Cryptocurrencies: 8,
      Derivatives: 10,
      'Multi-asset': 12,
    });
    expect(SYSTEMATIC_RESEARCH_INTAKE.map((record) => record.sourcePosition)).toEqual(
      Array.from({ length: 61 }, (_, index) => index),
    );
    expect(SYSTEMATIC_RESEARCH_INTAKE[0].id).toBe(
      'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
    );
    expect(SYSTEMATIC_RESEARCH_INTAKE.at(-1)?.id).toBe(
      'a-risk-based-approach-to-tactical-asset-allocation',
    );
  });

  it('keeps replication evidence separate from source-audit no-go evidence', () => {
    const tested = SYSTEMATIC_RESEARCH_INTAKE.filter((record) => record.tradeClawEvidence);
    expect(tested).toHaveLength(2);
    const tc255 = tested.find((record) => record.tradeClawEvidence?.taskId === 'TC-255');
    expect(tc255).toMatchObject({
      id: 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      stage: 'replicated',
      verdict: 'fail',
      costStatus: 'failed',
      marketingDisposition: 'human-review-draft-only',
    });
    expect(tc255?.nextAction).toMatch(/without retuning or promotion/i);
    expect(tc255?.tradeClawSourceAudit).toBeNull();

    const tc257 = tested.find((record) => record.tradeClawEvidence?.taskId === 'TC-257');
    expect(tc257).toMatchObject({
      id: 'predictable-end-of-month-treasury-returns',
      stage: 'replicated',
      verdict: 'inconclusive',
      costStatus: 'unassessed',
      marketingDisposition: 'human-review-draft-only',
      tradeClawSourceAudit: { disposition: 'advance' },
      tradeClawEvidence: {
        performanceGatesEvaluated: false,
        eligibleForProspectiveReview: false,
      },
    });
    expect(tc257?.nextAction).toMatch(/separately hashed protocol/i);

    const sourceAudited = SYSTEMATIC_RESEARCH_INTAKE.filter(
      (record) => record.tradeClawSourceAudit,
    );
    expect(sourceAudited).toHaveLength(2);
    const noGo = sourceAudited.find(
      (record) => record.id === 'price-overreactions-in-the-cryptocurrency-market',
    );
    expect(noGo).toMatchObject({
      id: 'price-overreactions-in-the-cryptocurrency-market',
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      marketingDisposition: 'none',
      tradeClawEvidence: null,
      tradeClawSourceAudit: {
        disposition: 'no-go',
        tradeClawBacktestRun: false,
      },
    });
    expect(noGo?.nextAction).toMatch(/materially new hypothesis/i);

    const untouched = SYSTEMATIC_RESEARCH_INTAKE.filter(
      (record) => !record.tradeClawEvidence && !record.tradeClawSourceAudit,
    );
    expect(untouched).toHaveLength(58);
    expect(untouched.every((record) => record.stage === 'discovered')).toBe(true);
    expect(untouched.every((record) => record.verdict === 'not-tested')).toBe(true);
    expect(untouched.every((record) => record.costStatus === 'unassessed')).toBe(true);
    expect(untouched.every((record) => record.marketingDisposition === 'none')).toBe(true);
  });

  it('binds the TC-256 no-go overlay to the audited primary source and local receipt', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.id === 'price-overreactions-in-the-cryptocurrency-market',
    );
    const audit = record?.tradeClawSourceAudit;
    if (!audit || audit.taskId !== 'TC-256') {
      throw new Error('TC-256 price-overreactions source audit is missing');
    }

    const canonicalAuditBytes = Buffer.from(
      readFileSync(priceOverreactionsAuditPath, 'utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalAuditBytes).digest('hex')).toBe(
      audit.researchSha256,
    );
    expect(audit.primarySource).toMatchObject({
      repositoryUrl: 'https://bura.brunel.ac.uk/handle/2438/17194',
      documentSha256: 'b979248a3d5d1abe47876a43fae2575b61ade80c8d3508a5077985d23e2168ee',
      redistributionRightsEstablished: false,
    });
    expect(audit.publishedRule).toMatchObject({
      cadence: 'daily',
      eventWindowDays: 30,
      thresholdStandardDeviations: 1,
      bitcoinTrades: 155,
    });
    expect(audit.publishedResult).toEqual({
      contrarianProfitUsd: -6279.29,
      contrarianTradeTStatistic: -1.53,
      continuationProfitUsd: 5879.08,
      continuationTradeTStatistic: 1.44,
      oneSidedCriticalTStatistic: 1.66,
      conclusion: 'no-exploitable-profit',
    });
    expect(audit.blockers).toHaveLength(5);
  });

  it('binds the TC-257 inconclusive overlay to its QA-only artifact and receipts', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.id === 'predictable-end-of-month-treasury-returns',
    );
    const evidence = record?.tradeClawEvidence;
    const audit = record?.tradeClawSourceAudit;
    if (!evidence || evidence.taskId !== 'TC-257') {
      throw new Error('TC-257 Treasury evidence is missing');
    }
    if (!audit || audit.taskId !== 'TC-257') {
      throw new Error('TC-257 Treasury source audit is missing');
    }

    function canonicalHash(path: string): string {
      const bytes = Buffer.from(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
      return createHash('sha256').update(bytes).digest('hex');
    }

    const artifact = JSON.parse(readFileSync(treasuryArtifactPath, 'utf8')) as TreasuryArtifact;
    expect(canonicalHash(treasuryAuditPath)).toBe(audit.researchSha256);
    expect(canonicalHash(treasuryResultPath)).toBe(evidence.resultSha256);
    expect(canonicalHash(treasuryArtifactPath)).toBe(evidence.artifactSha256);
    expect(artifact.meta).toMatchObject({
      task: evidence.taskId,
      preregistrationSha256: evidence.preregistrationSha256,
      sourceAuditSha256: evidence.sourceAuditSha256,
    });
    expect(artifact.qa).toMatchObject({
      nominalRows: evidence.qa.nominalRows,
      financingRows: evidence.qa.financingRows,
      evaluationMonths: evidence.qa.evaluationMonths,
      holdoutMonths: evidence.qa.holdoutMonths,
      suppliedYieldChecks: evidence.qa.suppliedYieldChecks,
      suppliedYieldChecksAboveTolerance: 1,
      maximumSuppliedYieldErrorPct: evidence.qa.maximumErrorPct,
      maximumSuppliedYieldError: {
        date: evidence.qa.maximumErrorDate,
        maturityYears: evidence.qa.maximumErrorMaturityYears,
      },
      passed: false,
    });
    expect(artifact.results).toBeNull();
    expect(artifact.observations).toBeNull();
    expect(artifact.decision).toMatchObject({
      verdict: 'INCONCLUSIVE',
      performanceGatesEvaluated: false,
      eligibleForProspectiveReview: false,
      activationApproved: false,
      publicationApproved: false,
    });
    expect(audit).toMatchObject({
      disposition: 'advance',
      tradeClawBacktestRunAtAuditClose: false,
      publishedRule: { cadence: 'monthly', expectedRoundTripsPerYear: 12 },
      publishedResult: { fiveYearMeanMonthlyExcessReturnPct: 0.13 },
    });
  });

  it('cross-checks the TC-255 overlay against the canonical artifact and artifact hash', () => {
    const artifactBytes = readFileSync(artifactPath);
    const artifact = JSON.parse(artifactBytes.toString('utf8')) as ReplicationArtifact;
    const record = SYSTEMATIC_RESEARCH_INTAKE.find(
      (candidate) => candidate.tradeClawEvidence?.taskId === 'TC-255',
    );
    const evidence = record?.tradeClawEvidence;
    if (!evidence || evidence.taskId !== 'TC-255') {
      throw new Error('TC-255 evidence is missing');
    }

    const btc = artifact.results.symbols.BTCUSD.configurations['d1h1-macd-negative-bar-exit'];
    const eth = artifact.results.symbols.ETHUSD.configurations['d1h1-macd-negative-bar-exit'];
    const portfolio = artifact.results.portfolio.strategy;

    const canonicalLfBytes = Buffer.from(
      artifactBytes.toString('utf8').replace(/\r\n/g, '\n'),
      'utf8',
    );
    expect(createHash('sha256').update(canonicalLfBytes).digest('hex')).toBe(
      evidence.artifactSha256,
    );
    expect(artifact.meta.task).toBe(evidence.taskId);
    expect(artifact.meta.catalogCommit).toBe(SYSTEMATIC_INTAKE_COMMIT);
    expect(artifact.meta.preregistrationSha256).toBe(evidence.preregistrationSha256);
    expect(artifact.meta.sourceAuditCorrection).toEqual(
      expect.objectContaining({ gateInputsChanged: false, verdictChanged: false }),
    );
    expect(artifact.spec.costs).toEqual(evidence.costs);
    expect(artifact.decision).toEqual(
      expect.objectContaining({
        eligibleForProspectiveReview: false,
        activationApproved: false,
      }),
    );
    expect(artifact.decision.btcReplication).toMatchObject({ verdict: 'FAIL', positiveFolds: 0 });
    expect(artifact.decision.portfolioCandidate).toMatchObject({
      verdict: 'FAIL',
      ethPositiveFolds: 0,
    });

    expect(evidence.btc).toMatchObject({
      grossCompoundedReturn: btc.full.grossCompoundedReturn,
      netCompoundedReturn: btc.full.netCompoundedReturn,
      completedTrades: btc.full.completedTrades,
      meanGrossTradeReturn: btc.full.meanGrossTradeReturn,
      meanNetTradeReturn: btc.full.meanNetTradeReturn,
      netTradeTStatistic: btc.full.netTradeTStatistic,
      holdoutNetCompoundedReturn: btc.holdout.netCompoundedReturn,
    });
    expect(evidence.eth).toMatchObject({
      grossCompoundedReturn: eth.full.grossCompoundedReturn,
      netCompoundedReturn: eth.full.netCompoundedReturn,
      completedTrades: eth.full.completedTrades,
      meanNetTradeReturn: eth.full.meanNetTradeReturn,
      netTradeTStatistic: eth.full.netTradeTStatistic,
      holdoutNetCompoundedReturn: eth.holdout.netCompoundedReturn,
    });
    expect(evidence.btc.positiveFolds).toBe(
      btc.folds.filter((fold) => fold.metrics.netCompoundedReturn > 0).length,
    );
    expect(evidence.eth.positiveFolds).toBe(
      eth.folds.filter((fold) => fold.metrics.netCompoundedReturn > 0).length,
    );
    expect(evidence.portfolio).toEqual({
      grossCompoundedReturn: portfolio.full.grossCompoundedReturn,
      netCompoundedReturn: portfolio.full.netCompoundedReturn,
      holdoutNetCompoundedReturn: portfolio.holdout.netCompoundedReturn,
      maximumDrawdown: portfolio.full.maximumDrawdown,
      calmar: portfolio.full.calmar,
    });
  });

  it('summarizes and filters by next-action evidence state rather than upstream return', () => {
    expect(summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE)).toMatchObject({
      total: 61,
      discovered: 58,
      sourceAudited: 1,
      preregistered: 0,
      replicated: 2,
      prospective: 0,
      passed: 0,
      failed: 1,
      inconclusive: 1,
      untested: 59,
      sourceNoGo: 1,
    });
    expect(
      filterResearchIntake(SYSTEMATIC_RESEARCH_INTAKE, {
        query: 'bitcoin',
        assetClass: 'Cryptocurrencies',
      }).map((record) => record.id),
    ).toEqual([
      'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      'seasonality-trend-following-and-mean-reversion-in-bitcoin',
    ]);
    expect(
      filterResearchIntake(SYSTEMATIC_RESEARCH_INTAKE, {
        stage: 'replicated',
        verdict: 'fail',
      }).map((record) => record.id),
    ).toEqual(['how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin']);
    expect(
      filterResearchIntake(SYSTEMATIC_RESEARCH_INTAKE, {
        stage: 'replicated',
        verdict: 'inconclusive',
        sourceAuditDisposition: 'advance',
      }).map((record) => record.id),
    ).toEqual(['predictable-end-of-month-treasury-returns']);
    expect(
      filterResearchIntake(SYSTEMATIC_RESEARCH_INTAKE, {
        stage: 'source-audited',
        sourceAuditDisposition: 'no-go',
      }).map((record) => record.id),
    ).toEqual(['price-overreactions-in-the-cryptocurrency-market']);
  });

  it('defines a strict cost-first progression with a separate prospective boundary', () => {
    expect(RESEARCH_INTAKE_WORKFLOW.map((step) => step.stage)).toEqual([
      'discovered',
      'source-audited',
      'preregistered',
      'replicated',
      'prospective',
    ]);
    expect(RESEARCH_INTAKE_WORKFLOW[2].exitGate).toMatch(/costs.*hashes.*holdout/i);
    expect(RESEARCH_INTAKE_WORKFLOW[3].exitGate).toMatch(/deterministic artifact.*PASS\/FAIL\/INCONCLUSIVE/i);
    expect(RESEARCH_INTAKE_WORKFLOW[4].exitGate).toMatch(/separate owner actions/i);
  });

  it('fails closed on schema drift, duplicate ids, source mismatch, and gross/net relabeling', () => {
    const valid = manifest();
    expect(parseSystematicResearchIntakeSnapshot(valid).candidates).toHaveLength(61);

    const extraKey = manifest();
    extraKey.unreviewed = true;
    expect(() => parseSystematicResearchIntakeSnapshot(extraKey)).toThrow(/keys must be exactly/i);

    const duplicate = manifest();
    const duplicateCandidates = duplicate.candidates as Array<Record<string, unknown>>;
    duplicateCandidates[1].id = duplicateCandidates[0].id;
    duplicateCandidates[1].sourceUrl = duplicateCandidates[0].sourceUrl;
    expect(() => parseSystematicResearchIntakeSnapshot(duplicate)).toThrow(/duplicate research intake id/i);

    const wrongSource = manifest();
    const wrongCandidates = wrongSource.candidates as Array<Record<string, unknown>>;
    wrongCandidates[0].sourceUrl = 'https://example.com/not-the-pinned-source';
    expect(() => parseSystematicResearchIntakeSnapshot(wrongSource)).toThrow(/must match its pinned candidate id/i);

    const relabeled = manifest();
    (relabeled.source as Record<string, unknown>).reportedPerformanceBasis = 'net-of-trading-costs';
    expect(() => parseSystematicResearchIntakeSnapshot(relabeled)).toThrow(/must remain gross-of-trading-costs/i);
  });
});
