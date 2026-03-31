import type { BaseChannel } from '../channels/base.js';
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