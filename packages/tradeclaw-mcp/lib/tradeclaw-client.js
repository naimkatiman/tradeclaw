'use strict';

const DEFAULT_BASE_URL = 'https://tradeclaw.win';

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'GBPJPY', 'AUDUSD', 'USDCAD'];
const TIMEFRAMES = ['H1', 'H4', 'D1'];

class TradeClawClient {
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async fetch(path, params = {}) {
    const url = new URL(this.baseUrl + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'tradeclaw-mcp/0.1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`TradeClaw API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // Get trading signals
  async getSignals({ pair, timeframe, direction, minConfidence, limit = 10 } = {}) {
    return this.fetch('/api/v1/signals', { pair, timeframe, direction, minConfidence, limit });
  }

  // Get leaderboard
  async getLeaderboard({ period = '30d', sort = 'hitRate', limit = 10 } = {}) {
    return this.fetch('/api/v1/leaderboard', { period, sort, limit });
  }

  // Get health/status
  async getHealth() {
    return this.fetch('/api/v1/health');
  }

  // Get signal for a specific pair as a badge summary
  async getBadge(pair) {
    return this.fetch(`/api/v1/badge/${pair.toUpperCase()}`);
  }
}

module.exports = { TradeClawClient, PAIRS, TIMEFRAMES };
