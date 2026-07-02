import { MOCK_TRENDING } from './route';

jest.mock('../../../lib/tracked-signals', () => ({
  getTrackedSignalsForRequest: jest.fn(),
}));

describe('news fallback data (MOCK_TRENDING)', () => {
  it('carries no fabricated trading signals', () => {
    // When CoinGecko is degraded the page serves this fallback. It may show
    // trending coin names/ranks, but it must never invent BUY/SELL conviction —
    // a fabricated signal on a trading product is a direct trust violation.
    for (const coin of MOCK_TRENDING) {
      expect(coin.signal).toBeNull();
    }
  });

  it('still lists trending coins so the page stays usable when upstream is degraded', () => {
    expect(MOCK_TRENDING.length).toBeGreaterThan(0);
    expect(MOCK_TRENDING.every((c) => Boolean(c.name) && Boolean(c.symbol))).toBe(true);
  });
});
