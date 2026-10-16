import fs from 'fs';
import path from 'path';
import {
  buildDailyCheck,
  formatSigned,
  setFollow,
  snapshotFromStudyFile,
  type PublishedRecord,
  type PreviousObservation,
} from '../daily-check';

function record(overrides: Partial<PublishedRecord> = {}): PublishedRecord {
  return {
    id: 'cost-adjusted-record',
    title: 'Cost-adjusted signal record',
    value: -0.41,
    unit: 'R',
    modeledCostBasis: 'Modeled fee and slippage per sized trade',
    sampleCount: 120,
    source: '/api/signals/equity?summaryOnly=1&scope=pro',
    observedAt: '2026-10-15T00:00:00.000Z',
    updateBoundary: 'Next counted 24-hour outcome on the cost-adjusted record',
    stale: false,
    ...overrides,
  };
}

function previousOf(records: PublishedRecord[], recordedAt = '2026-10-14T00:00:00.000Z'): PreviousObservation {
  return {
    recordedAt,
    byId: Object.fromEntries(records.map((item) => [item.id, { value: item.value, observedAt: item.observedAt }])),
  };
}

describe('daily check comparison', () => {
  it('names a signed delta and the modeled-cost basis when a figure changes', () => {
    const current = -0.5;
    const prior = -0.41;
    const basis = 'Modeled fee and slippage per sized trade';
    const changed = record({ value: current, observedAt: '2026-10-16T00:00:00.000Z' });
    const steady = record({
      id: 'study-carry',
      title: 'Carry study',
      value: 0.02,
      unit: 'annualized return fraction',
      source: 'docs/research/experiments/carry-validation-10majors-f4.json',
    });
    const result = buildDailyCheck({
      records: [changed, steady],
      previous: previousOf([record({ value: prior }), steady]),
      follows: [],
      status: 'ready',
    });

    expect(result.verdictClass).toBe('changed');
    expect(result.rows[0].delta).toBeCloseTo(current - prior, 10);
    expect(result.rows[0].deltaSign).toBe('negative');
    expect(result.rows[0].sign).toBe('negative');
    expect(result.headline).toContain(formatSigned(current - prior));
    expect(result.headline).toContain(changed.unit);
    expect(result.headline).toContain(basis);
    expect(result.rows[0].modeledCostBasis).toBe(basis);
    expect(result.rows[0].sampleLabel).toBe(String(changed.sampleCount));
    expect(result.rows[0].source).toBe(changed.source);
    expect(result.rows[0].freshness).toContain(changed.observedAt ?? '');
    expect(result.nextLook).toContain(changed.updateBoundary ?? '');
    expect(result.rows.map((row) => row.id)).toEqual(['cost-adjusted-record', 'study-carry']);
  });

  it('returns an unchanged finished state and a next look from freshness', () => {
    const same = record();
    const result = buildDailyCheck({
      records: [same],
      previous: previousOf([same]),
      follows: [],
      status: 'ready',
    });

    expect(result.verdictClass).toBe('unchanged');
    expect(result.condition).toBe('unchanged');
    expect(result.headline.toLowerCase()).toContain('nothing material changed');
    expect(result.rows[0].delta).toBe(0);
    expect(result.rows[0].figure).toContain(formatSigned(same.value));
    expect(result.nextLook).toContain(same.updateBoundary ?? '');
    expect(result.nextAction.kind).toBe('finish');
    expect(result.headline).not.toMatch(/placeholder/i);
  });

  it('returns a null or unavailable finished state without a substitute figure', () => {
    const missing = record({ value: null, sampleCount: null, observedAt: null });
    const result = buildDailyCheck({
      records: [missing],
      previous: null,
      follows: ['cost-adjusted-record'],
      status: 'ready',
    });

    expect(result.verdictClass).toBe('unavailable');
    expect(result.condition).toBe('unavailable');
    expect(result.rows[0].value).toBeNull();
    expect(result.rows[0].delta).toBeNull();
    expect(result.rows[0].sign).toBe('null');
    expect(result.rows[0].figure).toContain('null');
    expect(result.headline.toLowerCase()).toMatch(/unavailable|no number/);
    expect(result.nextLook).toContain(missing.updateBoundary ?? '');
    expect(result.followedIds).toEqual(['cost-adjusted-record']);
    expect(result.rows[0].followed).toBe(true);
  });

  it('names stale, empty, and unread checks without dropping follows', () => {
    const stale = buildDailyCheck({
      records: [record({ stale: true })],
      previous: previousOf([record({ stale: true })]),
      follows: ['cost-adjusted-record'],
      status: 'ready',
    });
    expect(stale.condition).toBe('stale');
    expect(stale.verdictClass).toBe('unchanged');
    expect(stale.headline.toLowerCase()).toContain('stale');
    expect(stale.nextLook).toContain('Next counted 24-hour outcome');
    expect(stale.followedIds).toEqual(['cost-adjusted-record']);

    const empty = buildDailyCheck({
      records: [],
      previous: null,
      follows: ['study-carry'],
      status: 'empty',
    });
    expect(empty.condition).toBe('empty');
    expect(empty.verdictClass).toBe('unavailable');
    expect(empty.headline.toLowerCase()).toContain('no published record');
    expect(empty.followedIds).toEqual(['study-carry']);
    expect(empty.nextAction.kind).toBe('retry');

    const unread = buildDailyCheck({
      records: [],
      previous: null,
      follows: ['study-carry'],
      status: 'error',
    });
    expect(unread.condition).toBe('error');
    expect(unread.headline.toLowerCase()).toContain('could not be read');
    expect(unread.followedIds).toEqual(['study-carry']);

    const loading = buildDailyCheck({
      records: [],
      previous: null,
      follows: ['study-carry'],
      status: 'loading',
    });
    expect(loading.condition).toBe('loading');
    expect(loading.conditionLabel).toContain('Loading the published record');
    expect(loading.followedIds).toEqual(['study-carry']);
    expect(loading.nextAction.kind).toBe('wait');
  });
});

describe('daily check follows', () => {
  it('puts a followed record first and drops it after unfollow', () => {
    const records = [
      record({ id: 'cost-adjusted-record', title: 'Cost-adjusted signal record' }),
      record({ id: 'prospective-ledger', title: 'Prospective observation ledger', value: 12, unit: 'observations' }),
    ];
    const followed = setFollow([], 'prospective-ledger', true);
    const read = buildDailyCheck({ records, previous: null, follows: followed, status: 'ready' });
    expect(read.rows.map((row) => row.id)).toEqual(['prospective-ledger', 'cost-adjusted-record']);
    expect(read.rows[0].followed).toBe(true);

    const removed = setFollow(followed, 'prospective-ledger', false);
    const again = buildDailyCheck({ records, previous: null, follows: removed, status: 'ready' });
    expect(again.rows.map((row) => row.id)).toEqual(['cost-adjusted-record', 'prospective-ledger']);
    expect(again.followedIds).not.toContain('prospective-ledger');
    expect(again.rows.every((row) => row.followed === false)).toBe(true);
  });
});

describe('published study snapshots', () => {
  const experiments = path.resolve(__dirname, '../../../../docs/research/experiments');

  it('reads the momentum study figure from the published file', () => {
    const fileName = 'daily-momentum-validation-BTCUSD-D1-f4.json';
    const parsed = JSON.parse(fs.readFileSync(path.join(experiments, fileName), 'utf8')) as {
      meta: { runAt: string };
      spec: { costs: { feePctPerSide: number } };
      aggregate: { 'signal-flip': { meanCostedReturn: number; meanTrades: number } };
    };
    const snap = snapshotFromStudyFile('study-daily-momentum', 'Daily momentum study', fileName, parsed);
    expect(snap.value).toBe(parsed.aggregate['signal-flip'].meanCostedReturn);
    expect(snap.sampleCount).toBe(parsed.aggregate['signal-flip'].meanTrades);
    expect(snap.observedAt).toBe(parsed.meta.runAt);
    expect(snap.modeledCostBasis).toContain(String(parsed.spec.costs.feePctPerSide));
    expect(snap.unit).toBe('cost-adjusted return fraction');
  });

  it('reads the carry study figure from the published file', () => {
    const fileName = 'carry-validation-10majors-f4.json';
    const parsed = JSON.parse(fs.readFileSync(path.join(experiments, fileName), 'utf8')) as {
      meta: { runAt: string };
      spec: { costs: { roundTrip: number } };
      results: { A1: { full: { annualizedReturn: number; eventCount: number } } };
    };
    const snap = snapshotFromStudyFile('study-carry', 'Carry study', fileName, parsed);
    expect(snap.value).toBe(parsed.results.A1.full.annualizedReturn);
    expect(snap.sampleCount).toBe(parsed.results.A1.full.eventCount);
    expect(snap.observedAt).toBe(parsed.meta.runAt);
    expect(snap.modeledCostBasis).toContain(String(parsed.spec.costs.roundTrip));
  });
});
