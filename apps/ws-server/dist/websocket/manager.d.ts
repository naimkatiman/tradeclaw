import type { FastifyBaseLogger } from 'fastify';
import type { NormalizedTick } from '@tradeclaw/signals';
import type { TickCallback } from './provider.js';
import type { RedisService } from '../services/redis.js';
export declare class ProviderManager {
    private providers;
    private tickCallbacks;
    private lastTicks;
    private log;
    private redis;
    constructor(log: FastifyBaseLogger, redis: RedisService);
    onTick(callback: TickCallback): void;
    offTick(callback: TickCallback): void;
    connectForSymbols(symbols: string[]): Promise<void>;
    subscribeSymbols(symbols: string[]): void;
    unsubscribeSymbols(symbols: string[]): void;
    disconnectAll(): Promise<void>;
    getLastTick(symbol: string): NormalizedTick | undefined;
    getProviderStatus(): Array<{
        name: string;
        connected: boolean;
    }>;
}
