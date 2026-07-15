jest.mock('../../../../../lib/paper-trading', () => ({
  getDemoUserId: jest.fn(() => 'demo-user'),
  getPortfolio: jest.fn(),
}));

import { getPortfolio } from '../../../../../lib/paper-trading';
import { GET } from '../route';

const mockedGetPortfolio = getPortfolio as jest.MockedFunction<typeof getPortfolio>;

describe('paper portfolio widget API', () => {
  it('treats quantity as stored dollar notional and does not claim open valuation', async () => {
    mockedGetPortfolio.mockResolvedValue({
      userId: 'demo-user',
      balance: 10_100,
      startingBalance: 10_000,
      positions: [
        {
          id: 'position-1',
          userId: 'demo-user',
          symbol: 'BTCUSD',
          direction: 'BUY',
          entryPrice: 100,
          quantity: 500,
          openedAt: '2026-07-15T00:00:00.000Z',
        },
      ],
      history: [],
      equityCurve: [{ timestamp: '2026-07-15T00:00:00.000Z', balance: 10_100, equity: 10_100 }],
      stats: {
        totalTrades: 1,
        winRate: 100,
        avgPnl: 100,
        bestTrade: 100,
        worstTrade: 100,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 999,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      available: true,
      mode: 'paper-simulation',
      realizedBalance: 10_100,
      equity: null,
      equityAvailable: false,
      openPnl: null,
      openPnlAvailable: false,
      grossExposurePct: 4.95,
      netExposurePct: 4.95,
      notionalBasis: 'stored-dollar-notional',
    });
    expect(body).not.toHaveProperty('top3Positions');
  });
});
