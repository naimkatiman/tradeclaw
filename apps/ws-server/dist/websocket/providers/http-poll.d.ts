import type { MarketDataProvider, TickCallback } from '../provider.js';
export declare class HttpPollProvider implements MarketDataProvider {
    readonly name = "http-poll";
    private symbols;
    private onTick;
    private pollTimer;
    private connected;
    private lastPrices;
    private pollIntervalMs;
    constructor(pollIntervalMs?: number);
    connect(symbols: string[], onTick: TickCallback): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(symbols: string[]): void;
    unsubscribe(symbols: string[]): void;
    isConnected(): boolean;
    private poll;
    private fetchMetals;
    private fetchForex;
    private emitIfChanged;
}
