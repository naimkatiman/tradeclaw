import type { GatewayConfig, TradingSignal } from '@tradeclaw/signals';
/**
 * Core gateway daemon.
 * Orchestrates scanning, signal generation, and channel delivery.
 */
export declare class Gateway {
    private config;
    private scheduler;
    private channels;
    private skillLoader;
    private latestSignals;
    private startTime;
    private initialized;
    constructor();
    start(configPath?: string): Promise<void>;
    scanOnce(configPath?: string): Promise<TradingSignal[]>;
    getLatestSignals(): TradingSignal[];
    getStatus(): {
        running: boolean;
        uptime: number;
        scanCount: number;
        config: GatewayConfig | null;
        channelCount: number;
        skillCount: number;
    };
    testChannels(): Promise<void>;
    stop(): void;
    private initChannels;
    private initSkills;
    private performScan;
    private deliverSignals;
    private setupShutdownHandlers;
}
//# sourceMappingURL=gateway.d.ts.map