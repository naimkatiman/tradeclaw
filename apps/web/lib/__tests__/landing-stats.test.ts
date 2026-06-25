jest.mock('../db-pool', () => ({
  queryOne: jest.fn(),
}));

import { queryOne } from '../db-pool';
import { getLandingStats } from '../landing-stats';

const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;

describe('landing-stats — getLandingStats', () => {
  beforeEach(() => {
    mockedQueryOne.mockReset();
  });

  it('aggregates the latest metrics and generates free/pro samples from the latest real signal', async () => {
    mockedQueryOne
      .mockResolvedValueOnce({
        cumulative: '12.5',
        gross_wins: '15',
        gross_losses: '5',
        closed_count: '42',
        wins: '26',
        avg_win_pnl: '3.4',
        avg_loss_pnl: '-2.0',
      })
      .mockResolvedValueOnce({ c: '7' })
      .mockResolvedValueOnce({
        pair: 'XAUUSD',
        direction: 'BUY',
        entry_price: '2034.5',
        tp1: '2050.0',
        sl: '2020.0',
        confidence: '84.2',
        created_at: '2026-05-20T12:00:00.000Z',
      });

    const stats = await getLandingStats();

    expect(mockedQueryOne).toHaveBeenCalledTimes(3);
    expect(stats).toEqual({
      cumulativePnlPct: 12.5,
      profitFactor: 3,
      signalsToday: 7,
      closedSignals: 42,
      // 26 / 42 = 61.9%
      winRatePct: 61.9,
      // 3.4 / 2.0 = 1.7 → break-even 100 / 2.7 = 37.0
      payoffRatio: 1.7,
      breakEvenWinRatePct: 37,
      latestSignal: {
        symbol: 'XAUUSD',
        direction: 'BUY',
        entry: 2034.5,
        tp1: 2050,
        sl: 2020,
        confidence: 84.2,
        createdAt: '2026-05-20T12:00:00.000Z',
      },
      samples: {
        pro: {
          symbol: 'XAUUSD',
          direction: 'BUY',
          entry: 2034.5,
          tp1: 2050,
          sl: 2020,
          confidence: 84.2,
          createdAt: '2026-05-20T12:00:00.000Z',
        },
        free: {
          symbol: 'XAUUSD',
          direction: 'BUY',
          entry: 2034.5,
          tp1: 2050,
          sl: null,
          confidence: 84.2,
          createdAt: '2026-05-20T12:30:00.000Z',
        },
      },
    });
  });

  it('returns no latest sample when the latest signal query is empty and withholds win rate below 20 closed', async () => {
    mockedQueryOne
      .mockResolvedValueOnce({
        cumulative: '0',
        gross_wins: '8',
        gross_losses: '0',
        closed_count: '8',
        wins: '8',
        avg_win_pnl: '1.0',
        avg_loss_pnl: null,
      })
      .mockResolvedValueOnce({ c: '0' })
      .mockResolvedValueOnce(null);

    const stats = await getLandingStats();

    expect(stats).toEqual({
      cumulativePnlPct: 0,
      profitFactor: null,
      signalsToday: 0,
      closedSignals: 8,
      winRatePct: null,
      payoffRatio: null,
      breakEvenWinRatePct: null,
      latestSignal: null,
      samples: null,
    });
  });
});
