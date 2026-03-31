import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import type { BaseChannel } from './base.js';
/**
 * Generic HTTP webhook channel adapter.
 */
export declare class WebhookChannel implements BaseChannel {
    readonly type = "webhook";
    readonly enabled: boolean;
    private webhookUrl;
    constructor(config: ChannelConfig);
    validate(): string | null;
    sendSignal(signal: TradingSignal): Promise<boolean>;
    sendMessage(text: string): Promise<boolean>;
    private post;
}
//# sourceMappingURL=webhook.d.ts.map