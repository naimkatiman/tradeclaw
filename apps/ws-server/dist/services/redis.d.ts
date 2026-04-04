import type { NormalizedTick } from '@tradeclaw/signals';
type TickHandler = (tick: NormalizedTick) => void;
export declare class RedisService {
    private pub;
    private sub;
    private connected;
    private tickHandlers;
    constructor(url?: string);
    publishTick(tick: NormalizedTick): Promise<void>;
    onTick(handler: TickHandler): void;
    offTick(handler: TickHandler): void;
    isConnected(): boolean;
    disconnect(): void;
}
export {};
