jest.mock('./binance-futures', () => ({
  getRealizedPnlSince: jest.fn(),
}));

import { getRealizedPnlSince } from './binance-futures';
import { checkLossKillSwitch } from './risk-rails';

const mockedIncome = getRealizedPnlSince as jest.MockedFunction<typeof getRealizedPnlSince>;

const account = (totalWalletBalance: number) => ({ totalWalletBalance });

describe('checkLossKillSwitch', () => {
  beforeEach(() => {
    mockedIncome.mockReset();
    delete process.env.EXEC_DAILY_LOSS_PCT;
    delete process.env.EXEC_WEEKLY_LOSS_PCT;
  });

  it('halts immediately when wallet equity is zero', async () => {
    // No income query needed — short-circuit before the network call.
    const verdict = await checkLossKillSwitch(account(0));
    expect(verdict.halted).toBe(true);
    expect(verdict.reason).toMatch(/zero_equity_kill/);
    expect(mockedIncome).not.toHaveBeenCalled();
  });

  it('halts when wallet equity is negative', async () => {
    const verdict = await checkLossKillSwitch(account(-1));
    expect(verdict.halted).toBe(true);
    expect(verdict.reason).toMatch(/zero_equity_kill/);
  });

  it('halts when daily loss exceeds threshold', async () => {
    process.env.EXEC_DAILY_LOSS_PCT = '5';
    const now = Date.now();
    mockedIncome.mockResolvedValueOnce([
      { time: now - 60_000, income: '-60', symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL' },
    ]);
    // -60 / 1000 = 6% > 5% threshold
    const verdict = await checkLossKillSwitch(account(1000));
    expect(verdict.halted).toBe(true);
    expect(verdict.reason).toMatch(/daily_loss_kill/);
  });

  it('does not halt when daily loss is below threshold', async () => {
    process.env.EXEC_DAILY_LOSS_PCT = '5';
    const now = Date.now();
    mockedIncome.mockResolvedValueOnce([
      { time: now - 60_000, income: '-30', symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL' },
    ]);
    // -30 / 1000 = 3% < 5% threshold
    const verdict = await checkLossKillSwitch(account(1000));
    expect(verdict.halted).toBe(false);
  });

  it('halts when weekly loss exceeds threshold even if daily is fine', async () => {
    process.env.EXEC_DAILY_LOSS_PCT = '5';
    process.env.EXEC_WEEKLY_LOSS_PCT = '12';
    const now = Date.now();
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;
    mockedIncome.mockResolvedValueOnce([
      { time: fiveDaysAgo, income: '-150', symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL' },
    ]);
    // -150 / 1000 = 15% > 12% weekly threshold; 0% daily.
    const verdict = await checkLossKillSwitch(account(1000));
    expect(verdict.halted).toBe(true);
    expect(verdict.reason).toMatch(/weekly_loss_kill/);
  });

  it('does not halt on positive realized PnL', async () => {
    mockedIncome.mockResolvedValueOnce([
      { time: Date.now() - 60_000, income: '50', symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL' },
    ]);
    const verdict = await checkLossKillSwitch(account(1000));
    expect(verdict.halted).toBe(false);
  });
});
