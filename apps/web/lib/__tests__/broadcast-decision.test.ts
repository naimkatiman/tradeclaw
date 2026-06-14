jest.mock('../winning-cells', () => ({
  isWinningCell: jest.fn(() => true),
  getWinningCellsMode: jest.fn(() => 'shadow'),
}));

jest.mock('../risk-pipeline', () => ({
  runRiskPipeline: jest.fn(),
}));

jest.mock('../regime-filter', () => ({
  getDominantRegime: jest.fn(() => 'range'),
}));

jest.mock('../regime-resolution', () => ({
  fetchResolvedRegimeMap: jest.fn(() =>
    Promise.resolve({ regimes: new Map(), classTilts: new Map() }),
  ),
}));

// D8 shadow recorder: mock the mode resolver + the side-effect sink so the
// invariant test can assert (a) the shadow path runs in shadow/active and is
// skipped in off, and (b) it NEVER alters the returned decisions. The real sink
// reads signal_history + the fs log; mocking it keeps this a pure unit test of
// computeBroadcastDecisions' contract.
jest.mock('../strategy-router-shadow', () => ({
  getStrategyRouterMode: jest.fn(() => 'shadow'),
}));

jest.mock('../router-decisions-log', () => ({
  recordRouterShadow: jest.fn(() => Promise.resolve()),
}));

import { computeBroadcastDecisions, type BroadcastCandidate } from '../broadcast-decision';
import { isWinningCell, getWinningCellsMode } from '../winning-cells';
import { runRiskPipeline } from '../risk-pipeline';
import { fetchResolvedRegimeMap } from '../regime-resolution';
import { getStrategyRouterMode } from '../strategy-router-shadow';
import { recordRouterShadow } from '../router-decisions-log';

const mockedIsWinningCell = isWinningCell as jest.MockedFunction<typeof isWinningCell>;
const mockedCellsMode = getWinningCellsMode as jest.MockedFunction<typeof getWinningCellsMode>;
const mockedPipeline = runRiskPipeline as jest.MockedFunction<typeof runRiskPipeline>;
const mockedRegimeMap = fetchResolvedRegimeMap as jest.MockedFunction<typeof fetchResolvedRegimeMap>;
const mockedRouterMode = getStrategyRouterMode as jest.MockedFunction<typeof getStrategyRouterMode>;
const mockedRecordShadow = recordRouterShadow as jest.MockedFunction<typeof recordRouterShadow>;

function candidate(id: string, symbol: string): BroadcastCandidate {
  return {
    id,
    symbol,
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entry: 100,
    takeProfit1: 104,
    stopLoss: 98,
  };
}

function pipelineResult(approved: Array<{ id: string; symbol: string }>, vetoed: Array<{ id: string; symbol: string; reason: string; vetoedBy: string }>, allocations: Array<{ symbol: string; positionSizePct: number }>) {
  return {
    approved: approved.map(({ id, symbol }) => ({ id, symbol, direction: 'BUY', confidence: 80, entry: 100, stopLoss: 98, takeProfit1: 104, takeProfit2: null, takeProfit3: null, timeframe: 'H1' })),
    vetoed: vetoed.map((v) => ({
      signal: { id: v.id, symbol: v.symbol, direction: 'BUY', confidence: 80, entry: 100, stopLoss: 98, takeProfit1: 104, takeProfit2: null, takeProfit3: null, timeframe: 'H1' },
      reason: v.reason,
      vetoedBy: v.vetoedBy,
    })),
    report: {
      regime: 'range',
      riskState: {},
      activeBreakers: [],
      canTrade: true,
      llmVerification: null,
      allocations: allocations.map((a) => ({ ...a, approved: true, reason: '' })),
      timestamp: new Date().toISOString(),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRegimeMap.mockResolvedValue({ regimes: new Map(), classTilts: new Map() } as never);
  mockedCellsMode.mockReturnValue('shadow' as never);
  mockedIsWinningCell.mockReturnValue(true as never);
  mockedRouterMode.mockReturnValue('shadow' as never);
  mockedRecordShadow.mockResolvedValue(undefined as never);
});

describe('computeBroadcastDecisions', () => {
  it('returns empty map and runs nothing for an empty candidate list', async () => {
    const decisions = await computeBroadcastDecisions([]);
    expect(decisions.size).toBe(0);
    expect(mockedPipeline).not.toHaveBeenCalled();
    expect(mockedRegimeMap).not.toHaveBeenCalled(); // fetchResolvedRegimeMap not called for empty input
  });

  it('records approved and vetoed decisions with regime + allocation', async () => {
    const a = candidate('a', 'BTCUSD');
    const b = candidate('b', 'ETHUSD');
    mockedRegimeMap.mockResolvedValue({ regimes: new Map([['BTCUSD', 'trend']]), classTilts: new Map() } as never);
    mockedPipeline.mockResolvedValue(pipelineResult(
      [{ id: 'a', symbol: 'BTCUSD' }],
      [{ id: 'b', symbol: 'ETHUSD', reason: 'streak blocked', vetoedBy: 'circuit_breaker' }],
      [{ symbol: 'BTCUSD', positionSizePct: 7.5 }, { symbol: 'ETHUSD', positionSizePct: 0 }],
    ) as never);

    const decisions = await computeBroadcastDecisions([a, b]);

    const da = decisions.get('a')!;
    expect(da).toMatchObject({ blocked: false, recordable: true, regime: 'trend', allocationPct: 7.5 });
    const db = decisions.get('b')!;
    expect(db.blocked).toBe(true);
    expect(db.recordable).toBe(true);
    expect(db.blockReason).toBe('circuit_breaker: streak blocked');
    // ETHUSD not in regime map → dominant fallback
    expect(db.regime).toBe('range');
  });

  it('blocks non-winning cells deterministically when curation is active, without sending them to the pipeline', async () => {
    const a = candidate('a', 'BTCUSD');
    const b = candidate('b', 'DOGEUSD');
    mockedCellsMode.mockReturnValue('active' as never);
    mockedIsWinningCell.mockImplementation(((symbol: string) => symbol === 'BTCUSD') as never);
    mockedPipeline.mockResolvedValue(pipelineResult([{ id: 'a', symbol: 'BTCUSD' }], [], [{ symbol: 'BTCUSD', positionSizePct: 5 }]) as never);

    const decisions = await computeBroadcastDecisions([a, b]);

    expect(decisions.get('b')).toMatchObject({
      blocked: true,
      recordable: true,
      blockReason: expect.stringContaining('winning_cells'),
    });
    expect(decisions.get('a')).toMatchObject({ blocked: false });
    const pipelineInput = mockedPipeline.mock.calls[0][0] as Array<{ id: string }>;
    expect(pipelineInput.map((s) => s.id)).toEqual(['a']);
  });

  it('marks pipeline-outage fallbacks blocked=false and NOT recordable', async () => {
    const a = candidate('a', 'BTCUSD');
    mockedPipeline.mockRejectedValue(new Error('risk-state db down'));

    const decisions = await computeBroadcastDecisions([a]);

    expect(decisions.get('a')).toMatchObject({ blocked: false, recordable: false });
  });

  it('survives a regime-map fetch failure (decisions still computed, range regime)', async () => {
    const a = candidate('a', 'BTCUSD');
    mockedRegimeMap.mockRejectedValue(new Error('db down'));
    mockedPipeline.mockResolvedValue(pipelineResult([{ id: 'a', symbol: 'BTCUSD' }], [], []) as never);

    const decisions = await computeBroadcastDecisions([a]);

    expect(decisions.get('a')).toMatchObject({ blocked: false, recordable: true, regime: 'range' });
  });
});

// ── D8 invariant: the shadow recorder is side-effect-only ──────────────
// The whole point of the shadow recorder is that it changes NOTHING about the
// live broadcast. These tests prove computeBroadcastDecisions returns IDENTICAL
// decisions with shadow mode on vs off, and that off skips the recorder.
describe('computeBroadcastDecisions — D8 shadow recorder is side-effect-only', () => {
  function setupTwoCandidates() {
    const a = candidate('a', 'BTCUSD');
    const b = candidate('b', 'ETHUSD');
    mockedRegimeMap.mockResolvedValue({ regimes: new Map([['BTCUSD', 'trend']]), classTilts: new Map() } as never);
    mockedPipeline.mockResolvedValue(pipelineResult(
      [{ id: 'a', symbol: 'BTCUSD' }],
      [{ id: 'b', symbol: 'ETHUSD', reason: 'streak blocked', vetoedBy: 'circuit_breaker' }],
      [{ symbol: 'BTCUSD', positionSizePct: 7.5 }, { symbol: 'ETHUSD', positionSizePct: 0 }],
    ) as never);
    return [a, b];
  }

  // Serialize a decisions map to a stable, comparable shape.
  function serialize(m: Map<string, unknown>): unknown {
    return [...m.entries()].map(([k, v]) => [k, v]).sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  }

  it('returns IDENTICAL decisions with shadow mode ON vs OFF', async () => {
    const off = await (async () => {
      mockedRouterMode.mockReturnValue('off' as never);
      return computeBroadcastDecisions(setupTwoCandidates());
    })();

    jest.clearAllMocks();
    mockedRegimeMap.mockResolvedValue({ regimes: new Map(), classTilts: new Map() } as never);
    mockedCellsMode.mockReturnValue('shadow' as never);
    mockedIsWinningCell.mockReturnValue(true as never);
    mockedRecordShadow.mockResolvedValue(undefined as never);

    const shadow = await (async () => {
      mockedRouterMode.mockReturnValue('shadow' as never);
      return computeBroadcastDecisions(setupTwoCandidates());
    })();

    // Byte-identical decision content regardless of shadow mode.
    expect(serialize(shadow)).toEqual(serialize(off));
  });

  it('skips the recorder entirely in off mode', async () => {
    mockedRouterMode.mockReturnValue('off' as never);
    await computeBroadcastDecisions(setupTwoCandidates());
    expect(mockedRecordShadow).not.toHaveBeenCalled();
  });

  it('invokes the recorder in shadow mode without awaiting it (fire-and-forget)', async () => {
    mockedRouterMode.mockReturnValue('shadow' as never);
    const decisions = await computeBroadcastDecisions(setupTwoCandidates());
    expect(mockedRecordShadow).toHaveBeenCalledTimes(1);
    // Decisions returned regardless — the recorder is not awaited into the result.
    expect(decisions.size).toBe(2);
    const [mode, cands] = mockedRecordShadow.mock.calls[0];
    expect(mode).toBe('shadow');
    // Candidates passed through unmodified (id/symbol/direction/confidence).
    expect((cands as Array<{ id: string }>).map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('invokes the recorder in active mode too (active records like shadow in this branch)', async () => {
    mockedRouterMode.mockReturnValue('active' as never);
    await computeBroadcastDecisions(setupTwoCandidates());
    expect(mockedRecordShadow).toHaveBeenCalledTimes(1);
    expect(mockedRecordShadow.mock.calls[0][0]).toBe('active');
  });

  it('does NOT let a recorder rejection break the returned decisions', async () => {
    mockedRouterMode.mockReturnValue('shadow' as never);
    mockedRecordShadow.mockRejectedValue(new Error('sink blew up') as never);
    const decisions = await computeBroadcastDecisions(setupTwoCandidates());
    // The .catch + recorder's own guard contain it — decisions still returned.
    expect(decisions.get('a')).toMatchObject({ blocked: false, recordable: true });
    expect(decisions.get('b')).toMatchObject({ blocked: true, recordable: true });
  });
});
