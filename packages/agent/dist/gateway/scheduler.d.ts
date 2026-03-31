/**
 * Signal scan scheduler.
 * Manages the periodic scan loop with configurable intervals.
 */
export declare class Scheduler {
    private intervalMs;
    private timer;
    private running;
    private scanCount;
    private onScan;
    constructor(intervalSeconds: number, onScan: () => Promise<void>);
    start(): Promise<void>;
    stop(): void;
    private executeScan;
    getScanCount(): number;
    isRunning(): boolean;
    updateInterval(seconds: number): void;
}
//# sourceMappingURL=scheduler.d.ts.map