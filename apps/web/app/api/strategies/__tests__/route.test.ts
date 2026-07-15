import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/strategies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/strategies', () => {
  it('returns public strategy definitions without invented performance results', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(body.strategies.length);
    expect(body.strategies.length).toBeGreaterThanOrEqual(5);
    expect(body.performanceStatus).toEqual({
      available: false,
      basis: 'unavailable',
      detail: expect.stringMatching(/no measured backtest or live-execution results/i),
    });

    for (const strategy of body.strategies) {
      expect(typeof strategy.id).toBe('string');
      expect(typeof strategy.name).toBe('string');
      expect(typeof strategy.description).toBe('string');
      expect(strategy.description).not.toMatch(/high win rate/i);
      expect(Array.isArray(strategy.indicators)).toBe(true);
      expect(Array.isArray(strategy.symbols)).toBe(true);
      expect(Array.isArray(strategy.timeframes)).toBe(true);
      expect(strategy.riskManagement).toEqual(expect.any(Object));
      expect(typeof strategy.isActive).toBe('boolean');
      expect(typeof strategy.createdAt).toBe('string');
      expect(strategy).not.toHaveProperty('performance');
    }
  });
});

describe('POST /api/strategies', () => {
  it('validates input and returns a normalized strategy object', async () => {
    const res = await POST(makePostRequest({
      name: 'Golden Cross RSI Filter',
      description: 'Long-only swing strategy',
      indicators: [
        { name: 'EMA', params: { shortPeriod: 20, longPeriod: 50 }, condition: 'golden cross', weight: 0.6 },
        { name: 'RSI', params: { period: 14 }, condition: 'below 70', weight: 0.4 },
      ],
      symbols: ['BTCUSD', 'ETHUSD'],
      timeframes: ['H1', 'H4'],
      risk: { stopLossPct: 1.2, takeProfitPct: 2.8, riskRewardRatio: 2.33 },
    }));

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.strategy).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^strat-/),
      name: 'Golden Cross RSI Filter',
      description: 'Long-only swing strategy',
      symbols: ['BTCUSD', 'ETHUSD'],
      timeframes: ['H1', 'H4'],
      isActive: false,
      createdAt: expect.any(String),
    }));
    expect(body.strategy).not.toHaveProperty('performance');
    expect(body.performanceStatus).toEqual(expect.objectContaining({
      available: false,
      basis: 'unavailable',
    }));
    expect(new Date(body.strategy.createdAt).toString()).not.toBe('Invalid Date');
    expect(body.strategy.riskManagement).toEqual(expect.objectContaining({
      maxRiskPercent: expect.any(Number),
      leverage: expect.any(Number),
      maxOpenTrades: 1,
      tpMode: 'fixed',
      slMode: 'atr',
    }));
  });

  it('rejects malformed payloads', async () => {
    const res = await POST(makePostRequest({ name: '', indicators: [], symbols: [] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});
