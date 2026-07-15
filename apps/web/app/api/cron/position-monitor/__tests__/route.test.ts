import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/cron-auth', () => ({
  requireCronAuth: jest.fn(() => null),
}));

jest.mock('../../../../../lib/paper-trading', () => ({
  getAllOpenPositionsForSweep: jest.fn(),
  closePosition: jest.fn(),
}));

import { closePosition, getAllOpenPositionsForSweep, type Position } from '../../../../../lib/paper-trading';
import { evaluatePaperExit, GET } from '../route';

const mockedGetPositions = getAllOpenPositionsForSweep as jest.MockedFunction<typeof getAllOpenPositionsForSweep>;
const mockedClosePosition = closePosition as jest.MockedFunction<typeof closePosition>;

const position: Position = {
  id: 'paper-position-1',
  userId: 'user-1',
  symbol: 'BTCUSD',
  direction: 'BUY',
  entryPrice: 100,
  quantity: 500,
  openedAt: '2026-07-15T00:00:00.000Z',
  signalId: 'signal-1',
  stopLoss: 95,
  takeProfit: 110,
};

describe('paper position monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the provider observation instead of inventing a threshold fill', () => {
    expect(evaluatePaperExit(position, 90)).toEqual({ reason: 'stopLoss', observedPrice: 90 });
    expect(evaluatePaperExit(position, 100)).toBeNull();
  });

  it('passes the observed price into the paper slippage model and reports the modeled fill separately', async () => {
    mockedGetPositions.mockResolvedValue([position]);
    mockedClosePosition.mockResolvedValue({
      portfolio: {} as never,
      trade: { exitPrice: 89.91, pnl: -50.45, pnlPercent: -10.09 } as never,
    });
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('binance.com')) {
        return new Response(JSON.stringify([{ symbol: 'BTCUSDT', lastPrice: '90' }]), { status: 200 });
      }
      if (url.includes('open.er-api.com')) {
        return new Response(JSON.stringify({ rates: {} }), { status: 200 });
      }
      return new Response('Close\n0', { status: 200 });
    });

    const response = await GET(new NextRequest('http://localhost/api/cron/position-monitor'));
    const body = await response.json();

    expect(mockedClosePosition).toHaveBeenCalledWith(
      { userId: 'user-1', positionId: 'paper-position-1' },
      90,
      'stopLoss',
    );
    expect(body.mode).toBe('paper-simulation');
    expect(body.closed[0]).toMatchObject({
      observedPrice: 90,
      exitPrice: 89.91,
      priceSource: 'binance-spot',
    });
    expect(body.closed[0].priceFetchedAt).toEqual(expect.any(String));
  });

  it('does not couple paper closes to public signal history or broadcasts', () => {
    const source = readFileSync(resolve(__dirname, '../route.ts'), 'utf8');
    expect(source).not.toMatch(/recordTradeOutcomeToHistory|broadcastOutcomeReply|sendTelegramOutcomeReply/);
  });
});
