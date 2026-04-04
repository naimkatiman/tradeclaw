import type { MarketDataProvider, TickCallback } from '../provider.js';
export declare class BinanceProvider implements MarketDataProvider {
    readonly name = "binance";
    private ws;
    private onTick;
    private symbols;
    private pingTimer;
    private pongTimer;
    private reconnectTimer;
    private refreshTimer;
    private reconnectAttempts;
    private connected;
    private intentionalClose;
    private connectTime;
    connect(symbols: string[], onTick: TickCallback): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(symbols: string[]): void;
    unsubscribe(symbols: string[]): void;
    isConnected(): boolean;
    private openConnection;
    private handleMessage;
    private startPingPong;
    private scheduleRefresh;
    private scheduleReconnect;
    private clearTimers;
}
