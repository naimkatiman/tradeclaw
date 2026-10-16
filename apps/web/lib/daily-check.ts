/**
 * One daily check over the published public evidence set.
 *
 * A record may cite only these fields: identity, signed figure, unit,
 * modeled-cost basis, sample or count, source, and freshness. The page
 * renders this result. It does not invent a second dataset.
 */

export interface PublishedRecord {
  id: string;
  title: string;
  value: number | null;
  unit: string;
  modeledCostBasis: string;
  sampleCount: number | null;
  source: string;
  observedAt: string | null;
  updateBoundary: string | null;
  stale?: boolean;
}

export interface PreviousObservation {
  recordedAt: string;
  byId: Record<string, { value: number | null; observedAt: string | null }>;
}

export type FigureSign = 'positive' | 'negative' | 'zero' | 'null';
export type DailyCondition =
  | 'loading'
  | 'empty'
  | 'stale'
  | 'error'
  | 'unchanged'
  | 'changed'
  | 'unavailable';
export type VerdictClass = 'changed' | 'unchanged' | 'unavailable';
export type DailyCheckStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface DailyRecordRow {
  id: string;
  title: string;
  followed: boolean;
  state: 'changed' | 'unchanged' | 'unavailable';
  value: number | null;
  sign: FigureSign;
  figure: string;
  unit: string;
  delta: number | null;
  deltaSign: FigureSign;
  deltaFigure: string;
  modeledCostBasis: string;
  sampleCount: number | null;
  sampleLabel: string;
  source: string;
  freshness: string;
  plain: string;
}

export interface DailyNextAction {
  label: string;
  kind: 'finish' | 'retry' | 'wait';
}

export interface DailyCheckResult {
  verdictClass: VerdictClass;
  condition: DailyCondition;
  conditionLabel: string;
  headline: string;
  rows: DailyRecordRow[];
  nextLook: string;
  nextAction: DailyNextAction;
  followedIds: string[];
}

export const DAILY_FOLLOWS_COOKIE = 'tc_daily_follows';
export const DAILY_PREVIOUS_COOKIE = 'tc_daily_previous';

const CONDITION_LABEL: Record<DailyCondition, string> = {
  loading: 'Loading the published record.',
  empty: 'No published record is available.',
  stale: 'This check is stale.',
  error: 'This check could not be read.',
  unchanged: 'This check is unchanged.',
  changed: 'This check is changed.',
  unavailable: 'This check is unavailable.',
};

export function signOf(value: number | null): FigureSign {
  if (value === null || !Number.isFinite(value)) return 'null';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'zero';
}

export function formatSigned(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'null';
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '-';
  const abs = Math.abs(value);
  const body = Number.isInteger(value) ? String(abs) : abs.toFixed(4);
  return `${sign}${body}`;
}

export function isLiveRecordStale(
  observedAtMs: number | null,
  now: number,
  maxAgeDays: number,
): boolean {
  if (observedAtMs === null || !Number.isFinite(observedAtMs) || !Number.isFinite(now)) return false;
  return now - observedAtMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

export function parseFollowList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean))];
}

export function serializeFollowList(ids: readonly string[]): string {
  return parseFollowList(ids.join(',')).join(',');
}

export function setFollow(follows: readonly string[], id: string, followed: boolean): string[] {
  const without = follows.filter((item) => item !== id);
  return followed ? [...without, id] : without;
}

export function parsePreviousObservation(raw: string | null | undefined): PreviousObservation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreviousObservation;
    if (!parsed || typeof parsed.recordedAt !== 'string' || !parsed.byId || typeof parsed.byId !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function observationFromRecords(
  records: readonly PublishedRecord[],
  recordedAt: string,
): PreviousObservation {
  const byId: PreviousObservation['byId'] = {};
  for (const record of records) {
    byId[record.id] = { value: record.value, observedAt: record.observedAt };
  }
  return { recordedAt, byId };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function costBasis(costs: Record<string, unknown> | null): string {
  if (!costs) return 'Modeled cost basis was not in the study file';
  const parts = Object.entries(costs)
    .filter((pair): pair is [string, number] => typeof pair[1] === 'number' && Number.isFinite(pair[1]))
    .map(([key, value]) => `${key} ${value}`);
  if (parts.length === 0) return 'Modeled cost basis was not in the study file';
  return `Modeled costs from the study file: ${parts.join(', ')}`;
}

export function snapshotFromStudyFile(
  id: string,
  title: string,
  fileName: string,
  parsed: unknown,
): PublishedRecord {
  const source = `docs/research/experiments/${fileName}`;
  const unavailable: PublishedRecord = {
    id,
    title,
    value: null,
    unit: 'cost-adjusted return fraction',
    modeledCostBasis: 'Modeled cost basis was not in the study file',
    sampleCount: null,
    source,
    observedAt: null,
    updateBoundary: 'Next look when a readable registry file replaces this study',
    stale: false,
  };
  const root = asRecord(parsed);
  if (!root) return unavailable;
  const meta = asRecord(root.meta);
  const spec = asRecord(root.spec);
  const observedAt = typeof meta?.runAt === 'string' ? meta.runAt : null;
  const basis = costBasis(asRecord(spec?.costs));
  const updateBoundary = observedAt
    ? `Frozen study run at ${observedAt}. Next look when a newer registry file replaces it.`
    : 'Frozen study. Next look when a newer registry file replaces it.';

  const aggregate = asRecord(root.aggregate);
  const firstAggregate = aggregate ? asRecord(Object.values(aggregate)[0]) : null;
  const meanCostedReturn = finiteNumber(firstAggregate?.meanCostedReturn);
  if (firstAggregate && meanCostedReturn !== null) {
    return {
      id,
      title,
      value: meanCostedReturn,
      unit: 'cost-adjusted return fraction',
      modeledCostBasis: basis,
      sampleCount: finiteNumber(firstAggregate.meanTrades),
      source,
      observedAt,
      updateBoundary,
      stale: false,
    };
  }

  const results = asRecord(root.results);
  const full = asRecord(asRecord(results?.A1)?.full);
  const annualizedReturn = finiteNumber(full?.annualizedReturn);
  if (full && annualizedReturn !== null) {
    return {
      id,
      title,
      value: annualizedReturn,
      unit: 'annualized return fraction',
      modeledCostBasis: basis,
      sampleCount: finiteNumber(full.eventCount),
      source,
      observedAt,
      updateBoundary,
      stale: false,
    };
  }

  return unavailable;
}

function orderRecords<T extends { id: string }>(records: readonly T[], follows: readonly string[]): T[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const id of follows) {
    const record = byId.get(id);
    if (!record || seen.has(id)) continue;
    seen.add(id);
    ordered.push(record);
  }
  for (const record of records) {
    if (seen.has(record.id)) continue;
    ordered.push(record);
  }
  return ordered;
}

function nextLookFrom(records: readonly PublishedRecord[]): string {
  const lead = records[0];
  if (!lead) return 'No freshness boundary is published.';
  if (lead.updateBoundary) return `Next look: ${lead.updateBoundary}`;
  if (lead.observedAt) return `Next look when the freshness marker moves past ${lead.observedAt}.`;
  return 'No freshness boundary is published.';
}

function freshnessOf(record: PublishedRecord): string {
  const when = record.observedAt ? `Last updated ${record.observedAt}` : 'Freshness unavailable';
  return record.stale ? `Stale. ${when}` : when;
}

function priorFor(previous: PreviousObservation | null, id: string): { known: boolean; value: number | null } {
  if (!previous || !Object.prototype.hasOwnProperty.call(previous.byId, id)) {
    return { known: false, value: null };
  }
  return { known: true, value: finiteNumber(previous.byId[id]?.value) };
}

function rowFor(record: PublishedRecord, previous: PreviousObservation | null, followed: boolean): DailyRecordRow {
  const sign = signOf(record.value);
  const sampleLabel = record.sampleCount === null ? 'null' : String(record.sampleCount);
  const base = {
    id: record.id,
    title: record.title,
    followed,
    value: record.value,
    sign,
    figure: `${formatSigned(record.value)} ${record.unit}`,
    unit: record.unit,
    modeledCostBasis: record.modeledCostBasis,
    sampleCount: record.sampleCount,
    sampleLabel,
    source: record.source,
    freshness: freshnessOf(record),
  };

  if (record.value === null || !Number.isFinite(record.value)) {
    return {
      ...base,
      state: 'unavailable',
      delta: null,
      deltaSign: 'null',
      deltaFigure: 'null',
      plain: `${record.title} has no figure. No number is substituted.`,
    };
  }

  const prior = priorFor(previous, record.id);
  if (!prior.known || prior.value === null) {
    return {
      ...base,
      state: 'unchanged',
      delta: null,
      deltaSign: 'null',
      deltaFigure: 'null',
      plain: `No earlier observation is saved for ${record.title}. Nothing is reported as a change.`,
    };
  }

  const delta = record.value - prior.value;
  if (delta === 0) {
    return {
      ...base,
      state: 'unchanged',
      delta: 0,
      deltaSign: 'zero',
      deltaFigure: `0 ${record.unit}`,
      plain: `Nothing material changed for ${record.title}.`,
    };
  }

  return {
    ...base,
    state: 'changed',
    delta,
    deltaSign: signOf(delta),
    deltaFigure: `${formatSigned(delta)} ${record.unit}`,
    plain: `${record.title} moved ${formatSigned(delta)} ${record.unit} since the last check, on a ${record.modeledCostBasis} basis.`,
  };
}

function wasCompared(record: PublishedRecord, previous: PreviousObservation | null): boolean {
  if (record.value === null || !Number.isFinite(record.value)) return false;
  const prior = priorFor(previous, record.id);
  return prior.known && prior.value !== null;
}

function finishedAction(condition: DailyCondition): DailyNextAction {
  if (condition === 'loading') return { label: 'Wait for this check to finish', kind: 'wait' };
  if (condition === 'error' || condition === 'empty') return { label: "Try today's check again", kind: 'retry' };
  return { label: 'Done for now', kind: 'finish' };
}

function shell(
  condition: DailyCondition,
  verdictClass: VerdictClass,
  headline: string,
  follows: readonly string[],
  rows: DailyRecordRow[] = [],
  nextLook = 'No freshness boundary is published.',
  conditionLabel = CONDITION_LABEL[condition],
): DailyCheckResult {
  return {
    verdictClass,
    condition,
    conditionLabel,
    headline,
    rows,
    nextLook,
    nextAction: finishedAction(condition),
    followedIds: [...follows],
  };
}

export function buildDailyCheck(input: {
  records: readonly PublishedRecord[];
  previous: PreviousObservation | null;
  follows: readonly string[];
  status?: DailyCheckStatus;
}): DailyCheckResult {
  const follows = parseFollowList(input.follows.join(','));
  const status = input.status ?? 'ready';

  if (status === 'loading') {
    return shell('loading', 'unavailable', CONDITION_LABEL.loading, follows);
  }
  if (status === 'error') {
    return shell('error', 'unavailable', CONDITION_LABEL.error, follows);
  }
  if (status === 'empty' || input.records.length === 0) {
    return shell('empty', 'unavailable', CONDITION_LABEL.empty, follows);
  }

  const ordered = orderRecords(input.records, follows);
  const followSet = new Set(follows);
  const rows = ordered.map((record) => rowFor(record, input.previous, followSet.has(record.id)));
  const nextLook = nextLookFrom(ordered);
  const changed = rows.filter((row) => row.state === 'changed');
  const allUnavailable = rows.every((row) => row.state === 'unavailable');
  const anyStale = ordered.some((record) => record.stale === true);
  const anyCompared = ordered.some((record) => wasCompared(record, input.previous));

  if (changed.length > 0) {
    return shell('changed', 'changed', changed.map((row) => row.plain).join(' '), follows, rows, nextLook);
  }
  if (allUnavailable) {
    return shell(
      'unavailable',
      'unavailable',
      'The published figure is unavailable. No number is substituted.',
      follows,
      rows,
      nextLook,
    );
  }
  if (!anyCompared) {
    const headline = 'No earlier observation is saved, so nothing is reported as a change.';
    if (anyStale) {
      return shell('stale', 'unchanged', `This check is stale. ${headline}`, follows, rows, nextLook);
    }
    return shell('unchanged', 'unchanged', headline, follows, rows, nextLook, 'No earlier observation is saved.');
  }
  if (anyStale) {
    return shell(
      'stale',
      'unchanged',
      'This check is stale. Nothing material changed since the last check.',
      follows,
      rows,
      nextLook,
    );
  }
  return shell(
    'unchanged',
    'unchanged',
    'Nothing material changed since the last check.',
    follows,
    rows,
    nextLook,
  );
}

export interface CheckStorage {
  get(name: string): string | null;
  set(name: string, value: string): void;
}

export function syncShownCheck(input: {
  records: readonly PublishedRecord[];
  serverPrevious: PreviousObservation | null;
  follows: readonly string[];
  storage: CheckStorage;
  now: string;
  ignoreStored: boolean;
  status?: DailyCheckStatus;
}): { result: DailyCheckResult; previous: PreviousObservation | null } {
  const storedFollows = parseFollowList(input.storage.get(DAILY_FOLLOWS_COOKIE));
  const storedPrevious = parsePreviousObservation(input.storage.get(DAILY_PREVIOUS_COOKIE));
  const follows = storedFollows.length > 0 ? storedFollows : parseFollowList(input.follows.join(','));
  const previous = input.ignoreStored ? input.serverPrevious : (storedPrevious ?? input.serverPrevious);
  const status = input.status ?? (input.records.length === 0 ? 'empty' : 'ready');
  const result = buildDailyCheck({ records: input.records, previous, follows, status });
  input.storage.set(DAILY_PREVIOUS_COOKIE, JSON.stringify(observationFromRecords(input.records, input.now)));
  if (follows.length > 0) {
    input.storage.set(DAILY_FOLLOWS_COOKIE, serializeFollowList(follows));
  }
  return { result, previous };
}
