jest.mock('../db-pool', () => ({
  query: jest.fn(),
  withClient: jest.fn(),
}));

import type { PoolClient } from 'pg';
import { query, withClient } from '../db-pool';
import {
  appendD1AlphaSnapshot,
  readD1AlphaReport,
  unavailableD1AlphaReport,
} from '../d1-alpha-ledger';
import {
  D1_ALPHA_ARTIFACT_SHA256,
  D1_ALPHA_RULE_SHA256,
  D1_ALPHA_STRATEGY_VERSION,
  buildD1AlphaHashedSnapshot,
  createInitialD1AlphaSnapshot,
  type D1AlphaObservation,
  type D1AlphaSnapshotPayload,
} from '../d1-alpha-protocol';

const BAR_TS = Date.UTC(2026, 7, 9);
const COMMITTED_AT = '2026-08-10T00:00:10.000Z';
const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const client = { query: jest.fn() } as unknown as Pick<PoolClient, 'query'>;
const mockedClientQuery = client.query as jest.MockedFunction<PoolClient['query']>;

function observation(btcClose = 100): D1AlphaObservation {
  return {
    barTimestamp: BAR_TS,
    symbols: {
      BTCUSD: {
        symbol: 'BTCUSD',
        source: 'binance',
        close: btcClose,
        engineExposure: 0,
        transition: null,
      },
      ETHUSD: {
        symbol: 'ETHUSD',
        source: 'binance',
        close: 50,
        engineExposure: 0,
        transition: null,
      },
    },
  };
}

function result(rows: unknown[] = []) {
  return { rows, rowCount: rows.length };
}

function storedRow(payload: D1AlphaSnapshotPayload) {
  const hashed = buildD1AlphaHashedSnapshot(payload, null);
  return {
    strategy_version: payload.strategyVersion,
    bar_ts: String(payload.barTimestamp),
    rule_sha256: payload.ruleSha256,
    artifact_sha256: payload.artifactSha256,
    btc_source: payload.btc.source,
    btc_close: payload.btc.close,
    btc_transition_action: payload.btc.transition?.action ?? null,
    btc_transition_price: payload.btc.transition?.price ?? null,
    btc_engine_exposure: payload.btc.engineExposure,
    btc_position: payload.btc.prospectivePosition,
    btc_synchronized: payload.btc.synchronized,
    btc_strategy_nav: payload.btc.strategyNav,
    btc_benchmark_nav: payload.btc.benchmarkNav,
    eth_source: payload.eth.source,
    eth_close: payload.eth.close,
    eth_transition_action: payload.eth.transition?.action ?? null,
    eth_transition_price: payload.eth.transition?.price ?? null,
    eth_engine_exposure: payload.eth.engineExposure,
    eth_position: payload.eth.prospectivePosition,
    eth_synchronized: payload.eth.synchronized,
    eth_strategy_nav: payload.eth.strategyNav,
    eth_benchmark_nav: payload.eth.benchmarkNav,
    strategy_nav: payload.strategyPortfolioNav,
    benchmark_nav: payload.benchmarkPortfolioNav,
    strategy_liquidation_nav: payload.strategyLiquidationNav,
    benchmark_liquidation_nav: payload.benchmarkLiquidationNav,
    strategy_cost_increment: payload.strategyCostIncrement,
    strategy_funding_increment: payload.strategyFundingIncrement,
    benchmark_cost_increment: payload.benchmarkCostIncrement,
    benchmark_funding_increment: payload.benchmarkFundingIncrement,
    closed_trades_increment: payload.closedTradesIncrement,
    previous_hash: null,
    row_hash: hashed.rowHash,
    canonical_payload: payload,
    committed_at: COMMITTED_AT,
  };
}

beforeEach(() => {
  mockedClientQuery.mockReset();
  mockedWithClient.mockReset();
  mockedQuery.mockReset();
  mockedWithClient.mockImplementation(async (callback) => callback(client as PoolClient));
});

describe('readD1AlphaReport', () => {
  it('recomputes the genesis state and reports an intact collecting-evidence ledger', async () => {
    const row = storedRow(createInitialD1AlphaSnapshot(observation()));
    mockedQuery.mockResolvedValue([row]);

    const report = await readD1AlphaReport({
      now: Date.UTC(2026, 7, 10, 12),
      recentLimit: 30,
    });

    expect(report).toMatchObject({
      label: 'collecting evidence',
      status: 'collecting-evidence',
      promotion: 'not-promoted',
      integrity: { status: 'pass', verifiedRows: 1, unresolvedCadenceGaps: 0 },
      observation: { firstBarTimestamp: BAR_TS, latestBarTimestamp: BAR_TS },
      positions: { BTCUSD: 'FLAT', ETHUSD: 'FLAT' },
      metrics: { snapshots: 1, closedTrades: 0, calendarDays: 0 },
    });
  });

  it('fails integrity when a self-hashed row does not reproduce the frozen math', async () => {
    const valid = createInitialD1AlphaSnapshot(observation());
    const tampered: D1AlphaSnapshotPayload = {
      ...valid,
      strategyPortfolioNav: 0.9,
      strategyLiquidationNav: 0.9,
    };
    mockedQuery.mockResolvedValue([storedRow(tampered)]);

    const report = await readD1AlphaReport({ now: Date.UTC(2026, 7, 10, 12) });

    expect(report.integrity.status).toBe('fail');
    expect(report.integrity.verifiedRows).toBe(0);
    expect(report.integrity.errors[0]).toContain('does not reproduce');
    expect(report.metrics).toBeNull();
  });
});

describe('appendD1AlphaSnapshot', () => {
  it('serializes a genesis insert, hashes it, and uses conflict-safe append SQL', async () => {
    mockedClientQuery
      .mockResolvedValueOnce(result() as never) // BEGIN
      .mockResolvedValueOnce(result() as never) // advisory xact lock
      .mockResolvedValueOnce(result() as never) // existing row
      .mockResolvedValueOnce(result() as never) // latest row
      .mockResolvedValueOnce(result([{ committed_at: COMMITTED_AT }]) as never)
      .mockResolvedValueOnce(result() as never); // COMMIT

    const written = await appendD1AlphaSnapshot(observation());

    expect(written).toMatchObject({
      outcome: 'inserted',
      barTimestamp: BAR_TS,
      committedAt: COMMITTED_AT,
    });
    expect(written.rowHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mockedClientQuery.mock.calls[1][0]).toContain('pg_advisory_xact_lock');
    expect(mockedClientQuery.mock.calls[4][0]).toContain('ON CONFLICT (strategy_version, bar_ts) DO NOTHING');
    expect(mockedClientQuery.mock.calls[4][0]).not.toContain('UPDATE');
  });

  it('returns the immutable existing row for an exact repeated observation', async () => {
    const payload = createInitialD1AlphaSnapshot(observation());
    const row = storedRow(payload);
    mockedClientQuery
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result([row]) as never)
      .mockResolvedValueOnce(result() as never);

    const written = await appendD1AlphaSnapshot(observation());

    expect(written).toEqual({
      outcome: 'idempotent',
      barTimestamp: BAR_TS,
      rowHash: row.row_hash,
      committedAt: COMMITTED_AT,
    });
    expect(mockedClientQuery).toHaveBeenCalledTimes(4);
  });

  it('fails closed instead of rewriting when a repeated bar differs', async () => {
    const row = storedRow(createInitialD1AlphaSnapshot(observation()));
    mockedClientQuery
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result([row]) as never)
      .mockResolvedValueOnce(result() as never); // ROLLBACK

    await expect(appendD1AlphaSnapshot(observation(101))).rejects.toThrow(
      'does not match the repeated observation',
    );
    expect(mockedClientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
});

describe('unavailableD1AlphaReport', () => {
  it('never fabricates +0 performance or a current-strategy promotion', () => {
    const report = unavailableD1AlphaReport();
    expect(report).toMatchObject({
      strategyVersion: D1_ALPHA_STRATEGY_VERSION,
      label: 'collecting evidence',
      status: 'collecting-evidence',
      promotion: 'not-promoted',
      metrics: null,
      fingerprints: {
        ruleSha256: D1_ALPHA_RULE_SHA256,
        artifactSha256: D1_ALPHA_ARTIFACT_SHA256,
      },
    });
  });
});
