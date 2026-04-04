import type { NormalizedTick } from '@tradeclaw/signals';
export declare class DatabaseService {
    private pool;
    private buffer;
    private flushTimer;
    constructor(databaseUrl?: string);
    ensureTable(): Promise<void>;
    addTick(tick: NormalizedTick): void;
    private flush;
    disconnect(): Promise<void>;
}
