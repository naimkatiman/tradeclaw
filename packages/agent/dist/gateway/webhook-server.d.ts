import type { BaseChannel } from '../channels/base.js';
import type { TradingSignal } from '@tradeclaw/signals';
export interface TradingViewAlert {
    symbol?: string;
    action?: string;
    price?: number;
    volume?: number;
    message?: string;
    timeframe?: string;
    exchange?: string;
    id?: string;
    stopLoss?: number;
    sl?: number;
    takeProfit1?: number;
    tp1?: number;
    takeProfit2?: number | null;
    tp2?: number | null;
    takeProfit3?: number | null;
    tp3?: number | null;
    confidence?: number;
    timestamp?: string;
    source?: string;
    dataQuality?: string;
    indicators?: unknown;
    [key: string]: unknown;
}
export declare function alertToSignal(alert: TradingViewAlert): TradingSignal | null;
export declare class WebhookServer {
    private server;
    private channels;
    private port;
    private secret?;
    private receivedCount;
    constructor(channels: BaseChannel[], port?: number, secret?: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    getPort(): number;
}
//# sourceMappingURL=webhook-server.d.ts.map