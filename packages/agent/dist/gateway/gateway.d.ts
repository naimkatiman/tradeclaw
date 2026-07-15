import { SIGNAL_SCAN_AVAILABILITY } from '../signals/engine.js';
import type { GatewayConfig, TradingSignal } from '@tradeclaw/signals';
/**
 * Core gateway daemon.
 * Orchestrates availability checks and future observed-candidate delivery.
 */
export declare class Gateway {
    private config;
    private scheduler;
    private channels;
    private latestSignals;
    private startTime;
    private initialized;
    private channelWarned;
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
        available: false;
        dataQuality: 'unavailable';
        reason: typeof SIGNAL_SCAN_AVAILABILITY.reason;
    };
    testChannels(): Promise<void>;
    stop(): void;
    private initChannels;
    private performScan;
    private deliverSignals;
    private setupShutdownHandlers;
}
//# sourceMappingURL=gateway.d.ts.map