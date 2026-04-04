import { Redis } from 'ioredis';
import type { NormalizedTick } from '@tradeclaw/signals';

const TICK_CHANNEL_PREFIX = 'tc:tick:';

type TickHandler = (tick: NormalizedTick) => void;

export class RedisService {
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private pubConnected = false;
  private subConnected = false;
  private tickHandlers: Set<TickHandler> = new Set();

  constructor(url?: string) {
    if (!url) return;

    try {
      this.pub = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.sub = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });

      this.pub.on('ready', () => { this.pubConnected = true; });
      this.pub.on('close', () => { this.pubConnected = false; });
      this.pub.on('error', () => {});

      this.sub.on('ready', () => { this.subConnected = true; });
      this.sub.on('close', () => { this.subConnected = false; });
      this.sub.on('error', () => {});

      // Connect
      this.pub.connect().catch(() => {});
      this.sub.connect().then(() => {
        this.sub!.on('pmessage', (_pattern: string, _channel: string, message: string) => {
          try {
            const tick = JSON.parse(message) as NormalizedTick;
            for (const handler of this.tickHandlers) {
              handler(tick);
            }
          } catch {
            // Ignore malformed messages
          }
        });
        this.sub!.psubscribe(`${TICK_CHANNEL_PREFIX}*`).catch(() => {});
      }).catch(() => {});
    } catch {
      // Redis is optional
    }
  }

  async publishTick(tick: NormalizedTick): Promise<void> {
    if (!this.pub || !this.pubConnected) return;
    const channel = `${TICK_CHANNEL_PREFIX}${tick.symbol}`;
    await this.pub.publish(channel, JSON.stringify(tick));
  }

  onTick(handler: TickHandler): void {
    this.tickHandlers.add(handler);
  }

  offTick(handler: TickHandler): void {
    this.tickHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.pubConnected && this.subConnected;
  }

  disconnect(): void {
    this.pub?.disconnect();
    this.sub?.disconnect();
    this.pubConnected = false;
    this.subConnected = false;
  }
}
