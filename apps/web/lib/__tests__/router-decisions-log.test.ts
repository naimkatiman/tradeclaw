import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

// Mock the CACHED history reader so fitTickCalibrationMap reads a controlled
// population. fitTickCalibrationMap now goes through getCachedHistory (layered
// cache) rather than readHistoryAsync directly — mock the cache accessor.
jest.mock('../signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

import {
  fitTickCalibrationMap,
  recordRouterShadow,
  logRouterShadowBatch,
} from '../router-decisions-log';
import { getCachedHistory } from '../signal-history-cache';
import { MIN_CALIBRATION_SAMPLES } from '../confidence-calibration';
import { buildRouterShadowBatch } from '../strategy-router-shadow';

const mockedReadHistory = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;

// Build a resolved history row at the shape isCountedResolved accepts.
function resolvedRow(id: string, confidence: number, hit: boolean) {
  return {
    id,
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY' as const,
    confidence,
    entryPrice: 100,
    timestamp: 1_700_000_000_000 + Number(id),
    tp1: 104,
    sl: 98,
    outcomes: {
      '4h': null,
      '24h': { price: 104, pnlPct: hit ? 4 : -2, hit, target: hit ? 'tp1' : 'sl' },
    },
  };
}

let tmpDir: string;
const ORIGINAL_LOG_PATH = process.env.TRADECLAW_ROUTER_LOG_PATH;

beforeEach(async () => {
  jest.clearAllMocks();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'router-shadow-test-'));
  process.env.TRADECLAW_ROUTER_LOG_PATH = path.join(tmpDir, 'router-decisions.log');
});

afterEach(async () => {
  if (ORIGINAL_LOG_PATH === undefined) delete process.env.TRADECLAW_ROUTER_LOG_PATH;
  else process.env.TRADECLAW_ROUTER_LOG_PATH = ORIGINAL_LOG_PATH;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('fitTickCalibrationMap', () => {
  it('returns null when the resolved population is below MIN_CALIBRATION_SAMPLES', async () => {
    const rows = Array.from({ length: MIN_CALIBRATION_SAMPLES - 1 }, (_, i) =>
      resolvedRow(String(i), 80, i % 2 === 0),
    );
    mockedReadHistory.mockResolvedValue(rows as never);
    expect(await fitTickCalibrationMap()).toBeNull();
  });

  it('fits an isotonic map once the population reaches MIN_CALIBRATION_SAMPLES', async () => {
    // Lower-confidence losers, higher-confidence winners → a monotone map.
    const rows = [
      ...Array.from({ length: 12 }, (_, i) => resolvedRow(`lo${i}`, 60, false)),
      ...Array.from({ length: 12 }, (_, i) => resolvedRow(`hi${i}`, 90, true)),
    ];
    mockedReadHistory.mockResolvedValue(rows as never);
    const map = await fitTickCalibrationMap();
    expect(map).not.toBeNull();
    expect(map!.x.length).toBeGreaterThan(0);
    expect(map!.y.length).toBe(map!.x.length);
  });
});

describe('recordRouterShadow — NDJSON sink', () => {
  it('appends one NDJSON line per tick with the expected per-candidate shape', async () => {
    mockedReadHistory.mockResolvedValue([] as never); // no map → calibratedConfidence null
    await recordRouterShadow(
      'shadow',
      [
        { id: 'a', symbol: 'BTCUSD', direction: 'BUY', confidence: 80 },
        { id: 'b', symbol: 'ETHUSD', direction: 'SELL', confidence: 72 },
      ],
      (s) => (s === 'BTCUSD' ? 'trend' : 'volatile'),
    );

    const content = await fs.readFile(process.env.TRADECLAW_ROUTER_LOG_PATH!, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    const batch = JSON.parse(lines[0]);
    expect(batch.mode).toBe('shadow');
    expect(batch.calibrated).toBe(false);
    expect(batch.candidateCount).toBe(2);
    expect(batch.candidates[0]).toEqual({
      id: 'a',
      symbol: 'BTCUSD',
      regime: 'trend',
      direction: 'BUY',
      rawConfidence: 0.8,
      routedStrategy: 'hmm-top3',
      calibratedConfidence: null,
    });
    expect(batch.candidates[1].routedStrategy).toBe('vwap-ema-bb');
  });

  it('skips entirely for an empty candidate list (no file written)', async () => {
    mockedReadHistory.mockResolvedValue([] as never);
    await recordRouterShadow('shadow', [], () => 'trend');
    await expect(fs.readFile(process.env.TRADECLAW_ROUTER_LOG_PATH!, 'utf8')).rejects.toThrow();
  });

  it('never throws even when the history read fails (side-effect-only contract)', async () => {
    mockedReadHistory.mockRejectedValue(new Error('db down'));
    await expect(
      recordRouterShadow('shadow', [{ id: 'a', symbol: 'BTCUSD', direction: 'BUY', confidence: 80 }], () => 'trend'),
    ).resolves.toBeUndefined();
  });

  it('appends across successive ticks (append-only, one line per tick)', async () => {
    mockedReadHistory.mockResolvedValue([] as never);
    const cands = [{ id: 'a', symbol: 'BTCUSD', direction: 'BUY' as const, confidence: 80 }];
    await recordRouterShadow('shadow', cands, () => 'trend');
    await recordRouterShadow('active', cands, () => 'trend');
    const content = await fs.readFile(process.env.TRADECLAW_ROUTER_LOG_PATH!, 'utf8');
    expect(content.trim().split('\n')).toHaveLength(2);
  });
});

describe('logRouterShadowBatch — direct sink, never throws', () => {
  it('writes a prebuilt batch and is robust to a bad path', async () => {
    const batch = buildRouterShadowBatch(
      'shadow',
      [{ id: 'a', symbol: 'BTCUSD', direction: 'BUY', confidence: 80 }],
      () => 'trend',
      null,
    );
    await expect(logRouterShadowBatch(batch)).resolves.toBeUndefined();
    const content = await fs.readFile(process.env.TRADECLAW_ROUTER_LOG_PATH!, 'utf8');
    expect(JSON.parse(content.trim()).candidates[0].id).toBe('a');
  });
});
