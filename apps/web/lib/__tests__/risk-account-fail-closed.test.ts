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
  getDominantRegime: jest.fn(() => 'neutral'),
}));

jest.mock('@tradeclaw/signals', () => ({
  CircuitBreakerEngine: {
    evaluateForRegime: jest.fn(() => ({
      activeBreakers: [],
      canTrade: true,
      breakers: [],
    })),
  },
  computeAllocation: jest.fn(() => ({
    positionSizePct: 5,
    leverageMultiplier: 1,
    approved: true,
    regime: 'neutral',
    rules: {},
  })),
  vetoCheck: jest.fn(() => ({ approved: true })),
}));

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
import { runRiskPipeline } from '../risk-pipeline';
import { computeAllocation } from '@tradeclaw/signals';

const mockedGetPortfolio = getPortfolio as jest.MockedFunction<typeof getPortfolio>;
const mockedGetRiskState = getRiskState as jest.MockedFunction<typeof getRiskState>;
const mockedComputeAllocation = computeAllocation as jest.MockedFunction<typeof computeAllocation>;

describe('risk routing account gate', () => {
  const originalRiskUser = process.env.RISK_PAPER_USER_ID;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalRiskUser === undefined) delete process.env.RISK_PAPER_USER_ID;
    else process.env.RISK_PAPER_USER_ID = originalRiskUser;
  });

  it('vetoes every candidate before allocation when risk account state is unavailable', async () => {
    delete process.env.RISK_PAPER_USER_ID;
    mockedGetRiskState.mockResolvedValue({
      metrics: {
        dailyPnlPct: 0,
        weeklyPnlPct: 0,
        drawdownFromPeakPct: 0,
        consecutiveLosses: 0,
        openPositions: [],
      },
      recentOutcomes: [],
      summary: {
        dailyPnlPct: 0,
        weeklyPnlPct: 0,
        drawdownFromPeakPct: 0,
        highWaterMark: 0,
        consecutiveLosses: 0,
        totalRecentTrades: 0,
        winRate: 0,
        source: 'empty',
      },
    });

    const signal = {
      id: 's1',
      symbol: 'BTCUSD',
      direction: 'BUY' as const,
      confidence: 80,
      entry: 100,
      stopLoss: 95,
      takeProfit1: 110,
      takeProfit2: null,
      takeProfit3: null,
      timeframe: 'H1',
    };
    const result = await runRiskPipeline([signal], new Map());

    expect(result.approved).toEqual([]);
    expect(result.vetoed).toEqual([
      expect.objectContaining({ signal, vetoedBy: 'risk_account' }),
    ]);
    expect(result.report.canTrade).toBe(false);
    expect(result.report.activeBreakers).toContain('risk_account_unavailable');
    expect(mockedGetPortfolio).not.toHaveBeenCalled();
  });

  it('does not add open-position notional to paper-account equity', async () => {
    process.env.RISK_PAPER_USER_ID = 'risk-user';
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
    mockedGetRiskState.mockResolvedValue({
      metrics: {
        dailyPnlPct: 0,
        weeklyPnlPct: 0,
        drawdownFromPeakPct: 0,
        consecutiveLosses: 0,
        openPositions: [{ symbol: 'ETHUSD', direction: 'BUY' }],
      },
      recentOutcomes: [],
      summary,
    });
    mockedGetPortfolio.mockResolvedValue({
      userId: 'risk-user',
      balance: 10_000,
      startingBalance: 10_000,
      positions: [{
        id: 'p1',
        userId: 'risk-user',
        symbol: 'ETHUSD',
        direction: 'BUY',
        entryPrice: 2_000,
        quantity: 2_000,
        openedAt: '2026-07-15T00:00:00.000Z',
      }],
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
    });
    const signal = {
      id: 's2',
      symbol: 'BTCUSD',
      direction: 'BUY' as const,
      confidence: 80,
      entry: 100,
      stopLoss: 95,
      takeProfit1: 110,
      takeProfit2: null,
      takeProfit3: null,
      timeframe: 'H1',
    };

    await runRiskPipeline([signal], new Map());

    expect(mockedComputeAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSD' }),
      'neutral',
      expect.objectContaining({
        totalEquity: 10_000,
        positionsValue: 2_000,
        cash: 8_000,
      }),
    );
  });
});
