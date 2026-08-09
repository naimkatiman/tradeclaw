import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_STRATEGY_STUDY_ID,
  EXPERIMENT_SHELF,
  FEATURED_STRATEGY_STUDIES,
  STRATEGY_STUDY_SELECTION_POLICY,
  getStrategyStudy,
} from '../strategy-study-catalog';

const experimentDir = resolve(__dirname, '../../../..', 'docs/research/experiments');

interface ReturnMetrics {
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
}

interface D1Artifact {
  results: { portfolio: { full: { strategy: ReturnMetrics; benchmark: ReturnMetrics } } };
  decision: { verdict: string; calmarFoldPasses: number };
}

interface H1Result {
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
}

interface H1Artifact {
  results: Record<'classic' | 'regime-aware' | 'vwap-ema-bb', { full: H1Result }>;
}

interface DailyArtifact {
  aggregate: {
    'signal-flip': {
      meanCostedReturnExFlukes: number;
      meanCostedReturn: number;
      foldStability: number;
      verdict: string;
    };
  };
}

interface CarryArtifact {
  results: {
    A1: {
      full: { annualizedReturn: number; returnOnCapital: number };
      recent: { annualizedReturn: number };
      gates: { pass: boolean };
    };
  };
}

interface CrossSectionArtifact {
  full: {
    b1: { totalReturn: number };
    gates: { B1: { pass: boolean } };
  };
  subwindow: {
    b1: { totalReturn: number };
    gates: { B1: { pass: boolean } };
  };
}

function artifact<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(experimentDir, file), 'utf8')) as T;
}

function study(id: string) {
  const record = FEATURED_STRATEGY_STUDIES.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Missing featured study: ${id}`);
  return record;
}

function metricValue(id: string, label: string): number | string {
  const metric = study(id).metrics.find((candidate) => candidate.label === label);
  if (!metric) throw new Error(`Missing metric ${label} on ${id}`);
  return metric.value;
}

describe('strategy study catalog integrity', () => {
  it('freezes exactly seven featured records and defaults by evidence tier', () => {
    expect(FEATURED_STRATEGY_STUDIES.map((record) => record.id)).toEqual([
      'd1-slow-gate',
      'classic-h1',
      'regime-aware-h1',
      'vwap-ema-bb-h1',
      'daily-momentum',
      'funding-carry',
      'cross-sectional-momentum',
    ]);
    expect(DEFAULT_STRATEGY_STUDY_ID).toBe('d1-slow-gate');
    expect(getStrategyStudy(null).id).toBe(DEFAULT_STRATEGY_STUDY_ID);
    expect(getStrategyStudy('unknown-after-positive-result').id).toBe(DEFAULT_STRATEGY_STUDY_ID);
    expect(STRATEGY_STUDY_SELECTION_POLICY).toMatch(/evidence tier/i);
    expect(STRATEGY_STUDY_SELECTION_POLICY).toMatch(/Return is never/i);
  });

  it('publishes the exact D1 slow-gate paper-pass values and claim boundary', () => {
    const file = 'd1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json';
    const source = artifact<D1Artifact>(file);
    const record = study('d1-slow-gate');

    expect(record.artifactFile).toBe(file);
    expect(record.status).toBe('paper-pass');
    expect(record.headline.value).toBe(source.results.portfolio.full.strategy.totalReturn);
    expect(metricValue(record.id, 'Identically costed hold')).toBe(
      source.results.portfolio.full.benchmark.totalReturn,
    );
    expect(metricValue(record.id, 'Modeled CAGR')).toBe(
      source.results.portfolio.full.strategy.cagr,
    );
    expect(metricValue(record.id, 'Modeled max drawdown')).toBe(
      -source.results.portfolio.full.strategy.maxDrawdown,
    );
    expect(source.decision.verdict).toBe('PASS');
    expect(source.decision.calmarFoldPasses).toBe(3);
    expect(record.caveat).toMatch(/not live performance|not .*broker return/i);
  });

  it('cross-checks all three featured H1 cards against the production-cost artifact', () => {
    const file = 'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json';
    const source = artifact<H1Artifact>(file);
    const mappings = [
      ['classic-h1', 'classic'],
      ['regime-aware-h1', 'regime-aware'],
      ['vwap-ema-bb-h1', 'vwap-ema-bb'],
    ] as const;

    for (const [studyId, resultId] of mappings) {
      const record = study(studyId);
      const result = source.results[resultId].full;
      expect(record.artifactFile).toBe(file);
      expect(record.headline.value).toBe(result.totalReturn);
      expect(metricValue(studyId, 'Trades')).toBe(result.totalTrades);
      expect(metricValue(studyId, 'Win rate')).toBe(result.winRate);
      expect(metricValue(studyId, 'Profit factor')).toBe(result.profitFactor);
    }
  });

  it('uses the registered robustness readings for daily momentum, carry, and cross-section', () => {
    const daily = artifact<DailyArtifact>(
      'daily-momentum-validation-BTCUSD_ETHUSD_SOLUSD_BNBUSD_XRPUSD_ADAUSD_DOGEUSD_DOTUSD_LINKUSD_AVAXUSD-D1-f4.json',
    ).aggregate['signal-flip'];
    expect(study('daily-momentum').headline.value).toBe(daily.meanCostedReturnExFlukes);
    expect(metricValue('daily-momentum', 'Raw mean return')).toBe(daily.meanCostedReturn);
    expect(metricValue('daily-momentum', 'Fold stability')).toBe(daily.foldStability);
    expect(daily.verdict).toBe('MARGINAL');

    const carry = artifact<CarryArtifact>('carry-validation-10majors-f4.json').results.A1;
    expect(study('funding-carry').headline.value).toBe(carry.full.annualizedReturn);
    expect(metricValue('funding-carry', 'Full-window return')).toBe(carry.full.returnOnCapital);
    expect(metricValue('funding-carry', 'Recent 24-month annualized')).toBe(
      carry.recent.annualizedReturn,
    );
    expect(carry.gates.pass).toBe(false);

    const crossSection = artifact<CrossSectionArtifact>(
      'xsection-validation-30majors-D1-lb14-rb7-top5-f4.json',
    );
    expect(study('cross-sectional-momentum').headline.value).toBe(
      crossSection.subwindow.b1.totalReturn,
    );
    expect(metricValue('cross-sectional-momentum', 'Full-window return')).toBe(
      crossSection.full.b1.totalReturn,
    );
    expect(crossSection.full.gates.B1.pass).toBe(false);
    expect(crossSection.subwindow.gates.B1.pass).toBe(false);
  });

  it('never paints a positive rejected or inconclusive headline as a pass', () => {
    const positiveNonPasses = FEATURED_STRATEGY_STUDIES.filter(
      (record) => record.status !== 'paper-pass' && Number(record.headline.value) > 0,
    );

    expect(positiveNonPasses.map((record) => record.id)).toEqual([
      'regime-aware-h1',
      'funding-carry',
    ]);
    for (const record of positiveNonPasses) {
      expect(record.headline.tone).toBe('neutral');
      expect(record.statusLabel).not.toMatch(/^pass/i);
    }
  });

  it('keeps every committed JSON experiment in a unique, reasoned shelf entry', () => {
    const committedFiles = readdirSync(experimentDir)
      .filter((file) => file.endsWith('.json'))
      .sort();
    const shelfFiles = EXPERIMENT_SHELF.map((entry) => entry.file).sort();

    expect(shelfFiles).toEqual(committedFiles);
    expect(new Set(shelfFiles).size).toBe(shelfFiles.length);
    expect(EXPERIMENT_SHELF.every((entry) => entry.reason.length >= 40)).toBe(true);

    const legacy = EXPERIMENT_SHELF.find((entry) => entry.file.includes('legacy-zero'));
    const hmm = EXPERIMENT_SHELF.find((entry) => entry.file.startsWith('regime-hmm'));
    expect(legacy).toMatchObject({ disposition: 'shelved' });
    expect(legacy?.reason).toMatch(/zero-cost|production cost/i);
    expect(hmm).toMatchObject({ disposition: 'shelved' });
    expect(hmm?.reason).toMatch(/diagnostic|no standalone trading return/i);
  });
});
