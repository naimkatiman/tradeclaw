import { Redis } from 'ioredis';
const TICK_CHANNEL_PREFIX = 'tc:tick:';
export class RedisService {
    pub = null;
    sub = null;
    connected = false;
    tickHandlers = new Set();
    constructor(url) {
        if (!url)
            return;
        try {
            this.pub = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
            this.sub = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
            this.pub.on('connect', () => { this.connected = true; });
            this.pub.on('error', () => { this.connected = false; });
            this.sub.on('error', () => { });
            // Connect
            this.pub.connect().catch(() => { });
            this.sub.connect().then(() => {
                this.sub.on('pmessage', (_pattern, _channel, message) => {
                    try {
                        const tick = JSON.parse(message);
                        for (const handler of this.tickHandlers) {
                            handler(tick);
                        }
                    }
                    catch {
                        // Ignore malformed messages
                    }
                });
                this.sub.psubscribe(`${TICK_CHANNEL_PREFIX}*`).catch(() => { });
            }).catch(() => { });
        }
        catch {
            // Redis is optional
        }
    }
    async publishTick(tick) {
        if (!this.pub || !this.connected)
            return;
        const channel = `${TICK_CHANNEL_PREFIX}${tick.symbol}`;
        await this.pub.publish(channel, JSON.stringify(tick));
    }
    onTick(handler) {
        this.tickHandlers.add(handler);
    }
    offTick(handler) {
        this.tickHandlers.delete(handler);
    }
    isConnected() {
        return this.connected;
    }
    disconnect() {
        this.pub?.disconnect();
        this.sub?.disconnect();
        this.connected = false;
    }
}
//# sourceMappingURL=redis.js.map