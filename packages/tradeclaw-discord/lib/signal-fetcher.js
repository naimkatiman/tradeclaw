/**
 * Fetches provider-observed research candidates and resolved outcome summaries.
 * Every failure is explicit; no local market or performance data is generated.
 */

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function normalizeSignal(value) {
  if (!isRecord(value)) return null;
  if (value.source !== 'real' || value.dataQuality !== 'real') return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  if (typeof value.symbol !== 'string' || value.symbol.length === 0) return null;
  if (value.direction !== 'BUY' && value.direction !== 'SELL') return null;
  if (typeof value.timeframe !== 'string' || value.timeframe.length === 0) return null;
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)) return null;
  if (value.confidence < 0 || value.confidence > 100) return null;
  if (!positiveNumber(value.entry)) return null;
  if (!positiveNumber(value.stopLoss)) return null;
  if (!positiveNumber(value.takeProfit1)) return null;
  if (typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp))) return null;

  const rsi = value.indicators && value.indicators.rsi;
  const macd = value.indicators && value.indicators.macd;

  return {
    available: true,
    id: value.id,
    symbol: value.symbol,
    direction: value.direction,
    timeframe: value.timeframe,
    confidence: value.confidence,
    price: value.entry,
    tp: value.takeProfit1,
    sl: value.stopLoss,
    rsi: rsi && typeof rsi.value === 'number' && Number.isFinite(rsi.value) ? rsi.value : null,
    macd: macd && (macd.signal === 'bullish' || macd.signal === 'bearish' || macd.signal === 'neutral')
      ? macd.signal
      : null,
    timestamp: value.timestamp,
    source: 'api-observed',
    dataQuality: 'real',
  };
}

function normalizeLeaderboardEntry(value, index) {
  if (!isRecord(value)) return null;
  if (typeof value.pair !== 'string' || value.pair.length === 0) return null;
  if (!Number.isInteger(value.resolved24h) || value.resolved24h <= 0) return null;
  if (!Number.isInteger(value.hits24h) || value.hits24h < 0 || value.hits24h > value.resolved24h) return null;
  if (typeof value.hitRate24h !== 'number' || !Number.isFinite(value.hitRate24h)) return null;

  return {
    rank: index + 1,
    pair: value.pair,
    resolved: value.resolved24h,
    positiveMoves: value.hits24h,
    directionalHitRate: value.hitRate24h,
  };
}

function unavailable(reason) {
  return {
    available: false,
    dataQuality: 'unavailable',
    reason,
  };
}

class SignalFetcher {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchSignal(pair) {
    try {
      const url = new URL('/api/signals', this.baseUrl);
      if (pair) url.searchParams.set('symbol', pair);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();

      if (isRecord(data) && data.available === false) {
        return unavailable(typeof data.reason === 'string' ? data.reason : 'signal-data-unavailable');
      }
      if (!res.ok) return unavailable(`signal-api-http-${res.status}`);

      const rows = isRecord(data) && Array.isArray(data.signals) ? data.signals : [];
      const requestedPair = pair ? pair.toUpperCase() : null;
      const signal = rows
        .map(normalizeSignal)
        .find(candidate => candidate && (!requestedPair || candidate.symbol.toUpperCase() === requestedPair));
      return signal || unavailable(rows.length > 0
        ? 'no-provider-observed-candidate'
        : 'no-observed-candidate');
    } catch {
      return unavailable('signal-api-unreachable');
    }
  }

  async fetchLeaderboard(period) {
    try {
      const url = new URL('/api/leaderboard', this.baseUrl);
      if (period) url.searchParams.set('period', period);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();

      if (!res.ok) return { ...unavailable(`leaderboard-api-http-${res.status}`), entries: [] };
      const rows = isRecord(data) && Array.isArray(data.assets) ? data.assets : [];
      const entries = rows
        .map(normalizeLeaderboardEntry)
        .filter(Boolean)
        .slice(0, 5)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      if (entries.length === 0) {
        return { ...unavailable('no-resolved-observed-outcomes'), entries: [] };
      }

      const lastUpdated = isRecord(data.overall) && typeof data.overall.lastUpdated === 'number'
        && Number.isFinite(data.overall.lastUpdated)
        ? new Date(data.overall.lastUpdated).toISOString()
        : null;

      return {
        available: true,
        dataQuality: 'observed-ohlcv-outcomes',
        entries,
        computedAt: lastUpdated,
      };
    } catch {
      return { ...unavailable('leaderboard-api-unreachable'), entries: [] };
    }
  }

  async fetchHealth() {
    try {
      const url = new URL('/api/health', this.baseUrl);
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return unavailable(`health-api-http-${res.status}`);
      const data = await res.json();
      return isRecord(data) ? data : unavailable('invalid-health-response');
    } catch {
      return unavailable('health-api-unreachable');
    }
  }
}

module.exports = { SignalFetcher, normalizeSignal, normalizeLeaderboardEntry };
