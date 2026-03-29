export { TradeclawClient } from './client.js';
export type { Signal, Direction, Timeframe, Period, LeaderboardSort, LeaderboardEntry, HealthStatus, SignalFilter, LeaderboardFilter, TradeclawClientOptions, } from './types.js';
import { TradeclawClient } from './client.js';
import type { TradeclawClientOptions } from './types.js';
/** Convenience factory — same as `new TradeclawClient(options)` */
export declare function createClient(options?: TradeclawClientOptions): TradeclawClient;
