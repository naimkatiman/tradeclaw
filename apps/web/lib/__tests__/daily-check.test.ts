import fs from 'fs';
import path from 'path';
import {
  buildDailyCheck,
  DAILY_FOLLOWS_COOKIE,
  DAILY_PREVIOUS_COOKIE,
  formatSigned,
  setFollow,
  snapshotFromStudyFile,
  syncShownCheck,
  type CheckStorage,
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

  it('does not claim a comparison when previous is null', () => {
    const missing = record({ value: null, sampleCount: 0, stale: true, observedAt: '2026-08-29T03:30:00.000Z' });
    const study = record({
      id: 'study-daily-momentum',
      title: 'Daily momentum study',
      value: 0.012,
      unit: 'cost-adjusted return fraction',
      modeledCostBasis: 'Modeled costs from the study file: feePctPerSide 0.0006',
      stale: false,
    });
    const result = buildDailyCheck({
      records: [missing, study],
      previous: null,
      follows: [],
      status: 'ready',
    });

    expect(result.verdictClass).toBe('unchanged');
    expect(result.condition).toBe('stale');
    expect(result.headline.toLowerCase()).toContain('stale');
    expect(result.headline.toLowerCase()).toContain('no earlier observation');
    expect(result.headline.toLowerCase()).not.toContain('nothing material changed');
    expect(result.headline.toLowerCase()).not.toContain('since the last check');
    expect(result.rows[0].plain.toLowerCase()).toContain('no number is substituted');
    expect(result.rows[1].plain.toLowerCase()).toContain('no earlier observation');
    expect(result.rows[1].delta).toBeNull();
    expect(result.nextLook).toContain(missing.updateBoundary ?? '');
    expect(result.nextAction.kind).toBe('finish');

    const firstLook = buildDailyCheck({
      records: [record()],
      previous: null,
      follows: [],
      status: 'ready',
    });
    expect(firstLook.verdictClass).toBe('unchanged');
    expect(firstLook.headline.toLowerCase()).not.toContain('nothing material changed');
    expect(firstLook.headline.toLowerCase()).not.toContain('since the last check');
    expect(firstLook.rows[0].plain.toLowerCase()).toContain('no earlier observation');
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

describe('shown check baseline', () => {
  function memory(): CheckStorage & { values: Map<string, string> } {
    const values = new Map<string, string>();
    return {
      values,
      get(name) {
        return values.get(name) ?? null;
      },
      set(name, value) {
        values.set(name, value);
      },
    };
  }

  it('persists the shown snapshot and compares the next read against it', () => {
    const storage = memory();
    const basis = 'Modeled fee and slippage per sized trade';
    const first = record({ value: -0.41 });
    const opened = syncShownCheck({
      records: [first],
      serverPrevious: null,
      follows: [],
      storage,
      now: '2026-10-16T00:00:00.000Z',
      ignoreStored: false,
      status: 'ready',
    });

    expect(opened.result.headline.toLowerCase()).not.toContain('nothing material changed');
    expect(opened.result.headline.toLowerCase()).not.toContain('since the last check');
    expect(opened.previous).toBeNull();
    const saved = storage.values.get(DAILY_PREVIOUS_COOKIE);
    expect(saved).toContain(String(first.value));

    const moved = record({ value: -0.5, observedAt: '2026-10-17T00:00:00.000Z' });
    const later = syncShownCheck({
      records: [moved],
      serverPrevious: null,
      follows: [],
      storage,
      now: '2026-10-17T00:00:00.000Z',
      ignoreStored: false,
      status: 'ready',
    });
    expect(later.result.verdictClass).toBe('changed');
    expect(later.result.rows[0].delta).toBeCloseTo(-0.5 - -0.41, 10);
    expect(later.result.headline).toContain(formatSigned(-0.5 - -0.41));
    expect(later.result.headline).toContain(basis);
    expect(later.previous?.byId[first.id]?.value).toBe(-0.41);

    const strictRemount = syncShownCheck({
      records: [moved],
      serverPrevious: null,
      follows: [],
      storage,
      now: '2026-10-17T00:00:01.000Z',
      ignoreStored: true,
      status: 'ready',
    });
    expect(strictRemount.previous).toBeNull();
    expect(strictRemount.result.headline.toLowerCase()).not.toContain('since the last check');
    expect(storage.values.get(DAILY_PREVIOUS_COOKIE)).toContain(String(moved.value));
  });

  it('keeps a followed record first when the shown check is read again', () => {
    const storage = memory();
    const records = [
      record({ id: 'cost-adjusted-record' }),
      record({ id: 'prospective-ledger', title: 'Prospective observation ledger', value: 12, unit: 'observations' }),
    ];
    storage.set(DAILY_FOLLOWS_COOKIE, 'prospective-ledger');
    const read = syncShownCheck({
      records,
      serverPrevious: null,
      follows: [],
      storage,
      now: '2026-10-16T00:00:00.000Z',
      ignoreStored: false,
      status: 'ready',
    });
    expect(read.result.rows.map((row) => row.id)).toEqual(['prospective-ledger', 'cost-adjusted-record']);
    expect(read.result.rows[0].followed).toBe(true);
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
