/**
 * market_regimes writer tests — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * db-pool is mocked (no live DB); global fetch is mocked (no live Binance).
 * classifyRegime is a partial mock: real implementation by default (with the
 * default model injected via setModel so loadModel never walks the disk),
 * pinned to fixed classifications for the hysteresis-bookkeeping tests.
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('@tradeclaw/signals', () => {
  const actual = jest.requireActual('@tradeclaw/signals');
  return { ...actual, classifyRegime: jest.fn(actual.classifyRegime) };
});

import { query, queryOne, execute } from '../db-pool';
import {
  classifyRegime,
  setModel,
  getDefaultModel,
  type MarketRegime,
  type RegimeClassification,
} from '@tradeclaw/signals';
import { runRegimeWriter, type RegimeWriterResult } from '../regime-writer';
import { REGIME_CANDLE_UNIVERSE } from '../candle-store';

const actualSignals = jest.requireActual('@tradeclaw/signals') as {
  classifyRegime: typeof classifyRegime;
};

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;
const mockedClassify = classifyRegime as jest.MockedFunction<typeof classifyRegime>;

const HOUR_MS = 3_600_000;

// ── Fixtures ──────────────────────────────────────────────────

/** Deterministic gently-oscillating H1 bars, ascending, ts as pg BIGINT strings. */
function makeStoredBars(n: number): Array<Record<string, unknown>> {
  const startTs = Date.now() - n * HOUR_MS;
  const bars: Array<Record<string, unknown>> = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 9) * 0.6 + Math.sin(i / 23) * 0.4;
    const open = price;
    const close = price + drift;
    bars.push({
      ts: String(startTs + i * HOUR_MS),
      open,
      high: Math.max(open, close) + 0.3,
      low: Math.min(open, close) - 0.3,
      close,
      volume: 1000 + i,
    });
    price = close;
  }
  return bars;
}

/** Binance kline payload: [openTime, open, high, low, close, volume, closeTime]. */
function makeKlines(count: number, lastOpenTime: number): unknown[][] {
  const out: unknown[][] = [];
  for (let i = count - 1; i >= 0; i--) {
    const openTime = lastOpenTime - i * HOUR_MS;
    out.push([openTime, '100.0', '101.0', '99.0', '100.5', '12.3', openTime + HOUR_MS - 1]);
  }
  return out;
}

function fixedClassification(regime: MarketRegime, confidence: number): RegimeClassification {
  const rest = (1 - confidence) / 2;
  const allProbabilities = { trend: rest, volatile: rest, range: rest };
  allProbabilities[regime] = confidence;
  return {
    regime,
    confidence,
    allProbabilities,
    transitionProbs: { trend: 1 / 3, volatile: 1 / 3, range: 1 / 3 },
    features: { adx14: 12, bbBandwidthPct: 3.2, atrPercentile: 0.4, returnAutocorr1: 0.1 },
    timestamp: new Date().toISOString(),
  };
}

function fullResult(result: RegimeWriterResult) {
  expect(result.skipped).toBe(false);
  if (result.skipped) throw new Error('unreachable');
  return result;
}

interface InsertedRow {
  symbol: string;
  regime: string;
  confidence: number;
  features: Record<string, unknown>;
}

function insertedRow(symbol: string): InsertedRow {
  const call = mockedExecute.mock.calls.find(
    (c) =>
      typeof c[0] === 'string' &&
      c[0].includes('INSERT INTO market_regimes') &&
      (c[1] as unknown[])[0] === symbol,
  );
  if (!call) throw new Error(`no market_regimes INSERT for ${symbol}`);
  const params = call[1] as unknown[];
  return {
    symbol: params[0] as string,
    regime: params[1] as string,
    confidence: params[2] as number,
    features: JSON.parse(params[3] as string) as Record<string, unknown>,
  };
}

// ── Mock choreography ─────────────────────────────────────────

const realFetch = global.fetch;
let prevRowsBySymbol: Map<string, { regime: string; features: { barsHeld?: number } | null }>;
let latestRowGlobal: { detected_at: string } | null;
let storedBarsBySymbol: (symbol: string) => Array<Record<string, unknown>>;

beforeAll(() => {
  // Seed the model cache so the real classifier never walks the disk.
  setModel('crypto', getDefaultModel('crypto'));
});

beforeEach(() => {
  mockedQuery.mockReset();
  mockedQueryOne.mockReset();
  mockedExecute.mockReset();
  mockedClassify.mockReset();
  mockedClassify.mockImplementation(actualSignals.classifyRegime);

  prevRowsBySymbol = new Map();
  latestRowGlobal = null;
  storedBarsBySymbol = () => makeStoredBars(400);

  mockedQueryOne.mockImplementation((async (_sql: string, params?: unknown[]) => {
    if (!params) return latestRowGlobal; // run-level idempotency probe
    return prevRowsBySymbol.get(params[0] as string) ?? null; // latest row per symbol
  }) as typeof queryOne);

  mockedQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
    if (sql.includes('INSERT INTO candles')) return []; // all bars already stored
    if (sql.includes('FROM candles')) return storedBarsBySymbol(params?.[0] as string);
    return [];
  }) as typeof query);

  mockedExecute.mockResolvedValue(undefined);

  // Latest kline still open (opened 30 min ago) — refreshCandles must drop it.
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => makeKlines(48, Date.now() - 30 * 60_000),
  })) as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

// ── Tests ─────────────────────────────────────────────────────

describe('runRegimeWriter', () => {
  it('writes one row per universe symbol on a fresh run', async () => {
    const result = fullResult(await runRegimeWriter());

    expect(result.processed).toBe(REGIME_CANDLE_UNIVERSE.length);
    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length);
    expect(result.failures).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(global.fetch).toHaveBeenCalledTimes(REGIME_CANDLE_UNIVERSE.length);
    expect(mockedExecute).toHaveBeenCalledTimes(REGIME_CANDLE_UNIVERSE.length);

    for (const symbol of REGIME_CANDLE_UNIVERSE) {
      const row = insertedRow(symbol);
      expect(['trend', 'volatile', 'range']).toContain(row.regime);
      expect(row.confidence).toBeGreaterThanOrEqual(0);
      expect(row.confidence).toBeLessThanOrEqual(1);
      // 4dp clamp: re-rounding is a no-op
      expect(Math.round(row.confidence * 10000) / 10000).toBe(row.confidence);
      // No prior row → barsHeld starts at 1
      expect(row.features.barsHeld).toBe(1);
      expect(row.features.sequenceLength).toBe(64);
      expect(['trend', 'volatile', 'range']).toContain(row.features.candidate);
      for (const key of ['adx14', 'bbBandwidthPct', 'atrPercentile', 'returnAutocorr1']) {
        expect(typeof row.features[key]).toBe('number');
      }
    }
  });

  it('increments barsHeld while the persisted label is unchanged', async () => {
    mockedClassify.mockReturnValue(fixedClassification('range', 0.6));
    for (const symbol of REGIME_CANDLE_UNIVERSE) {
      prevRowsBySymbol.set(symbol, { regime: 'range', features: { barsHeld: 3 } });
    }

    const result = fullResult(await runRegimeWriter());

    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length);
    const row = insertedRow('BTCUSD');
    expect(row.regime).toBe('range');
    expect(row.features.barsHeld).toBe(4);
  });

  it('holds the previous label when a different candidate is below dwell and override confidence', async () => {
    mockedClassify.mockReturnValue(fixedClassification('trend', 0.6));
    prevRowsBySymbol.set('BTCUSD', { regime: 'range', features: { barsHeld: 2 } });

    fullResult(await runRegimeWriter());

    const row = insertedRow('BTCUSD');
    expect(row.regime).toBe('range'); // held: barsHeld 2 < dwell 6, confidence 0.6 < 0.8
    expect(row.features.barsHeld).toBe(3); // held label keeps counting
    expect(row.features.candidate).toBe('trend'); // rejected candidate still recorded
    // Column stores the posterior of the label actually persisted, not the candidate's
    expect(row.confidence).toBeCloseTo(0.2, 6);
  });

  it('switches immediately at override confidence and resets barsHeld to 1', async () => {
    mockedClassify.mockReturnValue(fixedClassification('trend', 0.9));
    prevRowsBySymbol.set('BTCUSD', { regime: 'range', features: { barsHeld: 2 } });

    fullResult(await runRegimeWriter());

    const row = insertedRow('BTCUSD');
    expect(row.regime).toBe('trend');
    expect(row.features.barsHeld).toBe(1);
  });

  it('skips the entire run when the latest row is inside the 30-minute idempotency window', async () => {
    latestRowGlobal = { detected_at: new Date(Date.now() - 10 * 60_000).toISOString() };

    const result = await runRegimeWriter();

    expect(result.skipped).toBe(true);
    if (!result.skipped) throw new Error('unreachable');
    expect(result.reason).toContain('idempotency');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('does not skip when the latest row is older than the idempotency window', async () => {
    latestRowGlobal = { detected_at: new Date(Date.now() - 50 * 60_000).toISOString() };

    const result = fullResult(await runRegimeWriter());

    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length);
  });

  it('records a refresh failure but still classifies that symbol on stored candles', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: unknown) => {
      if (String(url).includes('BTCUSDT')) throw new Error('binance down');
      return { ok: true, json: async () => makeKlines(48, Date.now() - 30 * 60_000) };
    });

    const result = fullResult(await runRegimeWriter());

    expect(result.failures).toEqual([
      { symbol: 'BTCUSD', stage: 'refresh', error: 'binance down' },
    ]);
    // BTCUSD still classified from (possibly stale) stored candles
    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length);
    expect(insertedRow('BTCUSD').regime).toBeDefined();
  });

  it('records a data failure and skips the insert below the 150-bar floor', async () => {
    storedBarsBySymbol = (symbol) => makeStoredBars(symbol === 'ADAUSD' ? 100 : 400);

    const result = fullResult(await runRegimeWriter());

    expect(result.failures).toEqual([
      { symbol: 'ADAUSD', stage: 'data', error: expect.stringContaining('100') },
    ]);
    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length - 1);
    expect(() => insertedRow('ADAUSD')).toThrow();
  });

  it('records a classify failure without blocking other symbols', async () => {
    mockedClassify.mockImplementation((symbol, bars) => {
      if (symbol === 'ETHUSD') throw new Error('insufficient data for regime classification');
      return actualSignals.classifyRegime(symbol, bars);
    });

    const result = fullResult(await runRegimeWriter());

    expect(result.failures).toEqual([
      { symbol: 'ETHUSD', stage: 'classify', error: expect.stringContaining('insufficient') },
    ]);
    expect(result.written).toBe(REGIME_CANDLE_UNIVERSE.length - 1);
  });

  it('clamps the stored confidence to 4 decimal places', async () => {
    mockedClassify.mockReturnValue(fixedClassification('range', 0.123456789));

    fullResult(await runRegimeWriter());

    expect(insertedRow('BTCUSD').confidence).toBe(0.1235);
  });
});
