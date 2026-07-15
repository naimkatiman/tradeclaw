import { GET as getLeaderboardDemo } from '../leaderboard/route';
import { GET as getPaperTradingDemo } from '../paper-trading/route';

describe('deprecated synthetic performance endpoints', () => {
  it('does not return a fabricated leaderboard', async () => {
    const response = await getLeaderboardDemo();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.assets).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/hitRate|avgConfidence|totalSignals/);
  });

  it('does not return fabricated balances or positions', async () => {
    const response = await getPaperTradingDemo();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.positions).toEqual([]);
    expect(body).not.toHaveProperty('balance');
    expect(body).not.toHaveProperty('equity');
  });
});
