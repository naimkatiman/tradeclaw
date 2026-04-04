import { getSymbolCategory } from '@tradeclaw/signals';
import { BinanceProvider } from './providers/binance.js';
import { HttpPollProvider } from './providers/http-poll.js';
export class ProviderManager {
    providers = new Map();
    tickCallbacks = new Set();
    lastTicks = new Map();
    log;
    redis;
    constructor(log, redis) {
        this.log = log;
        this.redis = redis;
        // Register providers
        this.providers.set('binance', new BinanceProvider());
        this.providers.set('http-poll', new HttpPollProvider());
    }
    onTick(callback) {
        this.tickCallbacks.add(callback);
    }
    offTick(callback) {
        this.tickCallbacks.delete(callback);
    }
    async connectForSymbols(symbols) {
        const cryptoSymbols = symbols.filter(s => getSymbolCategory(s) === 'crypto');
        const otherSymbols = symbols.filter(s => getSymbolCategory(s) !== 'crypto');
        const handleTick = (tick, fromRedis = false) => {
            this.lastTicks.set(tick.symbol, tick);
            // Distribute to all local subscribers
            for (const cb of this.tickCallbacks) {
                cb(tick);
            }
            // Publish to Redis (skip if tick came from Redis to prevent loops)
            if (!fromRedis && this.redis.isConnected()) {
                this.redis.publishTick(tick).catch(() => {
                    // Redis publish failure is non-fatal
                });
            }
        };
        // Subscribe to Redis ticks from other instances
        if (this.redis.isConnected()) {
            this.redis.onTick((tick) => handleTick(tick, true));
        }
        const promises = [];
        if (cryptoSymbols.length > 0) {
            const binance = this.providers.get('binance');
            if (binance) {
                this.log.info({ symbols: cryptoSymbols }, 'Connecting Binance WS for crypto');
                promises.push(binance.connect(cryptoSymbols, (tick) => handleTick(tick)).catch(err => {
                    this.log.error({ err }, 'Binance WS connection failed, will retry');
                }));
            }
        }
        if (otherSymbols.length > 0) {
            const httpPoll = this.providers.get('http-poll');
            if (httpPoll) {
                this.log.info({ symbols: otherSymbols }, 'Connecting HTTP poll for forex/metals');
                promises.push(httpPoll.connect(otherSymbols, (tick) => handleTick(tick)).catch(err => {
                    this.log.error({ err }, 'HTTP poll connection failed');
                }));
            }
        }
        await Promise.allSettled(promises);
    }
    subscribeSymbols(symbols) {
        const crypto = symbols.filter(s => getSymbolCategory(s) === 'crypto');
        const other = symbols.filter(s => getSymbolCategory(s) !== 'crypto');
        if (crypto.length > 0)
            this.providers.get('binance')?.subscribe(crypto);
        if (other.length > 0)
            this.providers.get('http-poll')?.subscribe(other);
    }
    unsubscribeSymbols(symbols) {
        const crypto = symbols.filter(s => getSymbolCategory(s) === 'crypto');
        const other = symbols.filter(s => getSymbolCategory(s) !== 'crypto');
        if (crypto.length > 0)
            this.providers.get('binance')?.unsubscribe(crypto);
        if (other.length > 0)
            this.providers.get('http-poll')?.unsubscribe(other);
    }
    async disconnectAll() {
        for (const [name, provider] of this.providers) {
            this.log.info(`Disconnecting provider: ${name}`);
            await provider.disconnect();
        }
    }
    getLastTick(symbol) {
        return this.lastTicks.get(symbol.toUpperCase());
    }
    getProviderStatus() {
        return Array.from(this.providers.entries()).map(([name, p]) => ({
            name,
            connected: p.isConnected(),
        }));
    }
}
//# sourceMappingURL=manager.js.map