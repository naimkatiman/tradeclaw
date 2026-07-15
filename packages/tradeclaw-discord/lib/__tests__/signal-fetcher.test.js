const { SignalFetcher } = require('../signal-fetcher');
const { signalEmbed, leaderboardEmbed } = require('../formatter');

const observed = {
  id: 'candidate-1',
  symbol: 'BTCUSD',
  direction: 'BUY',
  timeframe: 'H1',
  confidence: 71,
  entry: 100,
  stopLoss: 98,
  takeProfit1: 102,
  timestamp: '2026-07-15T00:00:00.000Z',
  source: 'real',
  dataQuality: 'real',
  indicators: {
    rsi: { value: 45 },
    macd: { signal: 'bullish' },
  },
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('Discord SignalFetcher fail-closed behavior', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns explicit unavailability when the API cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await new SignalFetcher('https://example.test').fetchSignal('BTCUSD');

    expect(result).toEqual({
      available: false,
      dataQuality: 'unavailable',
      reason: 'signal-api-unreachable',
    });
    expect(result).not.toHaveProperty('price');
    expect(result).not.toHaveProperty('confidence');
  });

  it('rejects synthetic API rows rather than broadcasting them', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      signals: [{ ...observed, source: 'fallback', dataQuality: 'synthetic' }],
    }));
    const result = await new SignalFetcher('https://example.test').fetchSignal();

    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-provider-observed-candidate');
  });

  it('normalizes a complete provider-observed row without adding fields', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ signals: [observed] }));
    const result = await new SignalFetcher('https://example.test').fetchSignal('BTCUSD');

    expect(result).toMatchObject({
      available: true,
      symbol: 'BTCUSD',
      price: 100,
      tp: 102,
      sl: 98,
      confidence: 71,
      timestamp: observed.timestamp,
      dataQuality: 'real',
    });
  });

  it('does not substitute a different pair for the requested pair', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ signals: [observed] }));
    const result = await new SignalFetcher('https://example.test').fetchSignal('ETHUSD');

    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-provider-observed-candidate');
  });

  it('returns no generated leaderboard when resolved rows are absent', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ assets: [] }));
    const result = await new SignalFetcher('https://example.test').fetchLeaderboard('7d');

    expect(result).toEqual({
      available: false,
      dataQuality: 'unavailable',
      reason: 'no-resolved-observed-outcomes',
      entries: [],
    });
  });

  it('uses only observed directional outcome counts in the summary', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      assets: [{ pair: 'BTCUSD', resolved24h: 10, hits24h: 6, hitRate24h: 60 }],
      overall: { lastUpdated: Date.parse('2026-07-15T00:00:00.000Z') },
    }));
    const result = await new SignalFetcher('https://example.test').fetchLeaderboard('7d');

    expect(result).toEqual({
      available: true,
      dataQuality: 'observed-ohlcv-outcomes',
      computedAt: '2026-07-15T00:00:00.000Z',
      entries: [{
        rank: 1,
        pair: 'BTCUSD',
        resolved: 10,
        positiveMoves: 6,
        directionalHitRate: 60,
      }],
    });
  });
});

describe('Discord formatter truth labels', () => {
  it('renders unavailable data without a generated market timestamp', () => {
    const json = signalEmbed({ available: false, reason: 'offline' }).toJSON();
    expect(json.title).toBe('Research candidate unavailable');
    expect(json.description).toContain('No local fallback was generated');
    expect(json.timestamp).toBeUndefined();
  });

  it('labels the legacy confidence value as a rule score', () => {
    const json = signalEmbed({
      available: true,
      ...observed,
      price: observed.entry,
      tp: observed.takeProfit1,
      sl: observed.stopLoss,
      rsi: 45,
      macd: 'bullish',
    }).toJSON();
    expect(json.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Rule score', value: '71/100' }),
    ]));
  });

  it('does not label directional moves as trades or portfolio P&L', () => {
    const json = leaderboardEmbed({
      available: true,
      entries: [{ rank: 1, pair: 'BTCUSD', positiveMoves: 6, resolved: 10, directionalHitRate: 60 }],
      computedAt: null,
    }, '7d').toJSON();
    expect(json.description).toContain('positive 24h directional moves');
    expect(json.footer.text).toContain('not trades');
  });
});
