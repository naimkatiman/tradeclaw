/**
 * End-to-end proof that live volatility reaches the allocator
 * (plan: docs/plans/2026-07-18-wire-vol-scaler.md).
 *
 * Uses the REAL computeAllocation (partial @tradeclaw/signals mock) so the
 * assertion covers the whole chain: fetchRegimeVolMap -> runRiskPipeline ->
 * computeAllocation -> computeVolatilityScaler. BTCUSD is tier 2 (weight
 * 0.8), trend rules cap a single position at 15%; confidence 100 gives an
 * unscaled 12%. currentVol 0.10 against the 0.025 trend baseline scales by
 * 0.25 -> 3%.
 */

jest.mock('../paper-trading', () => ({
  getPortfolio: jest.fn(),
}));

jest.mock('../risk-state', () => {
  const actual = jest.requireActual('../risk-state');
  return {
    ...actual,
    getRiskState: jest.fn(),
  };
});

jest.mock('../regime-filter', () => ({
  getDominantRegime: jest.fn(() => 'trend'),
  fetchRegimeVolMap: jest.fn(async () => new Map<string, number>()),
}));

jest.mock('@tradeclaw/signals', () => {
  const actual = jest.requireActual('@tradeclaw/signals');
  return {
    ...actual,
    CircuitBreakerEngine: {
      evaluateForRegime: jest.fn(() => ({
        activeBreakers: [],
        canTrade: true,
        breakers: [],
      })),
    },
    vetoCheck: jest.fn(() => ({ approved: true })),
  };
});

jest.mock('../llm-risk-verify', () => ({
  verifyRiskWithLlm: jest.fn(async () => ({
    concur: true,
    suggestedAction: 'proceed',
    concerns: [],
    reasoning: 'test',
    model: 'test',
    latencyMs: 0,
  })),
}));

import { getPortfolio } from '../paper-trading';
import { getRiskState } from '../risk-state';
import { fetchRegimeVolMap } from '../regime-filter';
import { runRiskPipeline } from '../risk-pipeline';

const mockedGetPortfolio = getPortfolio as jest.MockedFunction<typeof getPortfolio>;
const mockedGetRiskState = getRiskState as jest.MockedFunction<typeof getRiskState>;
const mockedFetchVolMap = fetchRegimeVolMap as jest.MockedFunction<typeof fetchRegimeVolMap>;

function healthyRiskState() {
  const summary = {
    dailyPnlPct: 0,
    weeklyPnlPct: 0,
    drawdownFromPeakPct: 0,
    highWaterMark: 10_000,
    consecutiveLosses: 0,
    totalRecentTrades: 0,
    winRate: 0,
    source: 'portfolio' as const,
  };
  return {
    metrics: {
      dailyPnlPct: 0,
      weeklyPnlPct: 0,
      drawdownFromPeakPct: 0,
      consecutiveLosses: 0,
      openPositions: [],
    },
    recentOutcomes: [],
    summary,
  };
}

function emptyPortfolio() {
  return {
    userId: 'risk-user',
    balance: 10_000,
    startingBalance: 10_000,
    positions: [],
    history: [],
    equityCurve: [],
    stats: {
      totalTrades: 0,
      winRate: 0,
      avgPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
    },
  };
}

const SIGNAL = {
  id: 's1',
  symbol: 'BTCUSD',
  direction: 'BUY' as const,
  confidence: 100,
  entry: 100,
  stopLoss: 95,
  takeProfit1: 110,
  takeProfit2: null,
  takeProfit3: null,
  timeframe: 'H1',
};

describe('risk pipeline volatility scaling', () => {
  const originalRiskUser = process.env.RISK_PAPER_USER_ID;

  beforeEach(() => {
    process.env.RISK_PAPER_USER_ID = 'risk-user';
    mockedGetRiskState.mockResolvedValue(healthyRiskState() as never);
    mockedGetPortfolio.mockResolvedValue(emptyPortfolio() as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalRiskUser === undefined) delete process.env.RISK_PAPER_USER_ID;
    else process.env.RISK_PAPER_USER_ID = originalRiskUser;
  });

  it('shrinks position size when the symbol vol is elevated (real allocator)', async () => {
    mockedFetchVolMap.mockResolvedValue(new Map([['BTCUSD', 0.1]]));

    const result = await runRiskPipeline([SIGNAL], new Map([['BTCUSD', 'trend']]));

    expect(result.report.allocations).toHaveLength(1);
    const alloc = result.report.allocations[0];
    // 15 (trend cap) x 1.0 (confidence) x 0.8 (tier 2) x 0.25 (vol scaler) = 3
    expect(alloc.positionSizePct).toBeCloseTo(3, 5);
    expect(alloc.reason).toContain('vol-scaled');
  });

  it('leaves size unscaled when no vol is available for the symbol', async () => {
    mockedFetchVolMap.mockResolvedValue(new Map());

    const result = await runRiskPipeline([SIGNAL], new Map([['BTCUSD', 'trend']]));

    const alloc = result.report.allocations[0];
    // 15 x 1.0 x 0.8, no vol scaling
    expect(alloc.positionSizePct).toBeCloseTo(12, 5);
    expect(alloc.reason).not.toContain('vol-scaled');
  });
});
