/**
 * Signal scan scheduler.
 * Manages the periodic scan loop with configurable intervals.
 */
export class Scheduler {
    intervalMs;
    timer = null;
    running = false;
    scanCount = 0;
    onScan;
    constructor(intervalSeconds, onScan) {
        this.intervalMs = intervalSeconds * 1000;
        this.onScan = onScan;
    }
    async start() {
        if (this.running) {
            console.warn('[scheduler] Already running');
            return;
        }
        this.running = true;
        console.log(`[scheduler] Starting scan loop (every ${this.intervalMs / 1000}s)`);
        await this.executeScan();
        this.timer = setInterval(async () => {
            if (this.running) {
                await this.executeScan();
            }
        }, this.intervalMs);
    }
    stop() {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log(`[scheduler] Stopped after ${this.scanCount} scans`);
    }
    async executeScan() {
        this.scanCount++;
        const startTime = Date.now();
        try {
            await this.onScan();
            const duration = Date.now() - startTime;
            console.log(`[scheduler] Scan #${this.scanCount} completed in ${duration}ms`);
        }
        catch (error) {
            console.error(`[scheduler] Scan #${this.scanCount} failed:`, error);
        }
    }
    getScanCount() {
        return this.scanCount;
    }
    isRunning() {
        return this.running;
    }
    updateInterval(seconds) {
        this.intervalMs = seconds * 1000;
        if (this.running && this.timer) {
            clearInterval(this.timer);
            this.timer = setInterval(async () => {
                if (this.running) {
                    await this.executeScan();
                }
            }, this.intervalMs);
        }
        console.log(`[scheduler] Interval updated to ${seconds}s`);
    }
}
//# sourceMappingURL=scheduler.js.map