import type { Signal, LeaderboardEntry, HealthStatus, SignalFilter, LeaderboardFilter, TradeclawClientOptions } from './types.js';
export declare class TradeclawClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    constructor(options?: TradeclawClientOptions);
    private request;
    /**
     * Fetch live trading signals.
     * @example
     * const signals = await client.signals({ pair: 'BTCUSD', limit: 10 });
     */
    signals(filter?: SignalFilter): Promise<Signal[]>;
    /**
     * Fetch the signal accuracy leaderboard.
     * @example
     * const board = await client.leaderboard({ period: '30d', sort: 'hitRate' });
     */
    leaderboard(filter?: LeaderboardFilter): Promise<LeaderboardEntry[]>;
    /**
     * Check the health of a TradeClaw instance.
     * @example
     * const health = await client.health();
     */
    health(): Promise<HealthStatus>;
    /**
     * Get a shields.io-compatible badge JSON for a given pair.
     * @example
     * const badge = await client.badge('BTCUSD');
     */
    badge(pair: string): Promise<{
        schemaVersion: number;
        label: string;
        message: string;
        color: string;
    }>;
}
