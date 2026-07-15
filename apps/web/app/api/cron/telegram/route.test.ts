import { NextRequest } from 'next/server';

jest.mock('../../../../lib/cron-auth', () => ({ requireCronAuth: jest.fn(() => null) }));
jest.mock('../../../../lib/telegram-channels', () => ({
  getBotToken: jest.fn(() => 'token'),
  getFreeChannelId: jest.fn(() => 'channel'),
}));
jest.mock('../../../../lib/telegram-broadcast', () => ({ broadcastTopSignals: jest.fn() }));
jest.mock('../../../../lib/discord-broadcast', () => ({ broadcastSignalsToDiscord: jest.fn() }));
jest.mock('../../../../lib/db-pool', () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock('../../../../lib/signal-history', () => ({
  NOT_DARK_STRATEGY_SQL: "(strategy_id IS NULL OR strategy_id NOT LIKE 'tv-%')",
}));
jest.mock('../../../../lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { query } from '../../../../lib/db-pool';
import { broadcastTopSignals } from '../../../../lib/telegram-broadcast';
import { broadcastSignalsToDiscord } from '../../../../lib/discord-broadcast';
import { evaluateCostAdjustedEdge } from '../../../../lib/cost-adjusted-edge-gate';
import { GET } from './route';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedTelegram = broadcastTopSignals as jest.MockedFunction<typeof broadcastTopSignals>;
const mockedDiscord = broadcastSignalsToDiscord as jest.MockedFunction<typeof broadcastSignalsToDiscord>;
const mockedEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;

describe('GET /api/cron/telegram edge readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it('halts every entry-like fan-out before selecting or sending signals', async () => {
    mockedEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
      usableCount: 120,
      activeDays: 40,
      coverage: 0.95,
      perSignalMeanNetR: -0.2,
      equalDayLowerBoundNetR: -0.3,
    } as never);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const response = await GET(new NextRequest('http://localhost/api/cron/telegram'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      ok: false,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockedTelegram).not.toHaveBeenCalled();
    expect(mockedDiscord).not.toHaveBeenCalled();
    expect(mockedQuery).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
