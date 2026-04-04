import type { NormalizedTick } from '@tradeclaw/signals';
export type TickCallback = (tick: NormalizedTick) => void;
export interface MarketDataProvider {
    readonly name: string;
    connect(symbols: string[], onTick: TickCallback): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(symbols: string[]): void;
    unsubscribe(symbols: string[]): void;
    isConnected(): boolean;
}
