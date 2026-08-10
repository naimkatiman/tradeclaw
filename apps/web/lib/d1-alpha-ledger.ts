import type { PoolClient } from 'pg';
import { withClient, query } from './db-pool';
import {
  D1_ALPHA_ARTIFACT_SHA256,
  D1_ALPHA_DATA_SOURCE,
  D1_ALPHA_DAY_MS,
  D1_ALPHA_MIN_CALENDAR_DAYS,
  D1_ALPHA_MIN_CLOSED_TRADES,
  D1_ALPHA_MIN_SNAPSHOTS,
  D1_ALPHA_RULE_SHA256,
  D1_ALPHA_STRATEGY_VERSION,
  advanceD1AlphaSnapshot,
  buildD1AlphaHashedSnapshot,
  calculateD1AlphaMetrics,
  canonicalD1AlphaPayload,
  createInitialD1AlphaSnapshot,
  evaluateD1AlphaGate,
  hashD1AlphaSnapshot,
  validateD1AlphaObservation,
  type D1AlphaGateEvaluation,
  type D1AlphaHashedSnapshot,
  type D1AlphaMetrics,
  type D1AlphaObservation,
  type D1AlphaSnapshotPayload,
  type D1AlphaStatus,
} from './d1-alpha-protocol';

interface D1AlphaLedgerRow {
  strategy_version: string;
  bar_ts: string;
  rule_sha256: string;
  artifact_sha256: string;
  btc_source: string;
  btc_close: number;
  btc_transition_action: string | null;
  btc_transition_price: number | null;
  btc_engine_exposure: number;
  btc_position: string;
  btc_synchronized: boolean;
  btc_strategy_nav: number;
  btc_benchmark_nav: number;
  eth_source: string;
  eth_close: number;
  eth_transition_action: string | null;
  eth_transition_price: number | null;
  eth_engine_exposure: number;
  eth_position: string;
  eth_synchronized: boolean;
  eth_strategy_nav: number;
  eth_benchmark_nav: number;
  strategy_nav: number;
  benchmark_nav: number;
  strategy_liquidation_nav: number;
  benchmark_liquidation_nav: number;
  strategy_cost_increment: number;
  strategy_funding_increment: number;
  benchmark_cost_increment: number;
  benchmark_funding_increment: number;
  closed_trades_increment: number;
  previous_hash: string | null;
  row_hash: string;
  canonical_payload: unknown;
  committed_at: string | Date;
}

export interface D1AlphaLedgerSnapshot extends D1AlphaHashedSnapshot {
  committedAt: string;
}

export interface D1AlphaWriteResult {
  outcome: 'inserted' | 'idempotent';
  barTimestamp: number;
  rowHash: string;
  committedAt: string;
}

export interface D1AlphaReport {
  strategyVersion: typeof D1_ALPHA_STRATEGY_VERSION;
  label: 'collecting evidence' | 'eligible for review' | 'failed gate';
  status: D1AlphaStatus;
  promotion: 'not-promoted';
  ruleFrozen: true;
  fingerprints: {
    ruleSha256: typeof D1_ALPHA_RULE_SHA256;
    artifactSha256: typeof D1_ALPHA_ARTIFACT_SHA256;
  };
  protocol: {
    symbols: ['BTCUSD', 'ETHUSD'];
    timeframe: 'D1';
    portfolio: '50/50 independent sleeves';
    rule: 'close above EMA200, long/flat';
    stop: 'ATR14 x 2.5 with 4.0% floor';
    modeledCosts: '0.05% fee/side + 0.15% slippage/side + 0.01% funding/8h';
    dataSource: typeof D1_ALPHA_DATA_SOURCE;
  };
  gate: D1AlphaGateEvaluation & {
    minimums: {
      calendarDays: typeof D1_ALPHA_MIN_CALENDAR_DAYS;
      snapshots: typeof D1_ALPHA_MIN_SNAPSHOTS;
      closedTrades: typeof D1_ALPHA_MIN_CLOSED_TRADES;
      unresolvedCadenceGaps: 0;
    };
  };
  integrity: {
    status: 'pass' | 'fail' | 'not-started' | 'unavailable';
    verifiedRows: number;
    unresolvedCadenceGaps: number;
    errors: string[];
  };
  observation: {
    firstBarTimestamp: number | null;
    latestBarTimestamp: number | null;
    latestCommittedAt: string | null;
  };
  positions: { BTCUSD: 'FLAT' | 'LONG' | null; ETHUSD: 'FLAT' | 'LONG' | null };
  metrics: D1AlphaMetrics | null;
  recentSnapshots: D1AlphaLedgerSnapshot[];
}

const SELECT_COLUMNS = `
  strategy_version, bar_ts, rule_sha256, artifact_sha256,
  btc_source, btc_close, btc_transition_action, btc_transition_price,
  btc_engine_exposure, btc_position, btc_synchronized,
  btc_strategy_nav, btc_benchmark_nav,
  eth_source, eth_close, eth_transition_action, eth_transition_price,
  eth_engine_exposure, eth_position, eth_synchronized,
  eth_strategy_nav, eth_benchmark_nav,
  strategy_nav, benchmark_nav, strategy_liquidation_nav, benchmark_liquidation_nav,
  strategy_cost_increment, strategy_funding_increment,
  benchmark_cost_increment, benchmark_funding_increment,
  closed_trades_increment, previous_hash, row_hash, canonical_payload, committed_at`;

function asNumber(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not finite`);
  return parsed;
}

function equalNumber(left: unknown, right: number): boolean {
  return Math.abs(asNumber(left, 'ledger projection') - right) <= 1e-12;
}

function validateSnapshotPayload(value: unknown): D1AlphaSnapshotPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('canonical payload is not an object');
  }
  const payload = value as D1AlphaSnapshotPayload;
  if (payload.schemaVersion !== 1) throw new Error('canonical payload schema version mismatch');
  if (payload.strategyVersion !== D1_ALPHA_STRATEGY_VERSION) {
    throw new Error('strategy version fingerprint mismatch');
  }
  if (payload.ruleSha256 !== D1_ALPHA_RULE_SHA256) {
    throw new Error('rule fingerprint mismatch');
  }
  if (payload.artifactSha256 !== D1_ALPHA_ARTIFACT_SHA256) {
    throw new Error('artifact fingerprint mismatch');
  }
  if (
    !Number.isSafeInteger(payload.barTimestamp)
    || payload.barTimestamp <= 0
    || payload.barTimestamp % D1_ALPHA_DAY_MS !== 0
  ) {
    throw new Error('payload bar timestamp is invalid');
  }
  for (const [label, sleeve] of [['BTCUSD', payload.btc], ['ETHUSD', payload.eth]] as const) {
    if (!sleeve || sleeve.source !== D1_ALPHA_DATA_SOURCE) {
      throw new Error(`${label} payload source is invalid`);
    }
    for (const [name, number] of [
      ['close', sleeve.close],
      ['strategy NAV', sleeve.strategyNav],
      ['benchmark NAV', sleeve.benchmarkNav],
    ] as const) {
      if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${label} payload ${name} is invalid`);
      }
    }
    if (sleeve.engineExposure !== 0 && sleeve.engineExposure !== 1) {
      throw new Error(`${label} payload engine exposure is invalid`);
    }
    if (sleeve.prospectivePosition !== 'FLAT' && sleeve.prospectivePosition !== 'LONG') {
      throw new Error(`${label} payload position is invalid`);
    }
    if (typeof sleeve.synchronized !== 'boolean') {
      throw new Error(`${label} payload synchronization flag is invalid`);
    }
    if (sleeve.transition !== null) {
      if (!['ENTER_LONG', 'EXIT_GATE', 'EXIT_STOP'].includes(sleeve.transition.action)) {
        throw new Error(`${label} payload transition action is invalid`);
      }
      if (!Number.isFinite(sleeve.transition.price) || sleeve.transition.price <= 0) {
        throw new Error(`${label} payload transition price is invalid`);
      }
    }
  }
  for (const [label, number] of [
    ['strategy NAV', payload.strategyPortfolioNav],
    ['benchmark NAV', payload.benchmarkPortfolioNav],
    ['strategy liquidation NAV', payload.strategyLiquidationNav],
    ['benchmark liquidation NAV', payload.benchmarkLiquidationNav],
  ] as const) {
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} is invalid`);
  }
  for (const [label, number] of [
    ['strategy cost increment', payload.strategyCostIncrement],
    ['strategy funding increment', payload.strategyFundingIncrement],
    ['benchmark cost increment', payload.benchmarkCostIncrement],
    ['benchmark funding increment', payload.benchmarkFundingIncrement],
  ] as const) {
    if (!Number.isFinite(number) || number < 0) throw new Error(`${label} is invalid`);
  }
  if (
    !Number.isSafeInteger(payload.closedTradesIncrement)
    || payload.closedTradesIncrement < 0
    || payload.closedTradesIncrement > 2
  ) {
    throw new Error('closed-trade increment is invalid');
  }
  return payload;
}

function verifyProjection(row: D1AlphaLedgerRow, payload: D1AlphaSnapshotPayload): void {
  const fields: Array<[unknown, unknown, string]> = [
    [row.strategy_version, payload.strategyVersion, 'strategy version'],
    [Number(row.bar_ts), payload.barTimestamp, 'bar timestamp'],
    [row.rule_sha256, payload.ruleSha256, 'rule fingerprint'],
    [row.artifact_sha256, payload.artifactSha256, 'artifact fingerprint'],
    [row.btc_source, payload.btc.source, 'BTC source'],
    [row.btc_transition_action, payload.btc.transition?.action ?? null, 'BTC transition'],
    [row.btc_engine_exposure, payload.btc.engineExposure, 'BTC engine exposure'],
    [row.btc_position, payload.btc.prospectivePosition, 'BTC position'],
    [row.btc_synchronized, payload.btc.synchronized, 'BTC synchronization'],
    [row.eth_source, payload.eth.source, 'ETH source'],
    [row.eth_transition_action, payload.eth.transition?.action ?? null, 'ETH transition'],
    [row.eth_engine_exposure, payload.eth.engineExposure, 'ETH engine exposure'],
    [row.eth_position, payload.eth.prospectivePosition, 'ETH position'],
    [row.eth_synchronized, payload.eth.synchronized, 'ETH synchronization'],
    [row.closed_trades_increment, payload.closedTradesIncrement, 'closed-trade increment'],
  ];
  for (const [actual, expected, label] of fields) {
    if (actual !== expected) throw new Error(`${label} projection mismatch`);
  }
  const numbers: Array<[unknown, number, string]> = [
    [row.btc_close, payload.btc.close, 'BTC close'],
    [row.btc_transition_price, payload.btc.transition?.price ?? 0, 'BTC transition price'],
    [row.btc_strategy_nav, payload.btc.strategyNav, 'BTC strategy NAV'],
    [row.btc_benchmark_nav, payload.btc.benchmarkNav, 'BTC benchmark NAV'],
    [row.eth_close, payload.eth.close, 'ETH close'],
    [row.eth_transition_price, payload.eth.transition?.price ?? 0, 'ETH transition price'],
    [row.eth_strategy_nav, payload.eth.strategyNav, 'ETH strategy NAV'],
    [row.eth_benchmark_nav, payload.eth.benchmarkNav, 'ETH benchmark NAV'],
    [row.strategy_nav, payload.strategyPortfolioNav, 'strategy NAV'],
    [row.benchmark_nav, payload.benchmarkPortfolioNav, 'benchmark NAV'],
    [row.strategy_liquidation_nav, payload.strategyLiquidationNav, 'strategy liquidation NAV'],
    [row.benchmark_liquidation_nav, payload.benchmarkLiquidationNav, 'benchmark liquidation NAV'],
    [row.strategy_cost_increment, payload.strategyCostIncrement, 'strategy cost increment'],
    [row.strategy_funding_increment, payload.strategyFundingIncrement, 'strategy funding increment'],
    [row.benchmark_cost_increment, payload.benchmarkCostIncrement, 'benchmark cost increment'],
    [row.benchmark_funding_increment, payload.benchmarkFundingIncrement, 'benchmark funding increment'],
  ];
  for (const [actual, expected, label] of numbers) {
    if (actual === null && expected === 0 && label.includes('transition price')) continue;
    if (!equalNumber(actual, expected)) throw new Error(`${label} projection mismatch`);
  }
}

function decodeAndVerifyRow(row: D1AlphaLedgerRow): D1AlphaLedgerSnapshot {
  const payload = validateSnapshotPayload(row.canonical_payload);
  verifyProjection(row, payload);
  const expectedHash = hashD1AlphaSnapshot(payload, row.previous_hash);
  if (row.row_hash !== expectedHash) throw new Error('row hash mismatch');
  const committedAt = new Date(row.committed_at);
  if (
    !Number.isFinite(committedAt.getTime())
    || committedAt.getTime() < payload.barTimestamp + D1_ALPHA_DAY_MS
  ) {
    throw new Error('committed-at timestamp predates the D1 bar close');
  }
  return {
    payload,
    previousHash: row.previous_hash,
    rowHash: row.row_hash,
    committedAt: committedAt.toISOString(),
  };
}

function observationMatchesPayload(
  observation: D1AlphaObservation,
  payload: D1AlphaSnapshotPayload,
): boolean {
  if (observation.barTimestamp !== payload.barTimestamp) return false;
  for (const [symbol, key] of [['BTCUSD', 'btc'], ['ETHUSD', 'eth']] as const) {
    const actual = observation.symbols[symbol];
    const stored = payload[key];
    const transitionPriceMatches = actual.transition === null && stored.transition === null
      ? true
      : actual.transition !== null && stored.transition !== null
        && Math.abs(actual.transition.price - stored.transition.price) <= 1e-9;
    if (
      actual.source !== stored.source
      || Math.abs(actual.close - stored.close) > 1e-9
      || actual.engineExposure !== stored.engineExposure
      || actual.transition?.action !== stored.transition?.action
      || !transitionPriceMatches
    ) return false;
  }
  return true;
}

function observationFromPayload(payload: D1AlphaSnapshotPayload): D1AlphaObservation {
  return {
    barTimestamp: payload.barTimestamp,
    symbols: {
      BTCUSD: {
        symbol: 'BTCUSD',
        source: payload.btc.source,
        close: payload.btc.close,
        engineExposure: payload.btc.engineExposure,
        transition: payload.btc.transition,
      },
      ETHUSD: {
        symbol: 'ETHUSD',
        source: payload.eth.source,
        close: payload.eth.close,
        engineExposure: payload.eth.engineExposure,
        transition: payload.eth.transition,
      },
    },
  };
}

async function selectExisting(
  client: PoolClient,
  barTimestamp: number,
): Promise<D1AlphaLedgerRow | null> {
  const result = await client.query<D1AlphaLedgerRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM d1_alpha_ledger
      WHERE strategy_version = $1 AND bar_ts = $2`,
    [D1_ALPHA_STRATEGY_VERSION, barTimestamp],
  );
  return result.rows[0] ?? null;
}

async function selectLatest(client: PoolClient): Promise<D1AlphaLedgerRow | null> {
  const result = await client.query<D1AlphaLedgerRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM d1_alpha_ledger
      WHERE strategy_version = $1
      ORDER BY bar_ts DESC
      LIMIT 1`,
    [D1_ALPHA_STRATEGY_VERSION],
  );
  return result.rows[0] ?? null;
}

async function insertSnapshot(
  client: PoolClient,
  snapshot: D1AlphaHashedSnapshot,
): Promise<{ committed_at: string | Date } | null> {
  const { payload } = snapshot;
  const values: unknown[] = [
    payload.strategyVersion,
    payload.barTimestamp,
    payload.ruleSha256,
    payload.artifactSha256,
    payload.btc.source,
    payload.btc.close,
    payload.btc.transition?.action ?? null,
    payload.btc.transition?.price ?? null,
    payload.btc.engineExposure,
    payload.btc.prospectivePosition,
    payload.btc.synchronized,
    payload.btc.strategyNav,
    payload.btc.benchmarkNav,
    payload.eth.source,
    payload.eth.close,
    payload.eth.transition?.action ?? null,
    payload.eth.transition?.price ?? null,
    payload.eth.engineExposure,
    payload.eth.prospectivePosition,
    payload.eth.synchronized,
    payload.eth.strategyNav,
    payload.eth.benchmarkNav,
    payload.strategyPortfolioNav,
    payload.benchmarkPortfolioNav,
    payload.strategyLiquidationNav,
    payload.benchmarkLiquidationNav,
    payload.strategyCostIncrement,
    payload.strategyFundingIncrement,
    payload.benchmarkCostIncrement,
    payload.benchmarkFundingIncrement,
    payload.closedTradesIncrement,
    snapshot.previousHash,
    snapshot.rowHash,
    canonicalD1AlphaPayload(payload),
  ];
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query<{ committed_at: string | Date }>(
    `INSERT INTO d1_alpha_ledger (
       strategy_version, bar_ts, rule_sha256, artifact_sha256,
       btc_source, btc_close, btc_transition_action, btc_transition_price,
       btc_engine_exposure, btc_position, btc_synchronized,
       btc_strategy_nav, btc_benchmark_nav,
       eth_source, eth_close, eth_transition_action, eth_transition_price,
       eth_engine_exposure, eth_position, eth_synchronized,
       eth_strategy_nav, eth_benchmark_nav,
       strategy_nav, benchmark_nav, strategy_liquidation_nav, benchmark_liquidation_nav,
       strategy_cost_increment, strategy_funding_increment,
       benchmark_cost_increment, benchmark_funding_increment,
       closed_trades_increment, previous_hash, row_hash, canonical_payload
     ) VALUES (${placeholders})
     ON CONFLICT (strategy_version, bar_ts) DO NOTHING
     RETURNING committed_at`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function appendD1AlphaSnapshot(
  observation: D1AlphaObservation,
): Promise<D1AlphaWriteResult> {
  validateD1AlphaObservation(observation);
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [D1_ALPHA_STRATEGY_VERSION]);

      const existing = await selectExisting(client, observation.barTimestamp);
      if (existing) {
        const verified = decodeAndVerifyRow(existing);
        if (!observationMatchesPayload(observation, verified.payload)) {
          throw new Error('existing D1 alpha row does not match the repeated observation');
        }
        await client.query('COMMIT');
        return {
          outcome: 'idempotent' as const,
          barTimestamp: verified.payload.barTimestamp,
          rowHash: verified.rowHash,
          committedAt: verified.committedAt,
        };
      }

      const latestRow = await selectLatest(client);
      let payload: D1AlphaSnapshotPayload;
      let previousHash: string | null = null;
      if (latestRow) {
        const latest = decodeAndVerifyRow(latestRow);
        if (observation.barTimestamp <= latest.payload.barTimestamp) {
          throw new Error('D1 alpha ledger refuses historical insertion');
        }
        payload = advanceD1AlphaSnapshot(latest.payload, observation);
        previousHash = latest.rowHash;
      } else {
        payload = createInitialD1AlphaSnapshot(observation);
      }
      const snapshot = buildD1AlphaHashedSnapshot(payload, previousHash);
      const inserted = await insertSnapshot(client, snapshot);
      if (!inserted) {
        throw new Error('D1 alpha row conflicted after the ledger lock');
      }
      await client.query('COMMIT');
      return {
        outcome: 'inserted' as const,
        barTimestamp: payload.barTimestamp,
        rowHash: snapshot.rowHash,
        committedAt: new Date(inserted.committed_at).toISOString(),
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original ledger failure.
      }
      throw error;
    }
  });
}

function safeMetricNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

function safeMetrics(metrics: D1AlphaMetrics | null): D1AlphaMetrics | null {
  if (!metrics) return null;
  return {
    ...metrics,
    strategyCalmar: safeMetricNumber(metrics.strategyCalmar),
    benchmarkCalmar: safeMetricNumber(metrics.benchmarkCalmar),
  };
}

function baseReport(
  integrityStatus: D1AlphaReport['integrity']['status'],
  errors: string[] = [],
): D1AlphaReport {
  const gate = evaluateD1AlphaGate(null, { cadencePassed: false, integrityPassed: false });
  return {
    strategyVersion: D1_ALPHA_STRATEGY_VERSION,
    label: 'collecting evidence',
    status: 'collecting-evidence',
    promotion: 'not-promoted',
    ruleFrozen: true,
    fingerprints: { ruleSha256: D1_ALPHA_RULE_SHA256, artifactSha256: D1_ALPHA_ARTIFACT_SHA256 },
    protocol: {
      symbols: ['BTCUSD', 'ETHUSD'],
      timeframe: 'D1',
      portfolio: '50/50 independent sleeves',
      rule: 'close above EMA200, long/flat',
      stop: 'ATR14 x 2.5 with 4.0% floor',
      modeledCosts: '0.05% fee/side + 0.15% slippage/side + 0.01% funding/8h',
      dataSource: D1_ALPHA_DATA_SOURCE,
    },
    gate: {
      ...gate,
      minimums: {
        calendarDays: D1_ALPHA_MIN_CALENDAR_DAYS,
        snapshots: D1_ALPHA_MIN_SNAPSHOTS,
        closedTrades: D1_ALPHA_MIN_CLOSED_TRADES,
        unresolvedCadenceGaps: 0,
      },
    },
    integrity: {
      status: integrityStatus,
      verifiedRows: 0,
      unresolvedCadenceGaps: 0,
      errors,
    },
    observation: { firstBarTimestamp: null, latestBarTimestamp: null, latestCommittedAt: null },
    positions: { BTCUSD: null, ETHUSD: null },
    metrics: null,
    recentSnapshots: [],
  };
}

export function unavailableD1AlphaReport(): D1AlphaReport {
  return baseReport('unavailable', ['ledger unavailable; no evidence was inferred']);
}

export async function readD1AlphaReport(
  options: { now?: number; recentLimit?: number } = {},
): Promise<D1AlphaReport> {
  const now = options.now ?? Date.now();
  const recentLimit = options.recentLimit ?? 30;
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error('report time is invalid');
  if (!Number.isSafeInteger(recentLimit) || recentLimit < 1 || recentLimit > 5_000) {
    throw new Error('recent snapshot limit must be between 1 and 5000');
  }
  const rows = await query<D1AlphaLedgerRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM d1_alpha_ledger
      WHERE strategy_version = $1
      ORDER BY bar_ts ASC`,
    [D1_ALPHA_STRATEGY_VERSION],
  );
  if (rows.length === 0) return baseReport('not-started');

  const verified: D1AlphaLedgerSnapshot[] = [];
  const errors: string[] = [];
  let unresolvedCadenceGaps = 0;
  for (let index = 0; index < rows.length; index++) {
    try {
      const snapshot = decodeAndVerifyRow(rows[index]);
      if (index === 0 && snapshot.previousHash !== null) {
        throw new Error('genesis row has a previous hash');
      }
      if (index > 0) {
        const previous = verified[index - 1];
        if (!previous || snapshot.previousHash !== previous.rowHash) {
          throw new Error('hash chain does not link to the prior row');
        }
        const gap = snapshot.payload.barTimestamp - previous.payload.barTimestamp;
        if (gap !== D1_ALPHA_DAY_MS) {
          unresolvedCadenceGaps += Math.max(1, Math.floor(gap / D1_ALPHA_DAY_MS) - 1);
          throw new Error('stored snapshot cadence is not consecutive');
        }
      }
      const recomputedPayload = index === 0
        ? createInitialD1AlphaSnapshot(observationFromPayload(snapshot.payload))
        : advanceD1AlphaSnapshot(
            verified[index - 1].payload,
            observationFromPayload(snapshot.payload),
          );
      if (canonicalD1AlphaPayload(recomputedPayload) !== canonicalD1AlphaPayload(snapshot.payload)) {
        throw new Error('snapshot state or modeled-cost math does not reproduce');
      }
      verified.push(snapshot);
    } catch (error) {
      errors.push(`row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
  }

  const latest = verified.at(-1) ?? null;
  if (latest) {
    const expectedLatestClosedBar = Math.floor(now / D1_ALPHA_DAY_MS) * D1_ALPHA_DAY_MS - D1_ALPHA_DAY_MS;
    if (latest.payload.barTimestamp < expectedLatestClosedBar) {
      unresolvedCadenceGaps += Math.floor(
        (expectedLatestClosedBar - latest.payload.barTimestamp) / D1_ALPHA_DAY_MS,
      );
    }
  }
  const integrityPassed = verified.length === rows.length && errors.length === 0;
  const cadencePassed = unresolvedCadenceGaps === 0 && integrityPassed;
  const metricsForGate = calculateD1AlphaMetrics(verified.map((snapshot) => snapshot.payload));
  const gate = evaluateD1AlphaGate(metricsForGate, { cadencePassed, integrityPassed });
  const report = baseReport(integrityPassed ? 'pass' : 'fail', errors);
  return {
    ...report,
    label: gate.status === 'eligible-for-review'
      ? 'eligible for review'
      : gate.status === 'failed-gate'
        ? 'failed gate'
        : 'collecting evidence',
    status: gate.status,
    gate: { ...gate, minimums: report.gate.minimums },
    integrity: {
      status: integrityPassed ? 'pass' : 'fail',
      verifiedRows: verified.length,
      unresolvedCadenceGaps,
      errors,
    },
    observation: {
      firstBarTimestamp: verified[0]?.payload.barTimestamp ?? null,
      latestBarTimestamp: latest?.payload.barTimestamp ?? null,
      latestCommittedAt: latest?.committedAt ?? null,
    },
    positions: {
      BTCUSD: latest?.payload.btc.prospectivePosition ?? null,
      ETHUSD: latest?.payload.eth.prospectivePosition ?? null,
    },
    metrics: safeMetrics(metricsForGate),
    recentSnapshots: verified.slice(-recentLimit).reverse(),
  };
}

export const _d1AlphaLedgerInternal = {
  decodeAndVerifyRow,
  observationMatchesPayload,
  validateSnapshotPayload,
  verifyProjection,
};
