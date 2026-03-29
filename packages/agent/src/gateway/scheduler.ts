/**
 * Signal scan scheduler.
 * Manages the periodic scan loop with configurable intervals.
 */
export class Scheduler {
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private scanCount: number = 0;
  private onScan: () => Promise<void>;

  constructor(intervalSeconds: number, onScan: () => Promise<void>) {
    this.intervalMs = intervalSeconds * 1000;
    this.onScan = onScan;
  }

  async start(): Promise<void> {
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

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log(`[scheduler] Stopped after ${this.scanCount} scans`);
  }

  private async executeScan(): Promise<void> {
    this.scanCount++;
    const startTime = Date.now();

    try {
      await this.onScan();
      const duration = Date.now() - startTime;
      console.log(`[scheduler] Scan #${this.scanCount} completed in ${duration}ms`);
    } catch (error) {
      console.error(`[scheduler] Scan #${this.scanCount} failed:`, error);
    }
  }

  getScanCount(): number {
    return this.scanCount;
  }

  isRunning(): boolean {
    return this.running;
  }

  updateInterval(seconds: number): void {
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
