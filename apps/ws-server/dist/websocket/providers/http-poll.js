const DEFAULT_POLL_INTERVAL_MS = 5_000;
// Free API sources for forex/metals
const METALS_API = 'https://metals.live/api/v1/spot';
const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';
export class HttpPollProvider {
    name = 'http-poll';
    symbols = new Set();
    onTick = null;
    pollTimer = null;
    connected = false;
    lastPrices = new Map();
    pollIntervalMs;
    constructor(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS) {
        this.pollIntervalMs = pollIntervalMs;
    }
    async connect(symbols, onTick) {
        this.onTick = onTick;
        for (const s of symbols)
            this.symbols.add(s.toUpperCase());
        this.connected = true;
        // Initial fetch
        await this.poll();
        // Start polling
        this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
    }
    async disconnect() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.connected = false;
    }
    subscribe(symbols) {
        for (const s of symbols)
            this.symbols.add(s.toUpperCase());
    }
    unsubscribe(symbols) {
        for (const s of symbols)
            this.symbols.delete(s.toUpperCase());
    }
    isConnected() {
        return this.connected;
    }
    async poll() {
        const promises = [];
        const hasMetals = Array.from(this.symbols).some(s => s === 'XAUUSD' || s === 'XAGUSD');
        const hasForex = Array.from(this.symbols).some(s => ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'].includes(s));
        if (hasMetals)
            promises.push(this.fetchMetals());
        if (hasForex)
            promises.push(this.fetchForex());
        await Promise.allSettled(promises);
    }
    async fetchMetals() {
        try {
            const res = await fetch(METALS_API);
            if (!res.ok)
                return;
            const data = await res.json();
            const spot = data[0];
            if (!spot)
                return;
            if (spot.gold && this.symbols.has('XAUUSD')) {
                this.emitIfChanged('XAUUSD', spot.gold);
            }
            if (spot.silver && this.symbols.has('XAGUSD')) {
                this.emitIfChanged('XAGUSD', spot.silver);
            }
        }
        catch {
            // Silently fail — next poll will retry
        }
    }
    async fetchForex() {
        try {
            const res = await fetch(EXCHANGE_RATE_API);
            if (!res.ok)
                return;
            const data = await res.json();
            const rates = data.rates;
            if (!rates)
                return;
            const forexMap = {
                EURUSD: () => rates.EUR ? 1 / rates.EUR : undefined,
                GBPUSD: () => rates.GBP ? 1 / rates.GBP : undefined,
                USDJPY: () => rates.JPY,
                AUDUSD: () => rates.AUD ? 1 / rates.AUD : undefined,
                USDCAD: () => rates.CAD,
                NZDUSD: () => rates.NZD ? 1 / rates.NZD : undefined,
                USDCHF: () => rates.CHF,
            };
            for (const [symbol, getter] of Object.entries(forexMap)) {
                if (this.symbols.has(symbol)) {
                    const price = getter();
                    if (price && price > 0) {
                        this.emitIfChanged(symbol, price);
                    }
                }
            }
        }
        catch {
            // Silently fail
        }
    }
    emitIfChanged(symbol, price) {
        const last = this.lastPrices.get(symbol);
        if (last !== undefined && Math.abs(last - price) / price < 0.000001)
            return;
        this.lastPrices.set(symbol, price);
        const spread = price * 0.0003; // Wider spread for HTTP-polled data
        const tick = {
            symbol,
            bid: price - spread / 2,
            ask: price + spread / 2,
            mid: price,
            timestamp: Date.now(),
            provider: 'http-poll',
        };
        if (this.onTick)
            this.onTick(tick);
    }
}
//# sourceMappingURL=http-poll.js.map