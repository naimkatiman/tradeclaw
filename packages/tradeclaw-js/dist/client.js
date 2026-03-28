const DEFAULT_BASE_URL = 'https://tradeclaw.win';
const DEFAULT_TIMEOUT = 10000;
export class TradeclawClient {
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    }
    async request(path) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'tradeclaw-js/0.1.0',
        };
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
            const res = await fetch(url, { headers, signal: controller.signal });
            if (!res.ok) {
                throw new Error(`TradeClaw API error: ${res.status} ${res.statusText} — ${url}`);
            }
            return (await res.json());
        }
        finally {
            clearTimeout(timer);
        }
    }
    /**
     * Fetch live trading signals.
     * @example
     * const signals = await client.signals({ pair: 'BTCUSD', limit: 10 });
     */
    async signals(filter = {}) {
        const params = new URLSearchParams();
        if (filter.pair)
            params.set('pair', filter.pair);
        if (filter.direction)
            params.set('direction', filter.direction);
        if (filter.timeframe)
            params.set('timeframe', filter.timeframe);
        if (filter.limit)
            params.set('limit', String(filter.limit));
        if (filter.minConfidence)
            params.set('minConfidence', String(filter.minConfidence));
        const qs = params.toString();
        const data = await this.request(`/api/v1/signals${qs ? `?${qs}` : ''}`);
        return Array.isArray(data) ? data : data.signals ?? [];
    }
    /**
     * Fetch the signal accuracy leaderboard.
     * @example
     * const board = await client.leaderboard({ period: '30d', sort: 'hitRate' });
     */
    async leaderboard(filter = {}) {
        const params = new URLSearchParams();
        if (filter.period)
            params.set('period', filter.period);
        if (filter.sort)
            params.set('sort', filter.sort);
        const qs = params.toString();
        const data = await this.request(`/api/v1/leaderboard${qs ? `?${qs}` : ''}`);
        return Array.isArray(data) ? data : data.leaderboard ?? [];
    }
    /**
     * Check the health of a TradeClaw instance.
     * @example
     * const health = await client.health();
     */
    async health() {
        return this.request('/api/v1/health');
    }
    /**
     * Get a shields.io-compatible badge JSON for a given pair.
     * @example
     * const badge = await client.badge('BTCUSD');
     */
    async badge(pair) {
        return this.request(`/api/v1/badge/${pair}`);
    }
}
