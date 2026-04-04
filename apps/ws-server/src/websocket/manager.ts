import type { FastifyBaseLogger } from 'fastify';
import type { NormalizedTick } from '@tradeclaw/signals';
import { getSymbolCategory } from '@tradeclaw/signals';
import type { MarketDataProvider, TickCallback } from './provider.js';
import { BinanceProvider } from './providers/binance.js';
import { HttpPollProvider } from './providers/http-poll.js';
import type { RedisService } from '../services/redis.js';

export class ProviderManager {
  private providers: Map<string, MarketDataProvider> = new Map();
  private tickCallbacks: Set<TickCallback> = new Set();
  private lastTicks: Map<string, NormalizedTick> = new Map();
  private log: FastifyBaseLogger;
  private redis: RedisService;

  constructor(log: FastifyBaseLogger, redis: RedisService) {
    this.log = log;
    this.redis = redis;

    // Register providers
    this.providers.set('binance', new BinanceProvider());
    this.providers.set('http-poll', new HttpPollProvider());
  }

  onTick(callback: TickCallback): void {
    this.tickCallbacks.add(callback);
  }

  offTick(callback: TickCallback): void {
    this.tickCallbacks.delete(callback);
  }

  async connectForSymbols(symbols: string[]): Promise<void> {
    const cryptoSymbols = symbols.filter(s => getSymbolCategory(s) === 'crypto');
    const otherSymbols = symbols.filter(s => getSymbolCategory(s) !== 'crypto');

    const handleTick = (tick: NormalizedTick, fromRedis = false) => {
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

    const promises: Promise<void>[] = [];

    if (cryptoSymbols.length > 0) {
      const binance = this.providers.get('binance');
      if (binance) {
        this.log.info({ symbols: cryptoSymbols }, 'Connecting Binance WS for crypto');
        promises.push(
          binance.connect(cryptoSymbols, (tick) => handleTick(tick)).catch(err => {
            this.log.error({ err }, 'Binance WS connection failed, will retry');
          })
        );
      }
    }

    if (otherSymbols.length > 0) {
      const httpPoll = this.providers.get('http-poll');
      if (httpPoll) {
        this.log.info({ symbols: otherSymbols }, 'Connecting HTTP poll for forex/metals');
        promises.push(
          httpPoll.connect(otherSymbols, (tick) => handleTick(tick)).catch(err => {
            this.log.error({ err }, 'HTTP poll connection failed');
          })
        );
      }
    }

    await Promise.allSettled(promises);
  }

  subscribeSymbols(symbols: string[]): void {
    const crypto = symbols.filter(s => getSymbolCategory(s) === 'crypto');
    const other = symbols.filter(s => getSymbolCategory(s) !== 'crypto');

    if (crypto.length > 0) this.providers.get('binance')?.subscribe(crypto);
    if (other.length > 0) this.providers.get('http-poll')?.subscribe(other);
  }

  unsubscribeSymbols(symbols: string[]): void {
    const crypto = symbols.filter(s => getSymbolCategory(s) === 'crypto');
    const other = symbols.filter(s => getSymbolCategory(s) !== 'crypto');

    if (crypto.length > 0) this.providers.get('binance')?.unsubscribe(crypto);
    if (other.length > 0) this.providers.get('http-poll')?.unsubscribe(other);
  }

  async disconnectAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      this.log.info(`Disconnecting provider: ${name}`);
      await provider.disconnect();
    }
  }

  getLastTick(symbol: string): NormalizedTick | undefined {
    return this.lastTicks.get(symbol.toUpperCase());
  }

  getProviderStatus(): Array<{ name: string; connected: boolean }> {
    return Array.from(this.providers.entries()).map(([name, p]) => ({
      name,
      connected: p.isConnected(),
    }));
  }
}
