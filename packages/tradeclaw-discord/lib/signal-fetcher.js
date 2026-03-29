/**
 * Fetches signals from TradeClaw API with local fallback
 */

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD', 'DOTUSD', 'AVAXUSD'];
const TIMEFRAMES = ['M5', 'M15', 'H1', 'H4', 'D1'];
const DIRECTIONS = ['BUY', 'SELL'];
const INDICATORS = ['RSI', 'MACD', 'EMA', 'Bollinger', 'Stochastic'];

function generateFallbackSignal(pair) {
  const symbol = pair || PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const direction = DIRECTIONS[Math.floor(Math.random() * 2)];
  const timeframe = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];
  const confidence = 60 + Math.floor(Math.random() * 35);
  const price = symbol.startsWith('BTC') ? 40000 + Math.random() * 10000
    : symbol.startsWith('ETH') ? 2000 + Math.random() * 1500
    : symbol.startsWith('XAU') ? 1900 + Math.random() * 300
    : symbol.startsWith('XAG') ? 22 + Math.random() * 8
    : 0.8 + Math.random() * 1.5;

  const priceFormatted = price > 100 ? price.toFixed(2) : price.toFixed(4);
  const tpMultiplier = direction === 'BUY' ? 1.02 : 0.98;
  const slMultiplier = direction === 'BUY' ? 0.99 : 1.01;

  return {
    symbol,
    direction,
    timeframe,
    confidence,
    price: parseFloat(priceFormatted),
    tp: parseFloat((price * tpMultiplier).toFixed(price > 100 ? 2 : 4)),
    sl: parseFloat((price * slMultiplier).toFixed(price > 100 ? 2 : 4)),
    rsi: (30 + Math.random() * 40).toFixed(1),
    macd: direction === 'BUY' ? 'bullish' : 'bearish',
    indicators: INDICATORS.slice(0, 3 + Math.floor(Math.random() * 3)),
    timestamp: new Date().toISOString(),
    source: 'fallback',
  };
}

function generateLeaderboard(period) {
  return PAIRS.slice(0, 5).map((pair, i) => ({
    rank: i + 1,
    pair,
    winRate: (85 - i * 5 + Math.random() * 5).toFixed(1),
    trades: 20 + Math.floor(Math.random() * 30),
    pnl: ((5 - i) * 2.5 + Math.random() * 3).toFixed(1),
    period: period || '7d',
  }));
}

class SignalFetcher {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchSignal(pair) {
    try {
      const url = new URL('/api/v1/signals', this.baseUrl);
      if (pair) url.searchParams.set('pair', pair);
      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (data.ok && data.signals && data.signals.length > 0) {
        return { ...data.signals[0], source: 'api' };
      }
      return generateFallbackSignal(pair);
    } catch {
      return generateFallbackSignal(pair);
    }
  }

  async fetchLeaderboard(period) {
    try {
      const url = new URL('/api/leaderboard', this.baseUrl);
      if (period) url.searchParams.set('period', period);

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (data.leaderboard && data.leaderboard.length > 0) {
        return data.leaderboard.slice(0, 5);
      }
      return generateLeaderboard(period);
    } catch {
      return generateLeaderboard(period);
    }
  }

  async fetchHealth() {
    try {
      const url = new URL('/api/health', this.baseUrl);
      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      return await res.json();
    } catch {
      return {
        status: 'unknown',
        message: 'Could not reach TradeClaw API',
        url: this.baseUrl,
      };
    }
  }
}

module.exports = { SignalFetcher, generateFallbackSignal, generateLeaderboard };
